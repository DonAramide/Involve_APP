/*
=============================================================================
Migration: agent_fee_stakeholder_isolation
Description: Additive per-agent fee stakeholder mapping and atomic
             withdrawal reservation. Does not enable live fees or payouts.
             Does not alter POS_WITHDRAWAL tariff or fee calculator.

Rollback: supabase/rollbacks/20260928010000_agent_fee_stakeholder_isolation.sql
=============================================================================
*/

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.fee_stakeholders') IS NULL
     OR to_regclass('public.fee_stakeholder_payables') IS NULL
     OR to_regclass('public.fee_withdrawal_requests') IS NULL THEN
    RAISE EXCEPTION 'agent fee isolation preflight failed: fee distribution tables missing';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.agent_fee_stakeholders (
  agent_id UUID PRIMARY KEY REFERENCES public.agents(id) ON DELETE RESTRICT,
  stakeholder_id UUID NOT NULL UNIQUE REFERENCES public.fee_stakeholders(id) ON DELETE RESTRICT,
  agent_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_fee_stakeholders_code_idx
  ON public.agent_fee_stakeholders (agent_code);

ALTER TABLE public.agent_fee_stakeholders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS no_client_write_agent_fee_stakeholders ON public.agent_fee_stakeholders;
CREATE POLICY no_client_write_agent_fee_stakeholders
  ON public.agent_fee_stakeholders AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS super_admin_reads_agent_fee_stakeholders ON public.agent_fee_stakeholders;
CREATE POLICY super_admin_reads_agent_fee_stakeholders
  ON public.agent_fee_stakeholders AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

DROP POLICY IF EXISTS agent_reads_own_fee_stakeholder ON public.agent_fee_stakeholders;
CREATE POLICY agent_reads_own_fee_stakeholder
  ON public.agent_fee_stakeholders AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.agents a
      WHERE a.id = agent_fee_stakeholders.agent_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- Evidence-based mapping: one individual AGENT stakeholder per agent that owns tenants.
INSERT INTO public.fee_stakeholders (stakeholder_type, display_name, status, metadata)
SELECT
  'AGENT'::public.fee_stakeholder_type,
  'Agent ' || a.agent_code,
  'ACTIVE'::public.fee_stakeholder_status,
  jsonb_build_object(
    'system', false,
    'agent_id', a.id,
    'agent_code', a.agent_code,
    'nature', 'INDIVIDUAL_AGENT_PAYABLE'
  )
FROM public.agents a
WHERE a.agent_code IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.agent_fee_stakeholders m WHERE m.agent_id = a.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.fee_stakeholders s
    WHERE s.stakeholder_type = 'AGENT'
      AND (s.metadata->>'agent_id') = a.id::text
      AND COALESCE(s.metadata->>'system', 'false') <> 'true'
  );

INSERT INTO public.agent_fee_stakeholders (agent_id, stakeholder_id, agent_code)
SELECT a.id, s.id, a.agent_code
FROM public.agents a
JOIN public.fee_stakeholders s
  ON s.stakeholder_type = 'AGENT'
 AND (s.metadata->>'agent_id') = a.id::text
 AND COALESCE(s.metadata->>'system', 'false') <> 'true'
ON CONFLICT (agent_id) DO NOTHING;

-- Re-point AGENT_FEE payables only when tenant.agent_code maps to an agent.
UPDATE public.fee_stakeholder_payables p
SET stakeholder_id = m.stakeholder_id
FROM public.fee_assessments fa
JOIN public.tenants t ON t.id = fa.tenant_id
JOIN public.agents a ON a.agent_code = t.agent_code
JOIN public.agent_fee_stakeholders m ON m.agent_id = a.id
WHERE p.assessment_id = fa.id
  AND p.component = 'AGENT_FEE'
  AND t.agent_code IS NOT NULL
  AND p.stakeholder_id IS DISTINCT FROM m.stakeholder_id;

CREATE OR REPLACE FUNCTION public.fee_reserve_withdrawal(
  p_stakeholder_id UUID,
  p_amount_kobo BIGINT,
  p_client_request_id TEXT,
  p_requested_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.fee_withdrawal_requests%ROWTYPE;
  v_status public.fee_stakeholder_status;
  v_available BIGINT;
  v_reserved BIGINT;
  v_id UUID;
BEGIN
  IF p_client_request_id IS NULL OR btrim(p_client_request_id) = '' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_amount_kobo IS NULL OR p_amount_kobo <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    abs(('x' || substr(md5(p_stakeholder_id::text), 1, 16))::bit(64)::bigint)
  );

  SELECT * INTO v_existing
  FROM public.fee_withdrawal_requests
  WHERE stakeholder_id = p_stakeholder_id
    AND client_request_id = p_client_request_id;
  IF FOUND THEN
    RETURN jsonb_build_object('replayed', true, 'withdrawal_id', v_existing.id, 'status', v_existing.status);
  END IF;

  SELECT status INTO v_status FROM public.fee_stakeholders WHERE id = p_stakeholder_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'STAKEHOLDER_NOT_ACTIVE' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(SUM(amount_kobo), 0) INTO v_available
  FROM public.fee_stakeholder_payables
  WHERE stakeholder_id = p_stakeholder_id
    AND status = 'AVAILABLE';

  SELECT COALESCE(SUM(amount_kobo), 0) INTO v_reserved
  FROM public.fee_withdrawal_requests
  WHERE stakeholder_id = p_stakeholder_id
    AND status IN ('REQUESTED', 'APPROVED', 'PROCESSING');

  v_available := v_available - v_reserved;
  IF v_available < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_AVAILABLE' USING ERRCODE = '22023';
  END IF;
  IF p_amount_kobo > v_available THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.fee_withdrawal_requests (
    stakeholder_id,
    amount_kobo,
    status,
    client_request_id,
    available_balance_kobo_at_request,
    requested_by,
    metadata
  ) VALUES (
    p_stakeholder_id,
    p_amount_kobo,
    'REQUESTED',
    p_client_request_id,
    v_available,
    p_requested_by,
    jsonb_build_object(
      'control_plane_only', true,
      'payout_execution_enabled', false,
      'reservation', 'advisory_lock_available_minus_open_withdrawals'
    )
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('replayed', false, 'withdrawal_id', v_id, 'status', 'REQUESTED', 'available_kobo', v_available);
END;
$$;

REVOKE ALL ON FUNCTION public.fee_reserve_withdrawal(UUID, BIGINT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fee_reserve_withdrawal(UUID, BIGINT, TEXT, UUID) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.agent_fee_stakeholders TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT ON public.agent_fee_stakeholders TO authenticated';
  END IF;
END $$;

COMMIT;

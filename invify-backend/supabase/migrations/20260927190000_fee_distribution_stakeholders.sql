/*
=============================================================================
Migration: fee_distribution_stakeholders
Description: Additive stakeholder, payable, withdrawal-request, and settlement
             control-plane tables for platform fee distribution. No live payout,
             no USER_WALLET debit, no fee ledger posting.

Rollback: supabase/rollbacks/20260927190000_fee_distribution_stakeholders.sql
=============================================================================
*/

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.fee_assessments') IS NULL OR to_regclass('public.fee_assessment_lines') IS NULL THEN
    RAISE EXCEPTION 'fee distribution preflight failed: fee_assessments / fee_assessment_lines missing';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_stakeholder_type AS ENUM ('PLATFORM', 'PROCESSOR', 'SERVICE', 'AGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_stakeholder_status AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_payable_status AS ENUM ('PENDING', 'AVAILABLE', 'SETTLED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_settlement_status AS ENUM (
    'REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_withdrawal_status AS ENUM (
    'REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.fee_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_type public.fee_stakeholder_type NOT NULL,
  display_name TEXT NOT NULL,
  status public.fee_stakeholder_status NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS fee_stakeholders_system_type_unique
  ON public.fee_stakeholders (stakeholder_type)
  WHERE (metadata->>'system') = 'true';

CREATE TABLE IF NOT EXISTS public.fee_stakeholder_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES public.fee_stakeholders(id) ON DELETE RESTRICT,
  assessment_id UUID NOT NULL REFERENCES public.fee_assessments(id) ON DELETE RESTRICT,
  assessment_line_id UUID NOT NULL REFERENCES public.fee_assessment_lines(id) ON DELETE RESTRICT,
  component public.fee_component NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  status public.fee_payable_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  settlement_id UUID,
  CONSTRAINT fee_stakeholder_payables_line_unique UNIQUE (assessment_line_id)
);

CREATE TABLE IF NOT EXISTS public.fee_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES public.fee_stakeholders(id) ON DELETE RESTRICT,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  status public.fee_settlement_status NOT NULL DEFAULT 'REQUESTED',
  settlement_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fee_settlements_control_plane_only_chk CHECK (
    status <> 'COMPLETED'::public.fee_settlement_status
  )
);

CREATE TABLE IF NOT EXISTS public.fee_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES public.fee_stakeholders(id) ON DELETE RESTRICT,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  status public.fee_withdrawal_status NOT NULL DEFAULT 'REQUESTED',
  client_request_id TEXT NOT NULL,
  available_balance_kobo_at_request BIGINT NOT NULL DEFAULT 0 CHECK (available_balance_kobo_at_request >= 0),
  settlement_id UUID REFERENCES public.fee_settlements(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fee_withdrawal_requests_stakeholder_client_unique UNIQUE (stakeholder_id, client_request_id),
  CONSTRAINT fee_withdrawal_requests_no_real_complete_chk CHECK (
    status <> 'COMPLETED'::public.fee_withdrawal_status
  )
);

ALTER TABLE public.fee_stakeholder_payables
  DROP CONSTRAINT IF EXISTS fee_stakeholder_payables_settlement_id_fkey;
ALTER TABLE public.fee_stakeholder_payables
  ADD CONSTRAINT fee_stakeholder_payables_settlement_id_fkey
  FOREIGN KEY (settlement_id) REFERENCES public.fee_settlements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fee_stakeholder_payables_stakeholder_status_idx
  ON public.fee_stakeholder_payables (stakeholder_id, status);
CREATE INDEX IF NOT EXISTS fee_stakeholder_payables_assessment_idx
  ON public.fee_stakeholder_payables (assessment_id);
CREATE INDEX IF NOT EXISTS fee_withdrawal_requests_stakeholder_idx
  ON public.fee_withdrawal_requests (stakeholder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fee_settlements_stakeholder_idx
  ON public.fee_settlements (stakeholder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.fee_distribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  stakeholder_id UUID REFERENCES public.fee_stakeholders(id) ON DELETE SET NULL,
  withdrawal_id UUID REFERENCES public.fee_withdrawal_requests(id) ON DELETE SET NULL,
  settlement_id UUID REFERENCES public.fee_settlements(id) ON DELETE SET NULL,
  actor_id UUID,
  actor_email TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.fee_stakeholders (stakeholder_type, display_name, status, metadata)
VALUES
  ('PLATFORM', 'Invify Platform', 'ACTIVE', '{"system": true, "nature": "PLATFORM_REVENUE"}'::jsonb),
  ('PROCESSOR', 'Processor Payable', 'ACTIVE', '{"system": true, "nature": "PROCESSOR_PAYABLE"}'::jsonb),
  ('SERVICE', 'Service Provider', 'ACTIVE', '{"system": true, "nature": "SERVICE_COST"}'::jsonb),
  ('AGENT', 'Agent / Partner', 'ACTIVE', '{"system": true, "nature": "AGENT_PAYABLE"}'::jsonb)
ON CONFLICT (stakeholder_type) WHERE (metadata->>'system') = 'true' DO NOTHING;

ALTER TABLE public.fee_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_stakeholder_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_distribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_client_write_fee_stakeholders
  ON public.fee_stakeholders AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_stakeholders
  ON public.fee_stakeholders AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_fee_stakeholder_payables
  ON public.fee_stakeholder_payables AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_stakeholder_payables
  ON public.fee_stakeholder_payables AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_fee_settlements
  ON public.fee_settlements AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_settlements
  ON public.fee_settlements AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_fee_withdrawal_requests
  ON public.fee_withdrawal_requests AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_withdrawal_requests
  ON public.fee_withdrawal_requests AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_fee_distribution_events
  ON public.fee_distribution_events AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_distribution_events
  ON public.fee_distribution_events AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.fee_stakeholders TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.fee_stakeholder_payables TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.fee_settlements TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.fee_withdrawal_requests TO service_role';
    EXECUTE 'GRANT SELECT, INSERT ON public.fee_distribution_events TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT ON public.fee_stakeholders TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_stakeholder_payables TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_settlements TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_withdrawal_requests TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_distribution_events TO authenticated';
  END IF;
END $$;

COMMIT;

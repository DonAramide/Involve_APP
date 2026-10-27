/*
=============================================================================
Migration: agent_scoped_fee_management
Description: Agent-scoped fee profiles (reusing fee_profile_versions),
             immutable assessment agent attribution, payable agent_id.
             Does not enable live fees or payouts. Does not alter
             tenant_fee_profiles / school billing / POS published tariff rows.

Rollback: supabase/rollbacks/20260928030000_agent_scoped_fee_management.sql
=============================================================================
*/

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.fee_profiles') IS NULL
     OR to_regclass('public.fee_profile_versions') IS NULL
     OR to_regclass('public.agents') IS NULL
     OR to_regclass('public.fee_assessments') IS NULL THEN
    RAISE EXCEPTION 'agent scoped fee preflight failed: core tables missing';
  END IF;
END $$;

ALTER TABLE public.fee_profiles
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE public.fee_profiles
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE RESTRICT;

UPDATE public.fee_profiles
SET scope = 'GLOBAL'
WHERE scope IS NULL OR scope = '';

ALTER TABLE public.fee_profiles
  DROP CONSTRAINT IF EXISTS fee_profiles_scope_chk;
ALTER TABLE public.fee_profiles
  ADD CONSTRAINT fee_profiles_scope_chk CHECK (scope IN ('GLOBAL', 'AGENT'));

ALTER TABLE public.fee_profiles
  DROP CONSTRAINT IF EXISTS fee_profiles_agent_scope_chk;
ALTER TABLE public.fee_profiles
  ADD CONSTRAINT fee_profiles_agent_scope_chk CHECK (
    (scope = 'GLOBAL' AND agent_id IS NULL)
    OR (scope = 'AGENT' AND agent_id IS NOT NULL)
  );

ALTER TABLE public.fee_profiles
  DROP CONSTRAINT IF EXISTS fee_profiles_transaction_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS fee_profiles_global_type_uidx
  ON public.fee_profiles (transaction_type)
  WHERE scope = 'GLOBAL';

CREATE UNIQUE INDEX IF NOT EXISTS fee_profiles_agent_type_uidx
  ON public.fee_profiles (agent_id, transaction_type)
  WHERE scope = 'AGENT';

CREATE TABLE IF NOT EXISTS public.agent_fee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  transaction_type public.fee_transaction_type NOT NULL,
  fee_profile_id UUID NOT NULL UNIQUE REFERENCES public.fee_profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_fee_profiles_agent_type_key UNIQUE (agent_id, transaction_type)
);

CREATE INDEX IF NOT EXISTS agent_fee_profiles_agent_idx
  ON public.agent_fee_profiles (agent_id, transaction_type);

ALTER TABLE public.fee_assessments
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE RESTRICT;
ALTER TABLE public.fee_assessments
  ADD COLUMN IF NOT EXISTS fee_profile_id UUID REFERENCES public.fee_profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.fee_assessments
  ADD COLUMN IF NOT EXISTS resolved_source TEXT;

ALTER TABLE public.fee_assessments
  DROP CONSTRAINT IF EXISTS fee_assessments_resolved_source_chk;
ALTER TABLE public.fee_assessments
  ADD CONSTRAINT fee_assessments_resolved_source_chk CHECK (
    resolved_source IS NULL
    OR resolved_source IN ('AGENT_PROFILE', 'GLOBAL_FALLBACK')
  );

CREATE INDEX IF NOT EXISTS fee_assessments_agent_created_idx
  ON public.fee_assessments (agent_id, created_at DESC);

ALTER TABLE public.fee_stakeholder_payables
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS fee_stakeholder_payables_agent_idx
  ON public.fee_stakeholder_payables (agent_id, created_at DESC);

ALTER TABLE public.agent_fee_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS no_client_write_agent_fee_profiles ON public.agent_fee_profiles;
CREATE POLICY no_client_write_agent_fee_profiles
  ON public.agent_fee_profiles AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS staff_reads_agent_fee_profiles ON public.agent_fee_profiles;
CREATE POLICY staff_reads_agent_fee_profiles
  ON public.agent_fee_profiles AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.agent_fee_profiles TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.fee_profiles TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.fee_assessments TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.fee_stakeholder_payables TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT ON public.agent_fee_profiles TO authenticated';
  END IF;
END $$;

COMMIT;

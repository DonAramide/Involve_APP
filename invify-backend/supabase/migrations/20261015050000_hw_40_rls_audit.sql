-- PROPOSED — NOT APPLIED. Phase 1 design artefact.
-- hw_40_rls_audit: append-only audit trail and defense-in-depth Row Level Security (RLS) policies.
-- Additive only.
-- Enforces:
--  - Immutable, append-only health audit trail with zero update/delete permissions
--  - RLS on every tenant-owned table to enforce isolation even if accessed via client Supabase credentials
--  - Strict tenant ID casting and matching against authenticated JWT claims

BEGIN;

-- ---------------------------------------------------------------- audit trail
CREATE TABLE IF NOT EXISTS public.hw_audit_events (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  actor_user_id            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role               text,
  action                   text NOT NULL,                                     -- e.g., 'enrolment.created', 'guardian.verified', 'report.exported'
  resource_type            text NOT NULL,                                     -- e.g., 'hw_enrolments', 'hw_guardian_links'
  resource_id              text NOT NULL,
  changes                  jsonb NOT NULL DEFAULT '{}'::jsonb,                -- Redacted diff; never contains health diagnostic notes
  ip_address               text,
  user_agent               text,
  via_platform_access      boolean NOT NULL DEFAULT false,
  platform_reason          text,
  occurred_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_hw_audit_tenant_time ON public.hw_audit_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_hw_audit_resource ON public.hw_audit_events (resource_type, resource_id);

-- Enforce append-only on audit log (updates and deletes strictly rejected)
DROP TRIGGER IF EXISTS trg_hw_audit_immutable ON public.hw_audit_events;
CREATE TRIGGER trg_hw_audit_immutable BEFORE UPDATE OR DELETE ON public.hw_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.hw_block_mutation();

-- ---------------------------------------------------------------- Row Level Security (RLS)
-- Enable RLS across all new tables
ALTER TABLE public.hw_tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_platform_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_tenant_plan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_guardian_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_guardian_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_dependants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_claim_status_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_premium_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_audit_events ENABLE ROW LEVEL SECURITY;

-- Helper RLS predicate function
CREATE OR REPLACE FUNCTION public.hw_current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenantId',
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
      current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId',
      current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'
    ),
    ''
  )::uuid;
$$;

-- Standard tenant isolation policy macro
-- Applies to: tenant_settings, staff_profiles, members, dependants, enrolments, policies, claim records, invoices, payments, allocations, audit
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'hw_tenant_settings',
    'hw_staff_profiles',
    'hw_members',
    'hw_dependants',
    'hw_enrolments',
    'hw_policies',
    'hw_claim_status_records',
    'hw_premium_invoices',
    'hw_payments',
    'hw_payment_allocations',
    'hw_audit_events'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON public.%I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation_select ON public.%I FOR SELECT USING (tenant_id = public.hw_current_tenant_id())', tbl);

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_all ON public.%I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation_all ON public.%I FOR ALL USING (tenant_id = public.hw_current_tenant_id()) WITH CHECK (tenant_id = public.hw_current_tenant_id())', tbl);
  END LOOP;
END $$;

-- Guardian-specific policy for hw_guardian_links:
-- Guardians can only view links assigned to their authenticated auth.uid()
DROP POLICY IF EXISTS guardian_self_select ON public.hw_guardian_links;
CREATE POLICY guardian_self_select ON public.hw_guardian_links FOR SELECT
  USING (
    tenant_id = public.hw_current_tenant_id() 
    OR guardian_user_id = auth.uid()
  );

-- Staff personal view policy for self-service
DROP POLICY IF EXISTS staff_self_select ON public.hw_staff_profiles;
CREATE POLICY staff_self_select ON public.hw_staff_profiles FOR SELECT
  USING (
    tenant_id = public.hw_current_tenant_id()
    OR user_id = auth.uid()
  );

COMMIT;

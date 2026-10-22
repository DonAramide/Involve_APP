-- ==============================================================================
-- PROPOSED — NOT APPLIED. Phase 1 HMO Institution Portal & Excel/CSV Exchange.
-- File: 20261022000000_hw_60_hmo_institution_portal.sql
-- Description:
--   Additive schema for the HMO-Aware Institution Portal:
--   1. Links public.hw_providers to public.institutions (institution_id, metadata)
--   2. HMO Institution User Memberships & Granular RBAC Roles (hw_hmo_user_memberships)
--   3. School / Employer HMO Onboarding & Plan Association (hw_hmo_school_links)
--   4. Configurable HMO CSV/Excel Export Mappings (hw_export_mappings)
--   5. 11-Stage Enrollment Batch Lifecycle & Items (hw_enrolment_batches, hw_enrolment_batch_items)
--   6. Processed HMO Response File Import Jobs & Row Reconciliation Results (hw_import_jobs, hw_import_row_results)
--   7. HMO Operational Tasks & Alerts (hw_hmo_tasks)
--   8. Row Level Security (RLS) & Append-Only Audit Protections
--   9. Idempotent MHMO Institution + Service + HMO Provider Seed
-- ==============================================================================

BEGIN;

DO $$ BEGIN
  IF to_regclass('public.institutions') IS NULL THEN
    RAISE EXCEPTION 'hw_60: prerequisite table public.institutions is missing (apply 20261020000000_institution_registry_and_routing_policy.sql first)';
  END IF;
  IF to_regclass('public.hw_providers') IS NULL THEN
    RAISE EXCEPTION 'hw_60: prerequisite table public.hw_providers is missing (apply hw_00_foundation.sql first)';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. EXTEND hw_providers WITH OPTIONAL INSTITUTION REGISTRY LINK & PROFILE FIELDS
-- ------------------------------------------------------------------------------
ALTER TABLE public.hw_providers
  ADD COLUMN IF NOT EXISTS institution_id     UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legal_name         TEXT,
  ADD COLUMN IF NOT EXISTS regulator_type     TEXT DEFAULT 'NHIA' CHECK (regulator_type IN ('NHIA', 'NAICOM', 'STATE_HMO', 'OTHER')),
  ADD COLUMN IF NOT EXISTS licence_expiry     DATE,
  ADD COLUMN IF NOT EXISTS contact_email      TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone      TEXT,
  ADD COLUMN IF NOT EXISTS support_email      TEXT,
  ADD COLUMN IF NOT EXISTS claims_email       TEXT,
  ADD COLUMN IF NOT EXISTS head_office_address TEXT,
  ADD COLUMN IF NOT EXISTS state              TEXT,
  ADD COLUMN IF NOT EXISTS lga                TEXT,
  ADD COLUMN IF NOT EXISTS website_url        TEXT,
  ADD COLUMN IF NOT EXISTS logo_url           TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_providers_institution_id
  ON public.hw_providers (institution_id)
  WHERE institution_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. HMO USER MEMBERSHIPS & GRANULAR RBAC ROLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hw_hmo_user_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  agent_id          UUID, -- Optional link to public.agents.id for Institute Portal logins
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  hmo_role          TEXT NOT NULL DEFAULT 'HMO_ADMIN' CHECK (hmo_role IN (
    'HMO_ADMIN',
    'ENROLLMENT_OFFICER',
    'PROVIDER_NETWORK_MANAGER',
    'CLAIMS_OFFICER',
    'AUTHORIZATION_OFFICER',
    'FINANCE_OFFICER',
    'AUDITOR'
  )),
  permissions       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
  invited_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_active_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, email)
);

CREATE INDEX IF NOT EXISTS ix_hw_hmo_memberships_user
  ON public.hw_hmo_user_memberships (user_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS ix_hw_hmo_memberships_agent
  ON public.hw_hmo_user_memberships (agent_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS ix_hw_hmo_memberships_provider
  ON public.hw_hmo_user_memberships (provider_id, status);

DROP TRIGGER IF EXISTS trg_hw_hmo_memberships_upd ON public.hw_hmo_user_memberships;
CREATE TRIGGER trg_hw_hmo_memberships_upd
  BEFORE UPDATE ON public.hw_hmo_user_memberships
  FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. SCHOOL / EMPLOYER HMO NETWORK & ONBOARDING LINKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hw_hmo_school_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  institution_id        UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  tenant_type           TEXT NOT NULL DEFAULT 'school' CHECK (tenant_type IN ('school', 'employer', 'organization')),
  onboarding_status     TEXT NOT NULL DEFAULT 'pending_approval' CHECK (onboarding_status IN (
    'pending_approval',
    'active',
    'suspended',
    'rejected',
    'terminated'
  )),
  contact_person        TEXT,
  contact_email         TEXT,
  contact_phone         TEXT,
  allowed_plan_ids      UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  notes                 TEXT,
  rejection_reason      TEXT,
  approved_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS ix_hw_hmo_school_links_provider
  ON public.hw_hmo_school_links (provider_id, onboarding_status);

CREATE INDEX IF NOT EXISTS ix_hw_hmo_school_links_tenant
  ON public.hw_hmo_school_links (tenant_id, onboarding_status);

DROP TRIGGER IF EXISTS trg_hw_hmo_school_links_upd ON public.hw_hmo_school_links;
CREATE TRIGGER trg_hw_hmo_school_links_upd
  BEFORE UPDATE ON public.hw_hmo_school_links
  FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. CONFIGURABLE HMO EXCEL / CSV EXPORT MAPPINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hw_export_mappings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE CASCADE,
  template_name         TEXT NOT NULL,
  template_version      INTEGER NOT NULL DEFAULT 1 CHECK (template_version >= 1),
  file_format           TEXT NOT NULL DEFAULT 'CSV' CHECK (file_format IN ('CSV', 'XLSX')),
  date_format           TEXT NOT NULL DEFAULT 'YYYY-MM-DD' CHECK (date_format IN ('YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY')),
  delimiter             CHAR(1) NOT NULL DEFAULT ',',
  include_dependants    BOOLEAN NOT NULL DEFAULT true,
  column_mappings       JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_fields       TEXT[] NOT NULL DEFAULT ARRAY[
    'enrolment_reference',
    'full_name',
    'date_of_birth',
    'sex',
    'member_category',
    'plan_code',
    'period_start',
    'period_end'
  ]::TEXT[],
  is_default            BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, template_name, template_version)
);

CREATE INDEX IF NOT EXISTS ix_hw_export_mappings_provider
  ON public.hw_export_mappings (provider_id, is_active);

DROP TRIGGER IF EXISTS trg_hw_export_mappings_upd ON public.hw_export_mappings;
CREATE TRIGGER trg_hw_export_mappings_upd
  BEFORE UPDATE ON public.hw_export_mappings
  FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. 11-STAGE ENROLLMENT BATCHES & BATCH ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hw_enrolment_batches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference       TEXT NOT NULL UNIQUE CHECK (batch_reference ~ '^[A-Z0-9_\-]{4,64}$'),
  provider_id           UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  tenant_id             UUID REFERENCES public.tenants(id) ON DELETE RESTRICT, -- NULL when multi-school consolidated batch
  plan_id               UUID REFERENCES public.hw_plans(id) ON DELETE RESTRICT,
  mapping_id            UUID REFERENCES public.hw_export_mappings(id) ON DELETE SET NULL,
  academic_session      TEXT,
  coverage_start        DATE,
  coverage_end          DATE,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'validating',
    'validation_failed',
    'ready_for_export',
    'exported',
    'submitted_to_hmo',
    'awaiting_hmo_response',
    'partially_processed',
    'reconciled',
    'completed',
    'cancelled'
  )),
  total_rows            INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows            INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows          INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  confirmed_rows        INTEGER NOT NULL DEFAULT 0 CHECK (confirmed_rows >= 0),
  rejected_rows         INTEGER NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
  pending_rows          INTEGER NOT NULL DEFAULT 0 CHECK (pending_rows >= 0),
  export_count          INTEGER NOT NULL DEFAULT 0 CHECK (export_count >= 0),
  last_exported_at      TIMESTAMPTZ,
  last_exported_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_at          TIMESTAMPTZ,
  reconciled_at         TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  notes                 TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_hw_enrolment_batches_provider_status
  ON public.hw_enrolment_batches (provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_hw_enrolment_batches_tenant
  ON public.hw_enrolment_batches (tenant_id, status);

DROP TRIGGER IF EXISTS trg_hw_enrolment_batches_upd ON public.hw_enrolment_batches;
CREATE TRIGGER trg_hw_enrolment_batches_upd
  BEFORE UPDATE ON public.hw_enrolment_batches
  FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

CREATE TABLE IF NOT EXISTS public.hw_enrolment_batch_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                  UUID NOT NULL REFERENCES public.hw_enrolment_batches(id) ON DELETE CASCADE,
  provider_id               UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  tenant_id                 UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  enrolment_id              UUID NOT NULL REFERENCES public.hw_enrolments(id) ON DELETE RESTRICT,
  member_id                 UUID NOT NULL REFERENCES public.hw_members(id) ON DELETE RESTRICT,
  enrolment_reference       TEXT NOT NULL, -- Stable Invify enrolment reference for round-trip matching
  row_number                INTEGER NOT NULL CHECK (row_number >= 1),
  member_full_name          TEXT NOT NULL,
  member_category           TEXT NOT NULL,
  date_of_birth             DATE,
  sex                       TEXT,
  plan_code                 TEXT NOT NULL,
  plan_name                 TEXT,
  school_name               TEXT,
  guardian_or_staff_contact TEXT,
  hospital_preference       TEXT,
  validation_status         TEXT NOT NULL DEFAULT 'valid' CHECK (validation_status IN ('valid', 'invalid', 'warning')),
  validation_errors         JSONB NOT NULL DEFAULT '[]'::jsonb,
  reconciliation_status     TEXT NOT NULL DEFAULT 'pending' CHECK (reconciliation_status IN (
    'pending',
    ' exported',
    'exported',
    'confirmed',
    'rejected',
    'duplicate',
    'exception'
  )),
  hmo_member_id             TEXT,
  hmo_policy_number         TEXT,
  confirmed_effective_date  DATE,
  confirmed_expiry_date     DATE,
  assigned_facility_ref     TEXT,
  rejection_code            TEXT,
  rejection_reason          TEXT,
  reconciled_at             TIMESTAMPTZ,
  reconciled_by_job_id      UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, enrolment_id),
  UNIQUE (batch_id, enrolment_reference)
);

CREATE INDEX IF NOT EXISTS ix_hw_batch_items_batch
  ON public.hw_enrolment_batch_items (batch_id, row_number);

CREATE INDEX IF NOT EXISTS ix_hw_batch_items_ref
  ON public.hw_enrolment_batch_items (provider_id, enrolment_reference);

DROP TRIGGER IF EXISTS trg_hw_batch_items_upd ON public.hw_enrolment_batch_items;
CREATE TRIGGER trg_hw_batch_items_upd
  BEFORE UPDATE ON public.hw_enrolment_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ------------------------------------------------------------------------------
-- 6. PROCESSED HMO RESPONSE FILE IMPORT JOBS & ROW RECONCILIATION RESULTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hw_import_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_reference         TEXT NOT NULL UNIQUE CHECK (job_reference ~ '^[A-Z0-9_\-]{4,64}$'),
  provider_id           UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  batch_id              UUID REFERENCES public.hw_enrolment_batches(id) ON DELETE SET NULL,
  import_type           TEXT NOT NULL DEFAULT 'ENROLMENT_RESPONSE' CHECK (import_type IN (
    'ENROLMENT_RESPONSE',
    'FACILITY_NETWORK',
    'CLAIM_SETTLEMENT'
  )),
  file_name             TEXT NOT NULL,
  file_checksum_sha256  TEXT NOT NULL,
  file_size_bytes       INTEGER NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
  idempotency_key       TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'previewed' CHECK (status IN (
    'previewed',
    'processing',
    'completed',
    'partially_completed',
    'failed'
  )),
  total_rows            INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  matched_rows          INTEGER NOT NULL DEFAULT 0 CHECK (matched_rows >= 0),
  confirmed_rows        INTEGER NOT NULL DEFAULT 0 CHECK (confirmed_rows >= 0),
  rejected_rows         INTEGER NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
  unmatched_rows        INTEGER NOT NULL DEFAULT 0 CHECK (unmatched_rows >= 0),
  duplicate_rows        INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  invalid_rows          INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  summary_payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  committed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_hw_import_jobs_provider
  ON public.hw_import_jobs (provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_hw_import_jobs_checksum
  ON public.hw_import_jobs (provider_id, file_checksum_sha256);

DROP TRIGGER IF EXISTS trg_hw_import_jobs_upd ON public.hw_import_jobs;
CREATE TRIGGER trg_hw_import_jobs_upd
  BEFORE UPDATE ON public.hw_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

CREATE TABLE IF NOT EXISTS public.hw_import_row_results (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id             UUID NOT NULL REFERENCES public.hw_import_jobs(id) ON DELETE CASCADE,
  provider_id               UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  batch_item_id             UUID REFERENCES public.hw_enrolment_batch_items(id) ON DELETE SET NULL,
  enrolment_id              UUID REFERENCES public.hw_enrolments(id) ON DELETE SET NULL,
  row_number                INTEGER NOT NULL CHECK (row_number >= 1),
  enrolment_reference       TEXT,
  batch_reference           TEXT,
  outcome                   TEXT NOT NULL CHECK (outcome IN (
    'matched_confirmed',
    'matched_rejected',
    'duplicate_ignored',
    'unmatched_reference',
    'cross_hmo_violation',
    'validation_error'
  )),
  hmo_member_id             TEXT,
  hmo_policy_number         TEXT,
  confirmed_status          TEXT,
  confirmed_effective_date  DATE,
  confirmed_expiry_date     DATE,
  assigned_facility_ref     TEXT,
  rejection_code            TEXT,
  rejection_reason          TEXT,
  error_details             TEXT,
  raw_row_sanitized         JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved                  BOOLEAN NOT NULL DEFAULT false,
  resolved_by               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_hw_import_row_results_job
  ON public.hw_import_row_results (import_job_id, row_number);

CREATE INDEX IF NOT EXISTS ix_hw_import_row_results_exceptions
  ON public.hw_import_row_results (provider_id, outcome, resolved)
  WHERE outcome IN ('unmatched_reference', 'cross_hmo_violation', 'validation_error', 'matched_rejected');

-- ------------------------------------------------------------------------------
-- 7. HMO OPERATIONAL TASKS & SLA QUEUE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hw_hmo_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE CASCADE,
  task_type         TEXT NOT NULL CHECK (task_type IN (
    'ENROLMENT_REVIEW',
    'BATCH_EXPORT',
    'BATCH_RECONCILIATION',
    'PREAUTH_REVIEW',
    'CLAIM_REVIEW',
    'SCHOOL_ONBOARDING',
    'CONTRACT_EXPIRY',
    'COMPLIANCE_ALERT'
  )),
  title             TEXT NOT NULL,
  description       TEXT,
  priority          TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status            TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  resource_type     TEXT,
  resource_id       TEXT,
  due_at            TIMESTAMPTZ,
  assigned_role     TEXT,
  completed_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_hw_hmo_tasks_provider_status
  ON public.hw_hmo_tasks (provider_id, status, priority);

DROP TRIGGER IF EXISTS trg_hw_hmo_tasks_upd ON public.hw_hmo_tasks;
CREATE TRIGGER trg_hw_hmo_tasks_upd
  BEFORE UPDATE ON public.hw_hmo_tasks
  FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) FOR NEW HMO TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.hw_hmo_user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_hmo_school_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_export_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_enrolment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_enrolment_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_import_row_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_hmo_tasks ENABLE ROW LEVEL SECURITY;

-- Helper RLS function to resolve authenticated user's active HMO provider_id
CREATE OR REPLACE FUNCTION public.hw_current_hmo_provider_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.provider_id
  FROM public.hw_hmo_user_memberships m
  WHERE m.status = 'ACTIVE'
    AND (
      m.user_id = auth.uid()
      OR LOWER(m.email) = LOWER(COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'email', ''))
    );
$$;

DO $$
DECLARE
  tbl text;
  hmo_tables text[] := ARRAY[
    'hw_hmo_user_memberships',
    'hw_hmo_school_links',
    'hw_export_mappings',
    'hw_enrolment_batches',
    'hw_enrolment_batch_items',
    'hw_import_jobs',
    'hw_import_row_results',
    'hw_hmo_tasks'
  ];
BEGIN
  FOREACH tbl IN ARRAY hmo_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS hmo_provider_isolation_select ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY hmo_provider_isolation_select ON public.%I FOR SELECT TO authenticated USING (provider_id IN (SELECT public.hw_current_hmo_provider_ids()) OR public.inst_is_platform_admin())',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS hmo_provider_isolation_all ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY hmo_provider_isolation_all ON public.%I FOR ALL TO authenticated USING (provider_id IN (SELECT public.hw_current_hmo_provider_ids()) OR public.inst_is_platform_admin()) WITH CHECK (provider_id IN (SELECT public.hw_current_hmo_provider_ids()) OR public.inst_is_platform_admin())',
      tbl
    );
  END LOOP;
END $$;

-- Allow tenants (schools/employers) to view their own school links & batches
DROP POLICY IF EXISTS tenant_school_link_select ON public.hw_hmo_school_links;
CREATE POLICY tenant_school_link_select ON public.hw_hmo_school_links
  FOR SELECT TO authenticated
  USING (tenant_id = public.hw_current_tenant_id());

DROP POLICY IF EXISTS tenant_enrolment_batch_select ON public.hw_enrolment_batches;
CREATE POLICY tenant_enrolment_batch_select ON public.hw_enrolment_batches
  FOR SELECT TO authenticated
  USING (tenant_id = public.hw_current_tenant_id());

-- ------------------------------------------------------------------------------
-- 9. SEED MHMO INSTITUTION, HEALTH_INSURANCE SERVICE, AND HMO PROVIDER RECORD
-- ------------------------------------------------------------------------------
INSERT INTO public.institutions (
  id,
  institution_code,
  legal_name,
  trading_name,
  institution_type,
  status,
  kyc_status,
  contact_email,
  contact_phone,
  metadata
) VALUES (
  '00000000-0000-0000-0000-000000000060'::uuid,
  'MHMO',
  'Managed Health Maintenance Organisation Ltd',
  'MHMO Health Insurance',
  'HMO',
  'ACTIVE',
  'VERIFIED',
  'operations@mhmo.ng',
  '+2348006466000',
  '{"regulator": "NHIA", "licenceNumber": "NHIA/HMO/060", "portalMode": "HMO"}'::jsonb
)
ON CONFLICT ((UPPER(TRIM(institution_code)))) WHERE deleted_at IS NULL
DO UPDATE SET
  institution_type = 'HMO',
  status = 'ACTIVE',
  kyc_status = 'VERIFIED',
  updated_at = now();

INSERT INTO public.institution_services (
  institution_id,
  service_type,
  default_provider,
  allowed_providers,
  tenant_override_policy,
  status,
  commercial_terms
)
SELECT
  i.id,
  'HEALTH_INSURANCE',
  'mhmo',
  '["mhmo"]'::jsonb,
  'LOCKED',
  'ACTIVE',
  '{"settlementCycle": "monthly", "excelExchangeEnabled": true}'::jsonb
FROM public.institutions i
WHERE UPPER(TRIM(i.institution_code)) = 'MHMO' AND i.deleted_at IS NULL
ON CONFLICT (institution_id, service_type) DO NOTHING;

INSERT INTO public.hw_providers (
  code,
  display_name,
  legal_name,
  licence_reference,
  regulator_type,
  integration_status,
  adapter_key,
  institution_id,
  contact_email,
  contact_phone,
  support_email,
  claims_email,
  state,
  capabilities,
  last_verified_at
)
SELECT
  'mhmo',
  'MHMO Health Insurance',
  'Managed Health Maintenance Organisation Ltd',
  'NHIA/HMO/060',
  'NHIA',
  'verified',
  'mhmo_excel',
  i.id,
  'operations@mhmo.ng',
  '+2348006466000',
  'support@mhmo.ng',
  'claims@mhmo.ng',
  'Lagos',
  '{"plans": true, "enrolmentSubmit": true, "enrolmentStatus": true, "eligibility": true, "facilities": true, "claims": true, "renewals": true, "excelExchange": true}'::jsonb,
  now()
FROM public.institutions i
WHERE UPPER(TRIM(i.institution_code)) = 'MHMO' AND i.deleted_at IS NULL
ON CONFLICT (code) DO UPDATE SET
  institution_id = EXCLUDED.institution_id,
  display_name = EXCLUDED.display_name,
  legal_name = EXCLUDED.legal_name,
  licence_reference = COALESCE(public.hw_providers.licence_reference, EXCLUDED.licence_reference),
  integration_status = 'verified',
  updated_at = now();

-- Seed default Excel/CSV Export Mapping for MHMO
INSERT INTO public.hw_export_mappings (
  provider_id,
  template_name,
  template_version,
  file_format,
  date_format,
  delimiter,
  include_dependants,
  column_mappings,
  is_default,
  is_active
)
SELECT
  p.id,
  'MHMO Standard Enrollment Exchange v1',
  1,
  'CSV',
  'YYYY-MM-DD',
  ',',
  true,
  '[
    {"sourceField": "batch_reference", "headerName": "BATCH_REF", "required": true},
    {"sourceField": "enrolment_reference", "headerName": "INVIFY_ENROLMENT_REF", "required": true},
    {"sourceField": "school_name", "headerName": "SCHOOL_OR_EMPLOYER_NAME", "required": true},
    {"sourceField": "member_full_name", "headerName": "MEMBER_FULL_NAME", "required": true},
    {"sourceField": "member_category", "headerName": "MEMBER_CATEGORY", "required": true},
    {"sourceField": "date_of_birth", "headerName": "DATE_OF_BIRTH", "required": true},
    {"sourceField": "sex", "headerName": "GENDER", "required": true},
    {"sourceField": "plan_code", "headerName": "HMO_PLAN_CODE", "required": true},
    {"sourceField": "period_start", "headerName": "COVERAGE_START_DATE", "required": true},
    {"sourceField": "period_end", "headerName": "COVERAGE_END_DATE", "required": true},
    {"sourceField": "guardian_or_staff_contact", "headerName": "PRIMARY_CONTACT", "required": false},
    {"sourceField": "hospital_preference", "headerName": "PREFERRED_PROVIDER", "required": false}
  ]'::jsonb,
  true,
  true
FROM public.hw_providers p
WHERE p.code = 'mhmo'
ON CONFLICT (provider_id, template_name, template_version) DO NOTHING;

COMMIT;

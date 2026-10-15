-- PROPOSED — NOT APPLIED. Phase 1 design artefact. Do not move into supabase/migrations without approval.
-- hw_00_foundation: helpers, platform-level catalogue (providers, plans, versions, facilities), tenant settings, grants.
-- Additive only: creates new objects with IF NOT EXISTS; alters NO existing table.
-- Forward-recovery: set FEATURE_HEALTH_INSURANCE_ENABLED=false; tables may stay. Rollback script: rollback/hw_rollback.sql (destructive, needs approval).

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;  -- needed by hw_10/hw_20 exclusion constraints. DB-level change: needs approval (U6).

-- ---------------------------------------------------------------- helpers
CREATE OR REPLACE FUNCTION public.hw_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

-- Append-only guard for history / audit tables.
CREATE OR REPLACE FUNCTION public.hw_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'hw: % is append-only (% blocked)', TG_TABLE_NAME, TG_OP USING ERRCODE = 'integrity_constraint_violation'; END $$;

-- Tenant-consistency trigger for references that cannot use composite FKs
-- (existing tables have text/varchar/nullable tenant columns and cannot be altered).
-- TG_ARGV: [0] referenced table, [1] column on NEW holding the id, [2] SQL expr yielding the referenced row's tenant as text.
CREATE OR REPLACE FUNCTION public.hw_assert_same_tenant() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_ref text; v_id text; v_ref_tenant text;
BEGIN
  v_id := to_jsonb(NEW) ->> TG_ARGV[1];
  IF v_id IS NULL THEN RETURN NEW; END IF;
  EXECUTE format('SELECT (%s) FROM public.%I WHERE id::text = $1', TG_ARGV[2], TG_ARGV[0]) INTO v_ref_tenant USING v_id;
  IF v_ref_tenant IS NULL OR lower(v_ref_tenant) <> lower(NEW.tenant_id::text) THEN
    RAISE EXCEPTION 'hw: cross-tenant reference rejected (% -> %)', TG_TABLE_NAME, TG_ARGV[0]
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------- tenant settings (per-tenant gate; env flag is the first gate)
CREATE TABLE IF NOT EXISTS public.hw_tenant_settings (
  tenant_id        uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE RESTRICT,
  enabled          boolean NOT NULL DEFAULT false,
  school_enabled   boolean NOT NULL DEFAULT false,
  retail_enabled   boolean NOT NULL DEFAULT false,
  services_enabled boolean NOT NULL DEFAULT false,
  notify_defaults  jsonb   NOT NULL DEFAULT '{}'::jsonb,
  retention_months integer NOT NULL DEFAULT 84 CHECK (retention_months BETWEEN 12 AND 240),
  enabled_by       uuid REFERENCES public.users(id),
  enabled_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_hw_tenant_settings_upd ON public.hw_tenant_settings;
CREATE TRIGGER trg_hw_tenant_settings_upd BEFORE UPDATE ON public.hw_tenant_settings FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ---------------------------------------------------------------- permission grants (explicit; NOT derived from users.role)
CREATE TABLE IF NOT EXISTS public.hw_permission_grants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  user_id     uuid NOT NULL REFERENCES public.users(id)   ON DELETE RESTRICT,
  permission  text NOT NULL CHECK (permission IN (
    'health.settings.manage','health.plans.manage','health.members.read','health.members.manage',
    'health.students.access','health.staff.access','health.hr_admin','health.enrolments.manage',
    'health.enrolments.verify','health.guardians.manage','health.billing.read','health.billing.manage',
    'health.reports.read','health.exports.run','health.audit.read','health.claims.read')),
  scope       jsonb NOT NULL DEFAULT '{}'::jsonb,           -- e.g. {"employment_category":["teaching"]}
  granted_by  uuid NOT NULL REFERENCES public.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  revoked_at  timestamptz,
  revoked_by  uuid REFERENCES public.users(id),
  CHECK (revoked_at IS NULL OR revoked_by IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_grant_active ON public.hw_permission_grants (tenant_id, user_id, permission) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_hw_grant_user ON public.hw_permission_grants (user_id) WHERE revoked_at IS NULL;

-- Platform operators: explicit, time-boxed; super_admin role alone grants nothing here.
CREATE TABLE IF NOT EXISTS public.hw_platform_grants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  permission  text NOT NULL CHECK (permission IN ('platform.providers.manage','platform.plans.manage','platform.tenants.onboard','platform.integration.health','platform.tenant_access')),
  granted_by  uuid NOT NULL REFERENCES public.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,                         -- mandatory expiry
  revoked_at  timestamptz,
  CHECK (expires_at > granted_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_platform_grant_active ON public.hw_platform_grants (user_id, permission) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------- providers (platform-owned; no tenant_id by design)
CREATE TABLE IF NOT EXISTS public.hw_providers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_]{2,40}$'),
  display_name       text NOT NULL,
  licence_reference  text,                                   -- regulator licence no. (NAICOM / NHIA HMO), recorded when known
  integration_status text NOT NULL DEFAULT 'none' CHECK (integration_status IN ('none','sandbox','pending_verification','verified','suspended')),
  adapter_key        text,                                   -- code-side adapter id; 'sandbox' only allowed outside prod (enforced in code + test)
  secret_ref         text,                                   -- NAME of secret in the vault, never the secret
  capabilities       jsonb NOT NULL DEFAULT '{}'::jsonb,     -- {plans,enrolmentSubmit,enrolmentStatus,eligibility,facilities,claims,renewals}
  retain_raw_payloads boolean NOT NULL DEFAULT false,
  last_verified_at   timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (adapter_key IS DISTINCT FROM 'sandbox' OR integration_status IN ('none','sandbox'))
);
DROP TRIGGER IF EXISTS trg_hw_providers_upd ON public.hw_providers;
CREATE TRIGGER trg_hw_providers_upd BEFORE UPDATE ON public.hw_providers FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ---------------------------------------------------------------- plans (global catalogue) and immutable versions
CREATE TABLE IF NOT EXISTS public.hw_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  code        text NOT NULL CHECK (code ~ '^[A-Za-z0-9_\-]{2,60}$'),
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_by  uuid REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, code)
);
DROP TRIGGER IF EXISTS trg_hw_plans_upd ON public.hw_plans;
CREATE TRIGGER trg_hw_plans_upd BEFORE UPDATE ON public.hw_plans FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

CREATE TABLE IF NOT EXISTS public.hw_plan_versions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id                     uuid NOT NULL REFERENCES public.hw_plans(id) ON DELETE RESTRICT,
  version                     integer NOT NULL CHECK (version >= 1),
  status                      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  premium_minor               bigint  NOT NULL CHECK (premium_minor >= 0),        -- integer kobo
  currency                    char(3) NOT NULL DEFAULT 'NGN',
  billing_frequency           text NOT NULL CHECK (billing_frequency IN ('monthly','quarterly','termly','annual','one_off')),
  member_categories           text[] NOT NULL CHECK (member_categories <@ ARRAY['student','teaching_staff','non_teaching_staff','dependant','retail_employee','services_member']::text[] AND cardinality(member_categories) > 0),
  eligibility_rules           jsonb NOT NULL DEFAULT '{}'::jsonb,                  -- age bands, dependants allowed/max, etc.
  benefits                    jsonb NOT NULL DEFAULT '[]'::jsonb,
  exclusions                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  renewal_requirements        jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_verification       boolean NOT NULL DEFAULT true,
  activation_requires_payment boolean NOT NULL DEFAULT true,
  effective_from              date NOT NULL,
  effective_to                date,
  published_at                timestamptz,
  published_by                uuid REFERENCES public.users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version),
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  CHECK (status = 'draft' OR published_at IS NOT NULL)
);

-- Published versions are immutable except retiring them (history is preserved; enrolments keep their version).
CREATE OR REPLACE FUNCTION public.hw_plan_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'hw: published plan versions cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' THEN
    IF NEW.status = 'retired' AND OLD.status = 'published'
       AND (to_jsonb(NEW) - 'status' - 'effective_to') = (to_jsonb(OLD) - 'status' - 'effective_to') THEN
      RETURN NEW;                                                  -- only retire / set end date
    END IF;
    RAISE EXCEPTION 'hw: published plan version % is immutable; create a new version', OLD.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hw_plan_versions_immutable ON public.hw_plan_versions;
CREATE TRIGGER trg_hw_plan_versions_immutable BEFORE UPDATE OR DELETE ON public.hw_plan_versions FOR EACH ROW EXECUTE FUNCTION public.hw_plan_version_immutable();

-- Which tenants may offer which published plan version, and how it is funded by default.
CREATE TABLE IF NOT EXISTS public.hw_tenant_plan_offers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  plan_version_id  uuid NOT NULL REFERENCES public.hw_plan_versions(id) ON DELETE RESTRICT,
  default_funding  text NOT NULL CHECK (default_funding IN ('school','employer','member','shared')),
  shared_split     jsonb,                                    -- e.g. {"tenant_bps":5000,"member_bps":5000}; must sum to 10000 (checked in code + constraint below)
  is_active        boolean NOT NULL DEFAULT true,
  created_by       uuid REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, plan_version_id),
  CHECK (default_funding <> 'shared' OR (shared_split ? 'tenant_bps' AND shared_split ? 'member_bps'
        AND (shared_split->>'tenant_bps')::int + (shared_split->>'member_bps')::int = 10000))
);
CREATE INDEX IF NOT EXISTS ix_hw_offer_tenant ON public.hw_tenant_plan_offers (tenant_id) WHERE is_active;

-- ---------------------------------------------------------------- facilities (provider-supplied only; never fabricated)
CREATE TABLE IF NOT EXISTS public.hw_facilities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     uuid NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  external_ref    text NOT NULL,
  name            text NOT NULL,
  state           text,
  lga             text,
  address         text,
  phone           text,
  services        text[] NOT NULL DEFAULT '{}',
  restrictions    text,
  source          text NOT NULL CHECK (source IN ('provider_sync','provider_file','manual_verified')),
  last_verified_at timestamptz NOT NULL,                     -- required: no evidence, no row
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, external_ref)
);
CREATE TABLE IF NOT EXISTS public.hw_facility_plans (
  facility_id uuid NOT NULL REFERENCES public.hw_facilities(id) ON DELETE CASCADE,
  plan_id     uuid NOT NULL REFERENCES public.hw_plans(id)      ON DELETE CASCADE,
  PRIMARY KEY (facility_id, plan_id)
);
CREATE INDEX IF NOT EXISTS ix_hw_facility_geo ON public.hw_facilities (state, lga) WHERE is_active;

COMMIT;

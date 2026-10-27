/*
=============================================================================
Migration: fee_orchestration_phase1
Description: Additive platform fee orchestration catalog, versioning, publish RPC,
             immutable assessments, and DRAFT-only seed profiles.

--- MIGRATION GOVERNANCE ---
Rollback Strategy:
  See supabase/rollbacks/20260926163000_fee_orchestration_phase1.sql

Verification:
  Run supabase/tests/fee_orchestration_phase1_verify.sql after apply.

Backwards Compatibility:
  Additive only. Does not alter tenant_fee_profiles, fee_transactions,
  tenant_fee_profile_history, school fee_* tables, or ledger posting RPCs.
  Does not enable FEE_ORCHESTRATION_LIVE.

Risk Assessment:
  Low. New types/tables/functions only. Draft seeds are unpublished.
  Publish RPC requires exact 10,000 bps split; published rows are immutable.

Locked POS_WITHDRAWAL draft (not published):
  method = PERCENTAGE
  percentage_bps = 125
  flat_amount_kobo = 0
  min_fee_kobo = 0
  max_fee_kobo = 5000   -- cap, not a flat fee
  ₦1,000 → ₦12.50; ₦10,000 → ₦50 cap
=============================================================================
*/

BEGIN;

-- ── Preflight (abort if object/type name conflict) ──────────────────────────
DO $$
DECLARE
  v_conflict text;
BEGIN
  IF to_regclass('public.tenants') IS NULL THEN
    RAISE EXCEPTION 'fee orchestration preflight failed: public.tenants missing';
  END IF;
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'fee orchestration preflight failed: public.users missing';
  END IF;
  IF to_regclass('public.ledger_entries') IS NULL THEN
    RAISE EXCEPTION 'fee orchestration preflight failed: public.ledger_entries missing';
  END IF;
  IF to_regprocedure('public.is_admin_or_service()') IS NULL THEN
    RAISE EXCEPTION 'fee orchestration preflight failed: is_admin_or_service() missing';
  END IF;
  IF to_regprocedure('public.is_platform_staff()') IS NULL THEN
    RAISE EXCEPTION 'fee orchestration preflight failed: is_platform_staff() missing';
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
    INTO v_conflict
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
      'fee_profiles',
      'fee_profile_versions',
      'fee_profile_overrides',
      'fee_profile_override_versions',
      'fee_assessments',
      'fee_assessment_lines'
    );
  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'fee orchestration preflight failed: table name conflict (%)', v_conflict;
  END IF;

  SELECT string_agg(t.typname, ', ' ORDER BY t.typname)
    INTO v_conflict
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
    AND t.typtype = 'e'
    AND t.typname IN (
      'fee_transaction_type',
      'fee_calc_method',
      'fee_version_status',
      'fee_component',
      'fee_assessment_mode',
      'fee_assessment_kind'
    );
  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'fee orchestration preflight failed: enum name conflict (%)', v_conflict;
  END IF;

  IF to_regprocedure('public.publish_fee_profile_version(uuid)') IS NOT NULL
     OR to_regprocedure('public.publish_fee_profile_override_version(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'fee orchestration preflight failed: publish RPC name conflict';
  END IF;
END $$;

-- ── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE public.fee_transaction_type AS ENUM (
  'POS_WITHDRAWAL',
  'VIRTUAL_ACCOUNT_INWARD_TRANSFER',
  'TREASURY_WITHDRAWAL',
  'TREASURY_TRANSFER',
  'SMS',
  'AI_TASK'
);

CREATE TYPE public.fee_calc_method AS ENUM (
  'FLAT',
  'PERCENTAGE',
  'HYBRID'
);

CREATE TYPE public.fee_version_status AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'SUPERSEDED'
);

CREATE TYPE public.fee_component AS ENUM (
  'PLATFORM',
  'PROCESSOR',
  'SERVICE',
  'AGENT_FEE'
);

CREATE TYPE public.fee_assessment_mode AS ENUM (
  'SHADOW',
  'LIVE'
);

CREATE TYPE public.fee_assessment_kind AS ENUM (
  'ASSESSMENT',
  'REVERSAL'
);

-- ── Catalog ─────────────────────────────────────────────────────────────────
CREATE TABLE public.fee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type public.fee_transaction_type NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  current_published_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fee_profiles_transaction_type_key UNIQUE (transaction_type)
);

CREATE TABLE public.fee_profile_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.fee_profiles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  status public.fee_version_status NOT NULL DEFAULT 'DRAFT',
  method public.fee_calc_method NOT NULL,
  percentage_bps INTEGER NOT NULL DEFAULT 0 CHECK (percentage_bps >= 0),
  flat_amount_kobo BIGINT NOT NULL DEFAULT 0 CHECK (flat_amount_kobo >= 0),
  min_fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (min_fee_kobo >= 0),
  max_fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (max_fee_kobo >= 0),
  platform_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (platform_share_bps >= 0),
  processor_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (processor_share_bps >= 0),
  service_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (service_share_bps >= 0),
  agent_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (agent_share_bps >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT fee_profile_versions_profile_version_key UNIQUE (profile_id, version_number),
  CONSTRAINT fee_profile_versions_max_gte_min_chk CHECK (
    max_fee_kobo = 0 OR max_fee_kobo >= min_fee_kobo
  ),
  CONSTRAINT fee_profile_versions_published_split_10000_chk CHECK (
    status <> 'PUBLISHED'::public.fee_version_status
    OR (
      platform_share_bps
      + processor_share_bps
      + service_share_bps
      + agent_share_bps
    ) = 10000
  ),
  CONSTRAINT fee_profile_versions_published_method_chk CHECK (
    status <> 'PUBLISHED'::public.fee_version_status
    OR (
      CASE method
        WHEN 'FLAT' THEN flat_amount_kobo > 0 AND percentage_bps = 0
        WHEN 'PERCENTAGE' THEN percentage_bps > 0
        WHEN 'HYBRID' THEN flat_amount_kobo > 0 AND percentage_bps > 0
      END
    )
  )
);

ALTER TABLE public.fee_profiles
  ADD CONSTRAINT fee_profiles_current_published_version_id_fkey
  FOREIGN KEY (current_published_version_id)
  REFERENCES public.fee_profile_versions(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX fee_profile_versions_one_published_per_profile_idx
  ON public.fee_profile_versions (profile_id)
  WHERE status = 'PUBLISHED';

CREATE INDEX fee_profile_versions_profile_status_idx
  ON public.fee_profile_versions (profile_id, status);

-- Tenant overrides (optional drafts; never auto-published)
CREATE TABLE public.fee_profile_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.fee_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_published_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fee_profile_overrides_profile_tenant_key UNIQUE (profile_id, tenant_id)
);

CREATE TABLE public.fee_profile_override_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_id UUID NOT NULL REFERENCES public.fee_profile_overrides(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  status public.fee_version_status NOT NULL DEFAULT 'DRAFT',
  method public.fee_calc_method NOT NULL,
  percentage_bps INTEGER NOT NULL DEFAULT 0 CHECK (percentage_bps >= 0),
  flat_amount_kobo BIGINT NOT NULL DEFAULT 0 CHECK (flat_amount_kobo >= 0),
  min_fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (min_fee_kobo >= 0),
  max_fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (max_fee_kobo >= 0),
  platform_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (platform_share_bps >= 0),
  processor_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (processor_share_bps >= 0),
  service_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (service_share_bps >= 0),
  agent_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (agent_share_bps >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT fee_profile_override_versions_override_version_key UNIQUE (override_id, version_number),
  CONSTRAINT fee_profile_override_versions_max_gte_min_chk CHECK (
    max_fee_kobo = 0 OR max_fee_kobo >= min_fee_kobo
  ),
  CONSTRAINT fee_profile_override_versions_published_split_10000_chk CHECK (
    status <> 'PUBLISHED'::public.fee_version_status
    OR (
      platform_share_bps
      + processor_share_bps
      + service_share_bps
      + agent_share_bps
    ) = 10000
  ),
  CONSTRAINT fee_profile_override_versions_published_method_chk CHECK (
    status <> 'PUBLISHED'::public.fee_version_status
    OR (
      CASE method
        WHEN 'FLAT' THEN flat_amount_kobo > 0 AND percentage_bps = 0
        WHEN 'PERCENTAGE' THEN percentage_bps > 0
        WHEN 'HYBRID' THEN flat_amount_kobo > 0 AND percentage_bps > 0
      END
    )
  )
);

ALTER TABLE public.fee_profile_overrides
  ADD CONSTRAINT fee_profile_overrides_current_published_version_id_fkey
  FOREIGN KEY (current_published_version_id)
  REFERENCES public.fee_profile_override_versions(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX fee_profile_override_versions_one_published_idx
  ON public.fee_profile_override_versions (override_id)
  WHERE status = 'PUBLISHED';

CREATE INDEX fee_profile_overrides_tenant_idx
  ON public.fee_profile_overrides (tenant_id);

-- ── Assessments (shadow/live snapshots; no ledger postings in Phase 1) ──────
CREATE TABLE public.fee_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  transaction_type public.fee_transaction_type NOT NULL,
  source_system TEXT NOT NULL,
  source_idempotency_key TEXT NOT NULL,
  mode public.fee_assessment_mode NOT NULL DEFAULT 'SHADOW',
  kind public.fee_assessment_kind NOT NULL DEFAULT 'ASSESSMENT',
  principal_amount_kobo BIGINT NOT NULL,
  calculated_fee_kobo BIGINT NOT NULL,
  min_applied_kobo BIGINT NOT NULL DEFAULT 0,
  cap_applied_kobo BIGINT NOT NULL DEFAULT 0,
  final_fee_kobo BIGINT NOT NULL,
  platform_amount_kobo BIGINT NOT NULL DEFAULT 0,
  processor_amount_kobo BIGINT NOT NULL DEFAULT 0,
  service_amount_kobo BIGINT NOT NULL DEFAULT 0,
  agent_amount_kobo BIGINT NOT NULL DEFAULT 0,
  method public.fee_calc_method NOT NULL,
  percentage_bps INTEGER NOT NULL DEFAULT 0,
  flat_amount_kobo BIGINT NOT NULL DEFAULT 0,
  min_fee_kobo BIGINT NOT NULL DEFAULT 0,
  max_fee_kobo BIGINT NOT NULL DEFAULT 0,
  platform_share_bps INTEGER NOT NULL DEFAULT 0,
  processor_share_bps INTEGER NOT NULL DEFAULT 0,
  service_share_bps INTEGER NOT NULL DEFAULT 0,
  agent_share_bps INTEGER NOT NULL DEFAULT 0,
  profile_version_id UUID REFERENCES public.fee_profile_versions(id) ON DELETE RESTRICT,
  override_version_id UUID REFERENCES public.fee_profile_override_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fee_assessments_source_idempotency_key UNIQUE (source_system, source_idempotency_key),
  CONSTRAINT fee_assessments_components_sum_final_chk CHECK (
    platform_amount_kobo
    + processor_amount_kobo
    + service_amount_kobo
    + agent_amount_kobo
    = final_fee_kobo
  )
);

CREATE TABLE public.fee_assessment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.fee_assessments(id) ON DELETE CASCADE,
  component public.fee_component NOT NULL,
  amount_kobo BIGINT NOT NULL,
  ledger_entry_id UUID REFERENCES public.ledger_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fee_assessment_lines_assessment_component_key UNIQUE (assessment_id, component)
);

CREATE INDEX fee_assessments_tenant_created_idx
  ON public.fee_assessments (tenant_id, created_at DESC);
CREATE INDEX fee_assessments_txn_type_idx
  ON public.fee_assessments (transaction_type, created_at DESC);
CREATE INDEX fee_assessment_lines_assessment_idx
  ON public.fee_assessment_lines (assessment_id);

-- ── Immutability + publish GUC gates ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fee_orchestration_guc_enabled(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting(p_key, true), '') = '1';
$$;

CREATE OR REPLACE FUNCTION public.prevent_fee_profile_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('PUBLISHED', 'SUPERSEDED') THEN
      RAISE EXCEPTION 'Published/superseded fee profile versions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('PUBLISHED', 'SUPERSEDED') THEN
    IF OLD.status = 'PUBLISHED'
       AND NEW.status = 'SUPERSEDED'
       AND public.fee_orchestration_guc_enabled('fee_orchestration.allow_supersede') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Published/superseded fee profile versions cannot be modified';
  END IF;

  IF NEW.status = 'PUBLISHED' AND OLD.status = 'DRAFT' THEN
    IF NOT public.fee_orchestration_guc_enabled('fee_orchestration.allow_publish') THEN
      RAISE EXCEPTION 'Fee profile versions can only be published via publish_fee_profile_version';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_fee_profile_override_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('PUBLISHED', 'SUPERSEDED') THEN
      RAISE EXCEPTION 'Published/superseded fee override versions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('PUBLISHED', 'SUPERSEDED') THEN
    IF OLD.status = 'PUBLISHED'
       AND NEW.status = 'SUPERSEDED'
       AND public.fee_orchestration_guc_enabled('fee_orchestration.allow_supersede') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Published/superseded fee override versions cannot be modified';
  END IF;

  IF NEW.status = 'PUBLISHED' AND OLD.status = 'DRAFT' THEN
    IF NOT public.fee_orchestration_guc_enabled('fee_orchestration.allow_publish') THEN
      RAISE EXCEPTION 'Fee override versions can only be published via publish_fee_profile_override_version';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_fee_profile_published_pointer_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.current_published_version_id IS DISTINCT FROM OLD.current_published_version_id
     AND NOT public.fee_orchestration_guc_enabled('fee_orchestration.allow_publish') THEN
    RAISE EXCEPTION 'current_published_version_id can only be changed via the publish RPC';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_fee_assessment_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Fee assessments are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_fee_profile_version_mutation ON public.fee_profile_versions;
CREATE TRIGGER trg_prevent_fee_profile_version_mutation
  BEFORE UPDATE OR DELETE ON public.fee_profile_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fee_profile_version_mutation();

DROP TRIGGER IF EXISTS trg_prevent_fee_profile_override_version_mutation ON public.fee_profile_override_versions;
CREATE TRIGGER trg_prevent_fee_profile_override_version_mutation
  BEFORE UPDATE OR DELETE ON public.fee_profile_override_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fee_profile_override_version_mutation();

DROP TRIGGER IF EXISTS trg_prevent_fee_profile_published_pointer ON public.fee_profiles;
CREATE TRIGGER trg_prevent_fee_profile_published_pointer
  BEFORE UPDATE ON public.fee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fee_profile_published_pointer_mutation();

DROP TRIGGER IF EXISTS trg_prevent_fee_override_published_pointer ON public.fee_profile_overrides;
CREATE TRIGGER trg_prevent_fee_override_published_pointer
  BEFORE UPDATE ON public.fee_profile_overrides
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fee_profile_published_pointer_mutation();

DROP TRIGGER IF EXISTS trg_prevent_fee_assessment_mutation ON public.fee_assessments;
CREATE TRIGGER trg_prevent_fee_assessment_mutation
  BEFORE UPDATE OR DELETE ON public.fee_assessments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fee_assessment_mutation();

DROP TRIGGER IF EXISTS trg_prevent_fee_assessment_line_mutation ON public.fee_assessment_lines;
CREATE TRIGGER trg_prevent_fee_assessment_line_mutation
  BEFORE UPDATE OR DELETE ON public.fee_assessment_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fee_assessment_mutation();

-- ── Publish RPCs (SECURITY DEFINER; 10,000 bps required) ────────────────────
CREATE OR REPLACE FUNCTION public.fee_orchestration_can_publish()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(auth.role(), '') = 'service_role'
    OR public.is_admin_or_service()
    OR public.is_platform_staff();
$$;

CREATE OR REPLACE FUNCTION public.publish_fee_profile_version(p_version_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.fee_profile_versions%ROWTYPE;
  v_split INTEGER;
BEGIN
  IF NOT public.fee_orchestration_can_publish() THEN
    RAISE EXCEPTION 'not authorized to publish fee profiles';
  END IF;

  SELECT * INTO v_row
  FROM public.fee_profile_versions
  WHERE id = p_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fee profile version % not found', p_version_id;
  END IF;

  IF v_row.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'only DRAFT fee profile versions can be published';
  END IF;

  v_split := v_row.platform_share_bps
    + v_row.processor_share_bps
    + v_row.service_share_bps
    + v_row.agent_share_bps;

  IF v_split <> 10000 THEN
    RAISE EXCEPTION 'publish requires platform+processor+service+agent share bps to equal 10000 (got %)', v_split;
  END IF;

  IF v_row.method = 'FLAT' AND (v_row.flat_amount_kobo <= 0 OR v_row.percentage_bps <> 0) THEN
    RAISE EXCEPTION 'FLAT publish requires flat_amount_kobo > 0 and percentage_bps = 0';
  END IF;
  IF v_row.method = 'PERCENTAGE' AND v_row.percentage_bps <= 0 THEN
    RAISE EXCEPTION 'PERCENTAGE publish requires percentage_bps > 0';
  END IF;
  IF v_row.method = 'HYBRID' AND (v_row.flat_amount_kobo <= 0 OR v_row.percentage_bps <= 0) THEN
    RAISE EXCEPTION 'HYBRID publish requires flat_amount_kobo > 0 and percentage_bps > 0';
  END IF;

  PERFORM set_config('fee_orchestration.allow_publish', '1', true);
  PERFORM set_config('fee_orchestration.allow_supersede', '1', true);

  UPDATE public.fee_profile_versions
  SET
    status = 'SUPERSEDED',
    updated_at = now()
  WHERE profile_id = v_row.profile_id
    AND status = 'PUBLISHED'
    AND id <> v_row.id;

  UPDATE public.fee_profile_versions
  SET
    status = 'PUBLISHED',
    published_at = now(),
    published_by = auth.uid(),
    updated_at = now()
  WHERE id = v_row.id;

  UPDATE public.fee_profiles
  SET
    current_published_version_id = v_row.id,
    updated_at = now()
  WHERE id = v_row.profile_id;

  RETURN v_row.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_fee_profile_override_version(p_version_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.fee_profile_override_versions%ROWTYPE;
  v_split INTEGER;
BEGIN
  IF NOT public.fee_orchestration_can_publish() THEN
    RAISE EXCEPTION 'not authorized to publish fee profile overrides';
  END IF;

  SELECT * INTO v_row
  FROM public.fee_profile_override_versions
  WHERE id = p_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fee override version % not found', p_version_id;
  END IF;

  IF v_row.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'only DRAFT fee override versions can be published';
  END IF;

  v_split := v_row.platform_share_bps
    + v_row.processor_share_bps
    + v_row.service_share_bps
    + v_row.agent_share_bps;

  IF v_split <> 10000 THEN
    RAISE EXCEPTION 'publish requires platform+processor+service+agent share bps to equal 10000 (got %)', v_split;
  END IF;

  IF v_row.method = 'FLAT' AND (v_row.flat_amount_kobo <= 0 OR v_row.percentage_bps <> 0) THEN
    RAISE EXCEPTION 'FLAT publish requires flat_amount_kobo > 0 and percentage_bps = 0';
  END IF;
  IF v_row.method = 'PERCENTAGE' AND v_row.percentage_bps <= 0 THEN
    RAISE EXCEPTION 'PERCENTAGE publish requires percentage_bps > 0';
  END IF;
  IF v_row.method = 'HYBRID' AND (v_row.flat_amount_kobo <= 0 OR v_row.percentage_bps <= 0) THEN
    RAISE EXCEPTION 'HYBRID publish requires flat_amount_kobo > 0 and percentage_bps > 0';
  END IF;

  PERFORM set_config('fee_orchestration.allow_publish', '1', true);
  PERFORM set_config('fee_orchestration.allow_supersede', '1', true);

  UPDATE public.fee_profile_override_versions
  SET
    status = 'SUPERSEDED',
    updated_at = now()
  WHERE override_id = v_row.override_id
    AND status = 'PUBLISHED'
    AND id <> v_row.id;

  UPDATE public.fee_profile_override_versions
  SET
    status = 'PUBLISHED',
    published_at = now(),
    published_by = auth.uid(),
    updated_at = now()
  WHERE id = v_row.id;

  UPDATE public.fee_profile_overrides
  SET
    current_published_version_id = v_row.id,
    updated_at = now()
  WHERE id = v_row.override_id;

  RETURN v_row.id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_fee_profile_version(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_fee_profile_override_version(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fee_orchestration_can_publish() FROM PUBLIC;

-- ── RLS (mirror fee_transactions: no client writes; staff/service read) ─────
ALTER TABLE public.fee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_profile_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_profile_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_profile_override_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_assessment_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_client_write_fee_profiles
  ON public.fee_profiles AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_profiles
  ON public.fee_profiles AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_fee_profile_versions
  ON public.fee_profile_versions AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_profile_versions
  ON public.fee_profile_versions AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_fee_profile_overrides
  ON public.fee_profile_overrides AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_profile_overrides
  ON public.fee_profile_overrides AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());
CREATE POLICY tenant_owner_reads_own_fee_overrides
  ON public.fee_profile_overrides AS PERMISSIVE FOR SELECT TO public
  USING (
    tenant_id IS NOT NULL
    AND (
      SELECT u.tenant_id::text FROM public.users u WHERE u.id = auth.uid()
    ) = tenant_id::text
  );

CREATE POLICY no_client_write_fee_profile_override_versions
  ON public.fee_profile_override_versions AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_profile_override_versions
  ON public.fee_profile_override_versions AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());
CREATE POLICY tenant_owner_reads_own_fee_override_versions
  ON public.fee_profile_override_versions AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.fee_profile_overrides o
      JOIN public.users u ON u.id = auth.uid()
      WHERE o.id = fee_profile_override_versions.override_id
        AND o.tenant_id::text = u.tenant_id::text
    )
  );

CREATE POLICY no_client_write_fee_assessments
  ON public.fee_assessments AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_assessments
  ON public.fee_assessments AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());
CREATE POLICY tenant_owner_reads_own_fee_assessments
  ON public.fee_assessments AS PERMISSIVE FOR SELECT TO public
  USING (
    tenant_id IS NOT NULL
    AND (
      SELECT u.tenant_id::text FROM public.users u WHERE u.id = auth.uid()
    ) = tenant_id::text
  );

CREATE POLICY no_client_write_fee_assessment_lines
  ON public.fee_assessment_lines AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);
CREATE POLICY super_admin_reads_fee_assessment_lines
  ON public.fee_assessment_lines AS PERMISSIVE FOR SELECT TO public
  USING (public.is_admin_or_service() OR public.is_platform_staff());
CREATE POLICY tenant_owner_reads_own_fee_assessment_lines
  ON public.fee_assessment_lines AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.fee_assessments a
      JOIN public.users u ON u.id = auth.uid()
      WHERE a.id = fee_assessment_lines.assessment_id
        AND a.tenant_id::text = u.tenant_id::text
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_profiles TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_profile_versions TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_profile_overrides TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_profile_override_versions TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_assessments TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_assessment_lines TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.publish_fee_profile_version(UUID) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.publish_fee_profile_override_version(UUID) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.fee_orchestration_can_publish() TO service_role';
    EXECUTE $p$
      CREATE POLICY fee_profiles_service_role_all ON public.fee_profiles
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
    EXECUTE $p$
      CREATE POLICY fee_profile_versions_service_role_all ON public.fee_profile_versions
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
    EXECUTE $p$
      CREATE POLICY fee_profile_overrides_service_role_all ON public.fee_profile_overrides
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
    EXECUTE $p$
      CREATE POLICY fee_profile_override_versions_service_role_all ON public.fee_profile_override_versions
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
    EXECUTE $p$
      CREATE POLICY fee_assessments_service_role_all ON public.fee_assessments
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
    EXECUTE $p$
      CREATE POLICY fee_assessment_lines_service_role_all ON public.fee_assessment_lines
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT ON public.fee_profiles TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_profile_versions TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_profile_overrides TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_profile_override_versions TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_assessments TO authenticated';
    EXECUTE 'GRANT SELECT ON public.fee_assessment_lines TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.publish_fee_profile_version(UUID) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.publish_fee_profile_override_version(UUID) TO authenticated';
  END IF;
END $$;

-- ── Draft seed (never published; splits unset) ──────────────────────────────
INSERT INTO public.fee_profiles (transaction_type, display_name, description)
VALUES
  ('POS_WITHDRAWAL', 'POS withdrawal', 'Card/POS cash-out fee. Cap is max_fee_kobo, not a flat fee.'),
  ('VIRTUAL_ACCOUNT_INWARD_TRANSFER', 'Virtual account inward transfer', 'Inward VA credit fee.'),
  ('TREASURY_WITHDRAWAL', 'Treasury withdrawal', 'Treasury payout fee.'),
  ('TREASURY_TRANSFER', 'Treasury transfer', 'Treasury transfer fee.'),
  ('SMS', 'SMS', 'Per-SMS fee.'),
  ('AI_TASK', 'AI task', 'Per-AI-task fee.');

INSERT INTO public.fee_profile_versions (
  profile_id, version_number, status, method,
  percentage_bps, flat_amount_kobo, min_fee_kobo, max_fee_kobo,
  platform_share_bps, processor_share_bps, service_share_bps, agent_share_bps,
  notes
)
SELECT p.id, 1, 'DRAFT', 'PERCENTAGE',
  125, 0, 0, 5000,
  0, 0, 0, 0,
  'DRAFT only. 1.25% (125 bps) with 5000 kobo (₦50) cap. Split unset; not published.'
FROM public.fee_profiles p
WHERE p.transaction_type = 'POS_WITHDRAWAL';

INSERT INTO public.fee_profile_versions (
  profile_id, version_number, status, method,
  percentage_bps, flat_amount_kobo, min_fee_kobo, max_fee_kobo,
  platform_share_bps, processor_share_bps, service_share_bps, agent_share_bps,
  notes
)
SELECT p.id, 1, 'DRAFT', 'FLAT',
  0, 25000, 0, 0,
  0, 0, 0, 0,
  'DRAFT only. Flat 25000 kobo. Split unset; not published.'
FROM public.fee_profiles p
WHERE p.transaction_type = 'TREASURY_WITHDRAWAL';

INSERT INTO public.fee_profile_versions (
  profile_id, version_number, status, method,
  percentage_bps, flat_amount_kobo, min_fee_kobo, max_fee_kobo,
  platform_share_bps, processor_share_bps, service_share_bps, agent_share_bps,
  notes
)
SELECT p.id, 1, 'DRAFT', 'FLAT',
  0, 400, 0, 0,
  0, 0, 0, 0,
  'DRAFT only. Flat 400 kobo per SMS. Split unset; not published.'
FROM public.fee_profiles p
WHERE p.transaction_type = 'SMS';

INSERT INTO public.fee_profile_versions (
  profile_id, version_number, status, method,
  percentage_bps, flat_amount_kobo, min_fee_kobo, max_fee_kobo,
  platform_share_bps, processor_share_bps, service_share_bps, agent_share_bps,
  notes
)
SELECT p.id, 1, 'DRAFT', 'FLAT',
  0, 1000, 0, 0,
  0, 0, 0, 0,
  'DRAFT only. Flat 1000 kobo per AI task. Split unset; not published.'
FROM public.fee_profiles p
WHERE p.transaction_type = 'AI_TASK';

COMMIT;

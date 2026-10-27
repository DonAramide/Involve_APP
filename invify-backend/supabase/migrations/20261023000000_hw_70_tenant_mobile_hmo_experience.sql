-- =============================================================================
-- Migration: 20261023000000_hw_70_tenant_mobile_hmo_experience.sql
-- Purpose:   Phase 2 Wave 1 — Additive schema columns for explicit tenant HMO
--            assignment metadata on hw_tenant_settings.
-- Status:    PROPOSED FOR REVIEW ONLY — DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL
-- Notes:     All changes are strictly additive (IF NOT EXISTS / nullable or
--            safe defaults). Application code also persists and reads HMO
--            assignment state via existing tables (tenant_institution_relationships,
--            hw_hmo_school_links, and hw_tenant_settings.notify_defaults) so
--            runtime behavior works both before and after this migration is applied.
-- =============================================================================

BEGIN;

ALTER TABLE public.hw_tenant_settings
  ADD COLUMN IF NOT EXISTS assigned_provider_id UUID REFERENCES public.hw_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_mode TEXT NOT NULL DEFAULT 'SELECTABLE'
    CHECK (assignment_mode IN ('LOCKED', 'SELECTABLE')),
  ADD COLUMN IF NOT EXISTS assignment_source TEXT NOT NULL DEFAULT 'UNASSIGNED'
    CHECK (assignment_source IN ('CODE_INHERITED', 'TENANT_SELECTED', 'ADMIN_ASSIGNED', 'UNASSIGNED')),
  ADD COLUMN IF NOT EXISTS assigned_by UUID,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_hw_tenant_settings_assigned_provider
  ON public.hw_tenant_settings(assigned_provider_id)
  WHERE assigned_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hw_tenant_settings_assigned_institution
  ON public.hw_tenant_settings(assigned_institution_id)
  WHERE assigned_institution_id IS NOT NULL;

-- Backfill existing MHMO-linked tenants from hw_hmo_school_links / tenant_institution_relationships
UPDATE public.hw_tenant_settings ts
SET
  assigned_provider_id = l.provider_id,
  assigned_institution_id = l.institution_id,
  assignment_mode = CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.institution_services isvc
      WHERE isvc.institution_id = l.institution_id
        AND isvc.service_type = 'HEALTH_INSURANCE'
        AND isvc.status = 'ACTIVE'
        AND isvc.tenant_override_policy = 'LOCKED'
    ) THEN 'LOCKED'
    ELSE 'SELECTABLE'
  END,
  assignment_source = COALESCE(
    NULLIF(ts.notify_defaults #>> '{hmo_assignment,assignmentSource}', ''),
    'CODE_INHERITED'
  ),
  assigned_at = COALESCE(ts.assigned_at, l.updated_at, NOW())
FROM public.hw_hmo_school_links l
WHERE ts.tenant_id = l.tenant_id
  AND l.onboarding_status = 'ACTIVE'
  AND ts.assigned_provider_id IS NULL;

COMMIT;

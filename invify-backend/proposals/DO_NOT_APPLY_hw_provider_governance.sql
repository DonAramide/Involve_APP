-- DO NOT APPLY to staging or production without explicit approval.
-- Additive HMO provider governance support for Platform Super Admin.
-- Preserves existing hw_providers rows and relationships.
-- Rollback: reverse CHECK, drop new columns/index; do not drop hw_providers.

BEGIN;

-- 1) Expand integration_status to include rejected (governance rejection).
-- Existing values: none | sandbox | pending_verification | verified | suspended
DO $$
DECLARE
  cons_name text;
BEGIN
  SELECT c.conname INTO cons_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'hw_providers'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%integration_status%';

  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.hw_providers DROP CONSTRAINT %I', cons_name);
  END IF;

  ALTER TABLE public.hw_providers
    ADD CONSTRAINT hw_providers_integration_status_check
    CHECK (integration_status IN (
      'none',
      'sandbox',
      'pending_verification',
      'verified',
      'suspended',
      'rejected'
    ));
END $$;

-- Keep sandbox adapter rule intact if previously present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'hw_providers'
      AND c.conname = 'hw_providers_sandbox_adapter_check'
  ) THEN
    ALTER TABLE public.hw_providers
      ADD CONSTRAINT hw_providers_sandbox_adapter_check
      CHECK (adapter_key IS DISTINCT FROM 'sandbox' OR integration_status IN ('none','sandbox'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Optional profile / governance fields (nullable; no backfill required).
ALTER TABLE public.hw_providers
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_person_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_person_phone TEXT,
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_hw_providers_integration_status
  ON public.hw_providers (integration_status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_providers_licence_reference_ci
  ON public.hw_providers (lower(licence_reference))
  WHERE licence_reference IS NOT NULL AND btrim(licence_reference) <> '';

-- 3) RLS remains deny-by-default for authenticated clients; platform mutations
-- continue through the Nest service role. No broad public grants are added here.

COMMIT;

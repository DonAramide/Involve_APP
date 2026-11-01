-- DO NOT APPLY to staging or production without explicit approval.
-- Additive label for how an HMO organisation entered hw_providers.
-- Values: platform | self_service | agent
-- Existing rows default to platform (historical Super Admin / unknown origin).
-- Rollback: DROP INDEX + DROP COLUMN registration_channel.

BEGIN;

ALTER TABLE public.hw_providers
  ADD COLUMN IF NOT EXISTS registration_channel text;

UPDATE public.hw_providers
SET registration_channel = 'platform'
WHERE registration_channel IS NULL;

ALTER TABLE public.hw_providers
  ALTER COLUMN registration_channel SET DEFAULT 'platform';

ALTER TABLE public.hw_providers
  ALTER COLUMN registration_channel SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'hw_providers'
      AND c.conname = 'hw_providers_registration_channel_check'
  ) THEN
    ALTER TABLE public.hw_providers
      ADD CONSTRAINT hw_providers_registration_channel_check
      CHECK (registration_channel IN ('platform', 'self_service', 'agent'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_hw_providers_registration_channel
  ON public.hw_providers (registration_channel);

COMMIT;

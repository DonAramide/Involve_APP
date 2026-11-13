-- DO NOT APPLY without explicit approval.
-- Expands hw_platform_grants permission CHECKs so maker-checker finance
-- permissions can be issued through the grant APIs.
-- Route guards already require:
--   platform.finance.view | manage | agreements.approve | statements.approve | finance.reconcile
-- Until this migration is applied, those grants cannot be inserted and finance
-- profitability endpoints will 403 for operators who only hold
-- platform.integration.health (by design — integration.health is no longer a finance bypass).

BEGIN;

DO $$
DECLARE
  cons_name text;
BEGIN
  SELECT c.conname INTO cons_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'hw_platform_grants'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%permission%';

  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.hw_platform_grants DROP CONSTRAINT %I', cons_name);
  END IF;

  ALTER TABLE public.hw_platform_grants
    ADD CONSTRAINT hw_platform_grants_permission_check
    CHECK (permission IN (
      'platform.providers.manage',
      'platform.plans.manage',
      'platform.tenants.onboard',
      'platform.integration.health',
      'platform.tenant_access',
      'platform.finance.view',
      'platform.finance.manage',
      'platform.agreements.approve',
      'platform.statements.approve',
      'platform.finance.reconcile'
    ));
END $$;

-- Entitlements table (if present) — keep finance permissions off durable entitlement
-- unless product explicitly wants standing finance authority. No change here.

COMMIT;

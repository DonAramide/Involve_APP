-- DO NOT APPLY without explicit approval.
-- Extends hw_platform_grants so HMO fee and bank-account permissions
-- can be issued. Route guards already map to existing super_admin / admin_deploy
-- and HMO role permissions in code.

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
      'platform.finance.reconcile',
      'platform.hmo_fees.view',
      'platform.hmo_fees.manage',
      'platform.hmo_fees.approve',
      'platform.withdrawals.approve',
      'platform.bank_accounts.view',
      'platform.bank_accounts.approve',
      'platform.bank_accounts.reject'
    ));
END $$;

COMMIT;

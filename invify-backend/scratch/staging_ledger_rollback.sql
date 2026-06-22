-- ============================================================================
-- Phase 1B Rollback Package: Revert Revenue & Fee sharing Architecture
-- ============================================================================

BEGIN;

-- 1. Remove triggers
DROP TRIGGER IF EXISTS trg_prevent_direct_wallet_mutation ON public.wallets;
DROP TRIGGER IF EXISTS trg_sync_wallet_cache_on_ledger_insert ON public.ledger_entries;
DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON public.ledger_entries;
DROP TRIGGER IF EXISTS trg_prevent_fee_modification ON public.fee_transactions;
DROP TRIGGER IF EXISTS trg_log_tenant_fee_profile_history ON public.tenant_fee_profiles;

-- 2. Drop functions and procedures
DROP FUNCTION IF EXISTS public.post_financial_transaction(UUID, NUMERIC, public.entry_type_enum, VARCHAR, VARCHAR, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.prevent_direct_wallet_mutation() CASCADE;
DROP FUNCTION IF EXISTS public.sync_wallet_cache_on_ledger_insert() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_ledger_modification() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_fee_modification() CASCADE;
DROP FUNCTION IF EXISTS public.log_tenant_fee_profile_history() CASCADE;
DROP PROCEDURE IF EXISTS public.rebuild_wallet_balance(UUID) CASCADE;

-- 3. Drop tables (cascades dependent RLS policies)
DROP TABLE IF EXISTS public.fee_transactions CASCADE;
DROP TABLE IF EXISTS public.tenant_fee_profile_history CASCADE;
DROP TABLE IF EXISTS public.tenant_fee_profiles CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;

-- 4. Drop entry_type ENUM
DROP TYPE IF EXISTS public.entry_type_enum CASCADE;

-- 5. Revert constraints on wallets
ALTER TABLE public.wallets 
  DROP CONSTRAINT IF EXISTS wallets_tenant_id_unique,
  DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;

-- 6. Clean up SYSTEM sentinel entries (Only system-level records, not active merchants)
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.tenants WHERE id = '00000000-0000-0000-0000-000000000001';

COMMIT;

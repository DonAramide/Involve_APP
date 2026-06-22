-- ============================================================================
-- Phase 1D Rollback Package: Revert Operational Treasury & Settlements
-- ============================================================================

BEGIN;

-- Drop Batch Column reference safely
ALTER TABLE public.provider_settlements DROP COLUMN IF EXISTS batch_id CASCADE;

DROP FUNCTION IF EXISTS public.get_treasury_operations_dashboard() CASCADE;
DROP FUNCTION IF EXISTS public.reconcile_treasury_balances(DATE) CASCADE;

DROP TABLE IF EXISTS public.settlement_discrepancies CASCADE;
DROP TABLE IF EXISTS public.provider_balance_snapshots CASCADE;
DROP TABLE IF EXISTS public.provider_clearing_profiles CASCADE;
DROP TABLE IF EXISTS public.provider_settlement_batches CASCADE;
DROP TABLE IF EXISTS public.daily_reconciliation_reports CASCADE;

DROP TYPE IF EXISTS public.reconciliation_status CASCADE;

COMMIT;

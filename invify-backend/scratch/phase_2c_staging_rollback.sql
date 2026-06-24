-- ============================================================================
-- Phase 2C Rollback Package: Revert Banking Execution Layer
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.provider_balance_snapshots CASCADE;
DROP TABLE IF EXISTS public.provider_clearing_profiles CASCADE;
DROP TABLE IF EXISTS public.provider_capabilities CASCADE;

COMMIT;

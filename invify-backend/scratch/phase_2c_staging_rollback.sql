-- ============================================================================
-- Phase 2C Rollback Package: Revert Banking Execution Layer
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.provider_daily_limits CASCADE;
DROP TABLE IF EXISTS public.provider_balance_snapshots CASCADE;
DROP TABLE IF EXISTS public.provider_clearing_profiles CASCADE;
DROP TABLE IF EXISTS public.provider_capabilities CASCADE;

-- Revert provider_health_registry maintenance_mode column
ALTER TABLE public.provider_health_registry 
    DROP COLUMN IF EXISTS maintenance_mode;

COMMIT;

-- ============================================================================
-- Phase 2B Rollback Package: Revert Banking Runtime & Provider Integrations
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_log_provider_health_transition ON public.provider_health_registry CASCADE;
DROP FUNCTION IF EXISTS public.log_provider_health_transition() CASCADE;
DROP FUNCTION IF EXISTS public.evaluate_provider_health(public.banking_provider_enum, BOOLEAN, INTEGER) CASCADE;

DROP TABLE IF EXISTS public.quasar_verification_requests CASCADE;
DROP TABLE IF EXISTS public.provider_credentials CASCADE;
DROP TABLE IF EXISTS public.provider_health_events CASCADE;
DROP TABLE IF EXISTS public.provider_health_registry CASCADE;
DROP TABLE IF EXISTS public.incoming_webhook_logs CASCADE;

-- Note: We do not drop types created conditionally in migration to prevent breaking dependent modules.

COMMIT;

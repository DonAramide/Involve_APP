-- ============================================================================
-- Phase 2D Rollback Package: Revert Real Banking Connectivity Layer
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.quasar_verification_results CASCADE;
DROP TABLE IF EXISTS public.provider_api_audit_logs CASCADE;
DROP TABLE IF EXISTS public.provider_capability_health CASCADE;
DROP TABLE IF EXISTS public.provider_certifications CASCADE;
DROP TABLE IF EXISTS public.provider_bank_mappings CASCADE;
DROP TABLE IF EXISTS public.banks CASCADE;
DROP TABLE IF EXISTS public.provider_environments CASCADE;

DROP TYPE IF EXISTS public.capability_status_enum CASCADE;

COMMIT;

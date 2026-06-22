-- ============================================================================
-- Phase 2A Rollback Package: Revert Banking Infrastructure foundation
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.verify_beneficiary_details(UUID, UUID, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.validate_bank_transfer_transition() CASCADE;
DROP FUNCTION IF EXISTS public.validate_verified_beneficiary() CASCADE;

DROP TABLE IF EXISTS public.bank_transfer_attempts CASCADE;
DROP TABLE IF EXISTS public.bank_transfer_logs CASCADE;
DROP TABLE IF EXISTS public.bank_virtual_accounts CASCADE;
DROP TABLE IF EXISTS public.provider_routing_profiles CASCADE;
DROP TABLE IF EXISTS public.beneficiaries CASCADE;

DROP TYPE IF EXISTS public.virtual_account_type_enum CASCADE;
DROP TYPE IF EXISTS public.banking_provider_enum CASCADE;
DROP TYPE IF EXISTS public.transfer_status_enum CASCADE;

COMMIT;

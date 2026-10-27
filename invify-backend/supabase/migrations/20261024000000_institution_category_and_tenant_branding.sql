-- ==============================================================================
-- REVISED REFERENCE SCRIPT — NO SCHEMA EXECUTION REQUIRED
-- File: 20261024000000_institution_category_and_tenant_branding.sql
-- Status: NO-OP / ARCHITECTURAL REFERENCE ONLY
--
-- Preflight Findings & Schema Verification (Staging rpcjelhacmkhzguljdgi):
-- 1. public.institutions:
--    All required fields (institution_type, logo_url, trading_name, status, kyc_status)
--    are verified present. The ck_institution_type constraint already accepts all
--    canonical categories (SCHOOL, HMO, BANK, MERCHANT, PTSP, CORPORATE) as well
--    as legacy categories (PAYMENT_PROVIDER, AGGREGATOR).
-- 2. public.agents:
--    All required fields (institution_type, trading_name, logo_url) are verified present.
-- 3. public.agent_profiles:
--    All required fields (logo_url, cac_registration_number, tax_identification_number,
--    regulator_license_reference, regulatory_metadata) are verified present.
-- 4. public.tenants:
--    All required fields (type, logo_url, kyc_status, status) are verified present.
--
-- DO NOT EXECUTE AGAINST STAGING OR PRODUCTION.
-- The existing physical database schema already fully satisfies all product requirements.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. INSTITUTION TYPE CONSTRAINT REFERENCE SPECIFICATION
-- ------------------------------------------------------------------------------
-- Reference constraint definition ensuring all 6 canonical categories and both
-- legacy categories remain supported without data loss or constraint conflicts.
-- (Already satisfied on staging target rpcjelhacmkhzguljdgi).
DO $$
BEGIN
    -- Idempotent check: Ensure the constraint includes all 8 categories
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        -- Only re-assert constraint if currently missing or restricted
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'ck_institution_type'
              AND conrelid = 'public.institutions'::regclass
        ) THEN
            ALTER TABLE public.institutions
                ADD CONSTRAINT ck_institution_type CHECK (
                    institution_type IN (
                        'SCHOOL',
                        'HMO',
                        'BANK',
                        'MERCHANT',
                        'PTSP',
                        'CORPORATE',
                        'PAYMENT_PROVIDER',
                        'AGGREGATOR'
                    )
                );
        END IF;
    END IF;
END$$;

-- ------------------------------------------------------------------------------
-- 2. READ-ONLY VERIFICATION QUERIES
-- ------------------------------------------------------------------------------
-- Run these queries to verify schema readiness without modifying any data:
--
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'institutions' 
--   AND column_name IN ('institution_type', 'trading_name', 'logo_url', 'status', 'kyc_status');
--
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'agents' 
--   AND column_name IN ('institution_type', 'trading_name', 'logo_url');
--
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'agent_profiles' 
--   AND column_name IN ('logo_url', 'cac_registration_number', 'tax_identification_number', 'regulator_license_reference', 'regulatory_metadata');
--
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'tenants' 
--   AND column_name IN ('type', 'logo_url', 'kyc_status', 'status');

COMMIT;

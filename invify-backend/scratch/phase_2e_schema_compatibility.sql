-- PHASE 2E SCHEMA COMPATIBILITY MIGRATION
-- Safely aligns provider_credentials table to include required provider, environment, status, constraints and indices

-- 1. Ensure public.banking_provider_enum exists (pre-requisite check)
-- (It should exist, but this check ensures compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'banking_provider_enum') THEN
        CREATE TYPE public.banking_provider_enum AS ENUM ('PROVIDUS', 'WEMA', 'PAYSTACK', 'FLUTTERWAVE');
    END IF;
END
$$;

-- 2. Add provider column safely if it is missing
ALTER TABLE public.provider_credentials 
    ADD COLUMN IF NOT EXISTS provider public.banking_provider_enum;

-- 3. Backfill provider column for any existing records to 'PROVIDUS' before applying NOT NULL
UPDATE public.provider_credentials 
SET provider = 'PROVIDUS' 
WHERE provider IS NULL;

-- 4. Apply NOT NULL constraint on provider
ALTER TABLE public.provider_credentials 
    ALTER COLUMN provider SET NOT NULL;

-- 5. Add environment column safely with default
ALTER TABLE public.provider_credentials 
    ADD COLUMN IF NOT EXISTS environment VARCHAR(50) NOT NULL DEFAULT 'staging';

-- 6. Add status column safely if missing
ALTER TABLE public.provider_credentials 
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' 
    CHECK (status IN ('ACTIVE', 'ROTATING', 'RETIRED', 'COMPROMISED'));

-- 7. Drop obsolete unique constraints if they exist
ALTER TABLE public.provider_credentials 
    DROP CONSTRAINT IF EXISTS uq_provider_key_version,
    DROP CONSTRAINT IF EXISTS uq_provider_env_key_version;

-- 8. Add unique constraint for (provider, environment, key_version)
ALTER TABLE public.provider_credentials 
    ADD CONSTRAINT uq_provider_env_key_version UNIQUE (provider, environment, key_version);

-- 9. Recreate partial unique index to ensure only one active credential per provider/environment combination
DROP INDEX IF EXISTS public.uq_provider_active_credential;
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_active_credential 
    ON public.provider_credentials (provider, environment) 
    WHERE (is_active = true);

-- ============================================================================
-- Phase 2D Staging DDL Migration Package (Hardened Connectivity V4)
-- Real Banking Connectivity Layer
-- ============================================================================

BEGIN;

-- Drop existing tables to allow safe execution loop
DROP TABLE IF EXISTS public.quasar_verification_results CASCADE;
DROP TABLE IF EXISTS public.provider_api_audit_logs CASCADE;
DROP TABLE IF EXISTS public.provider_capability_health CASCADE;
DROP TABLE IF EXISTS public.provider_certifications CASCADE;
DROP TABLE IF EXISTS public.provider_bank_mappings CASCADE;
DROP TABLE IF EXISTS public.banks CASCADE;
DROP TABLE IF EXISTS public.provider_environments CASCADE;

-- 1. Create Enums Safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capability_status_enum') THEN
        CREATE TYPE public.capability_status_enum AS ENUM ('HEALTHY', 'DEGRADED', 'UNAVAILABLE');
    END IF;
END$$;

-- 2. Provider Environment Registry
CREATE TABLE public.provider_environments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider                    public.banking_provider_enum NOT NULL,
    environment                 VARCHAR(50) NOT NULL DEFAULT 'staging',
    base_url                    VARCHAR(255) NOT NULL,
    is_active                   BOOLEAN NOT NULL DEFAULT true,
    supports_live_funds         BOOLEAN NOT NULL DEFAULT false,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_provider_env UNIQUE (provider, environment)
);

-- 3. Versioned Banks Registry (supports NIBSS changes)
CREATE TABLE public.banks (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip_bank_code               VARCHAR(10) NOT NULL,
    bank_name                   VARCHAR(150) NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    effective_from              TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_bank_code_version UNIQUE (nip_bank_code, version)
);

-- Enforce bank version integrity: Only one active bank version may exist where effective_to IS NULL
CREATE UNIQUE INDEX uq_active_bank_version 
    ON public.banks (nip_bank_code) 
    WHERE (effective_to IS NULL);

-- 4. Provider Specific Bank Mappings
CREATE TABLE public.provider_bank_mappings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id                     UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
    provider                    public.banking_provider_enum NOT NULL,
    provider_bank_code          VARCHAR(20) NOT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_provider_bank_map UNIQUE (bank_id, provider)
);

-- 5. Provider Capability Certification Registry
CREATE TABLE public.provider_certifications (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider                    public.banking_provider_enum NOT NULL,
    environment                 VARCHAR(50) NOT NULL DEFAULT 'staging',
    capability                  public.provider_capability_enum NOT NULL,
    certification_status        public.certification_status_enum NOT NULL DEFAULT 'PENDING',
    certified_at                TIMESTAMPTZ,
    certified_by                UUID REFERENCES public.users(id),
    notes                       TEXT,
    
    CONSTRAINT uq_provider_cert UNIQUE (provider, environment, capability),
    CONSTRAINT fk_provider_cert_env FOREIGN KEY (provider, environment) REFERENCES public.provider_environments(provider, environment) ON DELETE CASCADE
);

-- 6. Provider Capability Health (Environment Isolated)
CREATE TABLE public.provider_capability_health (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider                    public.banking_provider_enum NOT NULL,
    environment                 VARCHAR(50) NOT NULL DEFAULT 'staging',
    capability                  public.provider_capability_enum NOT NULL,
    status                      public.capability_status_enum NOT NULL DEFAULT 'HEALTHY',
    last_checked_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_provider_cap_health UNIQUE (provider, environment, capability),
    CONSTRAINT fk_provider_cap_health_env FOREIGN KEY (provider, environment) REFERENCES public.provider_environments(provider, environment) ON DELETE CASCADE
);

-- 7. Provider API Audit Logs (hashed/no sensitive credentials, type classified)
CREATE TABLE public.provider_api_audit_logs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider                    public.banking_provider_enum NOT NULL,
    capability                  public.provider_capability_enum NOT NULL,
    financial_event_id          UUID REFERENCES public.financial_events(id) ON DELETE SET NULL,
    request_hash                VARCHAR(64) NOT NULL,
    response_hash               VARCHAR(64) NOT NULL,
    status_code                 INTEGER NOT NULL,
    latency_ms                  INTEGER NOT NULL,
    request_type                VARCHAR(50) NOT NULL CHECK (request_type IN ('NAME_ENQUIRY', 'TRANSFER', 'WEBHOOK', 'VA_CREATION', 'TRANSFER_STATUS', 'SETTLEMENT_IMPORT')),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Operational indexes for provider_api_audit_logs
CREATE INDEX idx_provider_api_audit_logs_event_id ON public.provider_api_audit_logs (financial_event_id);
CREATE INDEX idx_provider_api_audit_logs_provider_cap ON public.provider_api_audit_logs (provider, capability);
CREATE INDEX idx_provider_api_audit_logs_created_at ON public.provider_api_audit_logs (created_at DESC);

-- 8. Quasar Verification Results Registry
CREATE TABLE public.quasar_verification_results (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_request_id     UUID NOT NULL REFERENCES public.quasar_verification_requests(id) ON DELETE CASCADE,
    result_status               VARCHAR(50) NOT NULL CHECK (result_status IN ('VERIFIED', 'EXPIRED', 'FAILED')),
    reason_code                 VARCHAR(100) NOT NULL,
    response_payload_hash       VARCHAR(64) NOT NULL,
    decision_type               VARCHAR(50) NOT NULL CHECK (decision_type IN ('APPROVED', 'TREASURY_REJECTED', 'LIQUIDITY_REJECTED', 'RISK_REJECTED', 'PROVIDER_REJECTED')),
    verified_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_quasar_verification_request UNIQUE (verification_request_id)
);

-- Operational index for quasar_verification_results
CREATE INDEX idx_quasar_verification_results_verified_at ON public.quasar_verification_results (verified_at DESC);

-- Seed default environments and baseline certified registry items in PENDING state
INSERT INTO public.provider_environments (provider, environment, base_url, is_active, supports_live_funds)
VALUES
    ('PROVIDUS', 'staging', 'https://api-staging.providusbank.com', true, false),
    ('WEMA', 'staging', 'https://partnerapi-staging.alat.ng', true, false),
    ('PAYSTACK', 'staging', 'https://api.paystack.co', true, false),
    ('FLUTTERWAVE', 'staging', 'https://api.flutterwave.com/v3', true, false)
ON CONFLICT (provider, environment) DO UPDATE
SET base_url = EXCLUDED.base_url, is_active = EXCLUDED.is_active;

INSERT INTO public.provider_certifications (provider, environment, capability, certification_status)
VALUES
    ('PROVIDUS', 'staging', 'VIRTUAL_ACCOUNT', 'PENDING'),
    ('PROVIDUS', 'staging', 'NAME_ENQUIRY', 'PENDING'),
    ('PROVIDUS', 'staging', 'TRANSFER', 'PENDING'),
    ('WEMA', 'staging', 'VIRTUAL_ACCOUNT', 'PENDING'),
    ('WEMA', 'staging', 'NAME_ENQUIRY', 'PENDING'),
    ('WEMA', 'staging', 'TRANSFER', 'PENDING'),
    ('PAYSTACK', 'staging', 'VIRTUAL_ACCOUNT', 'PENDING'),
    ('PAYSTACK', 'staging', 'NAME_ENQUIRY', 'PENDING'),
    ('PAYSTACK', 'staging', 'TRANSFER', 'PENDING'),
    ('FLUTTERWAVE', 'staging', 'VIRTUAL_ACCOUNT', 'PENDING'),
    ('FLUTTERWAVE', 'staging', 'NAME_ENQUIRY', 'PENDING'),
    ('FLUTTERWAVE', 'staging', 'TRANSFER', 'PENDING')
ON CONFLICT (provider, environment, capability) DO UPDATE
SET certification_status = EXCLUDED.certification_status;

INSERT INTO public.provider_capability_health (provider, environment, capability, status)
VALUES
    ('PROVIDUS', 'staging', 'VIRTUAL_ACCOUNT', 'HEALTHY'),
    ('PROVIDUS', 'staging', 'NAME_ENQUIRY', 'HEALTHY'),
    ('PROVIDUS', 'staging', 'TRANSFER', 'HEALTHY'),
    ('WEMA', 'staging', 'VIRTUAL_ACCOUNT', 'HEALTHY'),
    ('WEMA', 'staging', 'NAME_ENQUIRY', 'HEALTHY'),
    ('WEMA', 'staging', 'TRANSFER', 'HEALTHY'),
    ('PAYSTACK', 'staging', 'VIRTUAL_ACCOUNT', 'HEALTHY'),
    ('PAYSTACK', 'staging', 'NAME_ENQUIRY', 'HEALTHY'),
    ('PAYSTACK', 'staging', 'TRANSFER', 'HEALTHY'),
    ('FLUTTERWAVE', 'staging', 'VIRTUAL_ACCOUNT', 'HEALTHY'),
    ('FLUTTERWAVE', 'staging', 'NAME_ENQUIRY', 'HEALTHY'),
    ('FLUTTERWAVE', 'staging', 'TRANSFER', 'HEALTHY')
ON CONFLICT (provider, environment, capability) DO UPDATE
SET status = EXCLUDED.status;

COMMIT;

-- ============================================================================
-- Phase 2A Staging DDL Migration Package (Hardened Amendments)
-- Banking Infrastructure Foundation
-- ============================================================================

BEGIN;

-- Drop existing tables to allow safe iteration loops
DROP TABLE IF EXISTS public.bank_transfer_attempts CASCADE;
DROP TABLE IF EXISTS public.bank_transfer_logs CASCADE;
DROP TABLE IF EXISTS public.bank_virtual_accounts CASCADE;
DROP TABLE IF EXISTS public.provider_routing_profiles CASCADE;
DROP TABLE IF EXISTS public.beneficiaries CASCADE;

DROP TYPE IF EXISTS public.virtual_account_type_enum CASCADE;
DROP TYPE IF EXISTS public.banking_provider_enum CASCADE;
DROP TYPE IF EXISTS public.transfer_status_enum CASCADE;

-- 1. Create Enums
CREATE TYPE public.virtual_account_type_enum AS ENUM ('STATIC', 'DYNAMIC');
CREATE TYPE public.banking_provider_enum AS ENUM ('PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA');
CREATE TYPE public.transfer_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'INVESTIGATION', 'REVERSAL_PENDING', 'REVERSED', 'CANCELLED');

-- 2. Beneficiary Registry (with verification audit trails)
CREATE TABLE public.beneficiaries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    bank_code               VARCHAR(5) NOT NULL,
    account_number          VARCHAR(20) NOT NULL,
    account_name            VARCHAR(255) NOT NULL,
    is_verified             BOOLEAN NOT NULL DEFAULT false,
    verified_at             TIMESTAMPTZ,
    
    verified_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verification_provider   VARCHAR(50),
    verification_reference  VARCHAR(255),
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_tenant_beneficiary UNIQUE (tenant_id, bank_code, account_number)
);

-- 3. Provider Routing Profiles
CREATE TABLE public.provider_routing_profiles (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    preferred_va_provider         public.banking_provider_enum NOT NULL,
    preferred_transfer_provider   public.banking_provider_enum NOT NULL,
    preferred_settlement_provider public.banking_provider_enum NOT NULL,
    priority_order                public.banking_provider_enum[] NOT NULL DEFAULT '{"PROVIDUS", "WEMA", "PAYSTACK", "FLUTTERWAVE"}'::public.banking_provider_enum[],
    is_active                     BOOLEAN NOT NULL DEFAULT true,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_tenant_routing_profile UNIQUE (tenant_id)
);

-- 4. Bank Virtual Accounts Registry (with dynamic session/event reference lineages)
CREATE TABLE public.bank_virtual_accounts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    account_type            public.virtual_account_type_enum NOT NULL,
    provider                public.banking_provider_enum NOT NULL,
    bank_name               VARCHAR(100) NOT NULL,
    account_number          VARCHAR(20) NOT NULL,
    account_name            VARCHAR(255) NOT NULL,
    expires_at              TIMESTAMPTZ, -- dynamic allocation expiration
    
    financial_event_id      UUID REFERENCES public.financial_events(id) ON DELETE SET NULL,
    reference_type          VARCHAR(50),
    reference_id            UUID,
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_provider_account UNIQUE (provider, account_number)
);

-- 5. Outward Transfer Logs
CREATE TABLE public.bank_transfer_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    financial_event_id      UUID NOT NULL REFERENCES public.financial_events(id) ON DELETE RESTRICT,
    beneficiary_id          UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE RESTRICT,
    provider                public.banking_provider_enum NOT NULL,
    amount                  NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    status                  public.transfer_status_enum NOT NULL DEFAULT 'PENDING',
    
    currency                VARCHAR(3) NOT NULL DEFAULT 'NGN',
    fee_amount              NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (fee_amount >= 0),
    net_amount              NUMERIC(15,2) NOT NULL CHECK (net_amount > 0),
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT chk_net_amount_snapshot CHECK (net_amount = amount - fee_amount)
);

-- 6. Outward Transfer Retry/Failover Attempt Registry
CREATE TABLE public.bank_transfer_attempts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_log_id         UUID NOT NULL REFERENCES public.bank_transfer_logs(id) ON DELETE CASCADE,
    attempt_number          INTEGER NOT NULL CHECK (attempt_number > 0),
    provider                public.banking_provider_enum NOT NULL,
    provider_reference      VARCHAR(255) NOT NULL,
    status                  public.transfer_status_enum NOT NULL DEFAULT 'PENDING',
    error_code              VARCHAR(100),
    error_message           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_transfer_attempt UNIQUE (transfer_log_id, attempt_number),
    CONSTRAINT uq_provider_attempt_ref UNIQUE (provider, provider_reference)
);

-- 7. Name Validation Helper Function
CREATE OR REPLACE FUNCTION public.verify_beneficiary_details(
    p_beneficiary_id UUID, 
    p_admin_user UUID,
    p_verification_provider VARCHAR(50),
    p_verification_reference VARCHAR(255)
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.beneficiaries
    SET is_verified = true,
        verified_at = now(),
        verified_by = p_admin_user,
        verification_provider = p_verification_provider,
        verification_reference = p_verification_reference
    WHERE id = p_beneficiary_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Verified Beneficiary Enforcement Trigger
CREATE OR REPLACE FUNCTION public.validate_verified_beneficiary()
RETURNS TRIGGER AS $$
DECLARE
    v_is_verified BOOLEAN;
BEGIN
    SELECT is_verified INTO v_is_verified
    FROM public.beneficiaries
    WHERE id = NEW.beneficiary_id;
    
    IF NOT COALESCE(v_is_verified, false) THEN
        RAISE EXCEPTION 'Transaction blocked. Beneficiary profile is not verified.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_verified_beneficiary
    BEFORE INSERT ON public.bank_transfer_logs
    FOR EACH ROW EXECUTE FUNCTION public.validate_verified_beneficiary();

-- 9. Transfer Lifecycle Transition Validator
CREATE OR REPLACE FUNCTION public.validate_bank_transfer_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NOT (
            (OLD.status = 'PENDING' AND NEW.status = 'PROCESSING') OR
            (OLD.status = 'PENDING' AND NEW.status = 'CANCELLED') OR
            (OLD.status = 'PROCESSING' AND NEW.status = 'CANCELLED') OR
            (OLD.status = 'PROCESSING' AND NEW.status = 'SUCCESS') OR
            (OLD.status = 'PROCESSING' AND NEW.status = 'FAILED') OR
            (OLD.status = 'PROCESSING' AND NEW.status = 'INVESTIGATION') OR
            (OLD.status = 'FAILED' AND NEW.status = 'INVESTIGATION') OR
            (OLD.status = 'INVESTIGATION' AND NEW.status = 'REVERSAL_PENDING') OR
            (OLD.status = 'REVERSAL_PENDING' AND NEW.status = 'REVERSED')
        ) THEN
            RAISE EXCEPTION 'Illegal bank transfer state transition from % to %', OLD.status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_bank_transfer_transition
    BEFORE UPDATE ON public.bank_transfer_logs
    FOR EACH ROW EXECUTE FUNCTION public.validate_bank_transfer_transition();

CREATE INDEX idx_transfers_event ON public.bank_transfer_logs(financial_event_id);
CREATE INDEX idx_vas_tenant ON public.bank_virtual_accounts(tenant_id);

COMMIT;

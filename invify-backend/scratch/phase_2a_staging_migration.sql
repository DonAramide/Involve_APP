-- ============================================================================
-- Phase 2A Staging DDL Migration Package
-- Banking Infrastructure Foundation
-- ============================================================================

BEGIN;

-- Drop existing tables to allow safe iteration loops
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
CREATE TYPE public.transfer_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'INVESTIGATION', 'REVERSAL_PENDING', 'REVERSED');

-- 2. Beneficiary Registry
CREATE TABLE public.beneficiaries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    bank_code               VARCHAR(5) NOT NULL,
    account_number          VARCHAR(20) NOT NULL,
    account_name            VARCHAR(255) NOT NULL,
    is_verified             BOOLEAN NOT NULL DEFAULT false,
    verified_at             TIMESTAMPTZ,
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

-- 4. Bank Virtual Accounts Registry
CREATE TABLE public.bank_virtual_accounts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    account_type            public.virtual_account_type_enum NOT NULL,
    provider                public.banking_provider_enum NOT NULL,
    bank_name               VARCHAR(100) NOT NULL,
    account_number          VARCHAR(20) NOT NULL,
    account_name            VARCHAR(255) NOT NULL,
    expires_at              TIMESTAMPTZ, -- dynamic allocation expiration
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
    provider_reference      VARCHAR(255) UNIQUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Name Validation Helper Function
CREATE OR REPLACE FUNCTION public.verify_beneficiary_details(p_beneficiary_id UUID, p_admin_user UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.beneficiaries
    SET is_verified = true,
        verified_at = now()
    WHERE id = p_beneficiary_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Transfer Lifecycle Transition Validator
CREATE OR REPLACE FUNCTION public.validate_bank_transfer_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NOT (
            (OLD.status = 'PENDING' AND NEW.status = 'PROCESSING') OR
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

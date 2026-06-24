-- ============================================================================
-- Phase 2C Staging DDL Migration Package
-- Banking Execution Layer
-- ============================================================================

BEGIN;

-- Drop existing tables to allow safe execution loop
DROP TABLE IF EXISTS public.provider_balance_snapshots CASCADE;
DROP TABLE IF EXISTS public.provider_clearing_profiles CASCADE;
DROP TABLE IF EXISTS public.provider_capabilities CASCADE;

-- 1. Provider Capability Registry
CREATE TABLE public.provider_capabilities (
    provider                    public.banking_provider_enum PRIMARY KEY,
    supports_virtual_accounts   BOOLEAN NOT NULL DEFAULT false,
    supports_name_enquiry       BOOLEAN NOT NULL DEFAULT false,
    supports_nip_transfer       BOOLEAN NOT NULL DEFAULT false,
    supports_bulk_transfer       BOOLEAN NOT NULL DEFAULT false,
    supports_webhooks           BOOLEAN NOT NULL DEFAULT false,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Provider Clearing & Fee Profiles
CREATE TABLE public.provider_clearing_profiles (
    provider                    public.banking_provider_enum PRIMARY KEY REFERENCES public.provider_capabilities(provider) ON DELETE CASCADE,
    transfer_fee_flat           NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (transfer_fee_flat >= 0),
    transfer_fee_percent        NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (transfer_fee_percent >= 0),
    min_transfer_limit          NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (min_transfer_limit >= 0),
    max_transfer_limit          NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (max_transfer_limit >= min_transfer_limit),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Provider Dynamic Liquidity Balance snapshots
CREATE TABLE public.provider_balance_snapshots (
    provider                    public.banking_provider_enum PRIMARY KEY REFERENCES public.provider_capabilities(provider) ON DELETE CASCADE,
    available_balance           NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    currency                    VARCHAR(3) NOT NULL DEFAULT 'NGN',
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Seed default capacities, pricing, and balances for all 4 gateways
INSERT INTO public.provider_capabilities (provider, supports_virtual_accounts, supports_name_enquiry, supports_nip_transfer, supports_bulk_transfer, supports_webhooks)
VALUES 
    ('PROVIDUS', true, true, true, false, true),
    ('WEMA', true, true, true, true, true),
    ('PAYSTACK', true, true, true, false, true),
    ('FLUTTERWAVE', true, true, true, true, true)
ON CONFLICT (provider) DO UPDATE 
SET supports_virtual_accounts = EXCLUDED.supports_virtual_accounts,
    supports_name_enquiry = EXCLUDED.supports_name_enquiry,
    supports_nip_transfer = EXCLUDED.supports_nip_transfer,
    supports_bulk_transfer = EXCLUDED.supports_bulk_transfer,
    supports_webhooks = EXCLUDED.supports_webhooks;

INSERT INTO public.provider_clearing_profiles (provider, transfer_fee_flat, transfer_fee_percent, min_transfer_limit, max_transfer_limit)
VALUES
    ('PROVIDUS', 10.00, 0.00, 100.00, 5000000.00),
    ('WEMA', 15.00, 0.00, 100.00, 5000000.00),
    ('PAYSTACK', 20.00, 0.00, 100.00, 2000000.00),
    ('FLUTTERWAVE', 25.00, 0.00, 100.00, 2000000.00)
ON CONFLICT (provider) DO UPDATE 
SET transfer_fee_flat = EXCLUDED.transfer_fee_flat,
    min_transfer_limit = EXCLUDED.min_transfer_limit,
    max_transfer_limit = EXCLUDED.max_transfer_limit;

INSERT INTO public.provider_balance_snapshots (provider, available_balance, currency)
VALUES
    ('PROVIDUS', 5000000.00, 'NGN'),
    ('WEMA', 5000000.00, 'NGN'),
    ('PAYSTACK', 3000000.00, 'NGN'),
    ('FLUTTERWAVE', 2000000.00, 'NGN')
ON CONFLICT (provider) DO UPDATE 
SET available_balance = EXCLUDED.available_balance;

COMMIT;

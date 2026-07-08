-- PHASE 2E STAGING MIGRATION
-- Incorporates Quasar Authorization consumption tracking and seeds initial provider credentials for the staging environment

-- Add consumed_at and execution_reference to quasar_verification_results to enforce authorization consumption protection
ALTER TABLE public.quasar_verification_results 
    ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS execution_reference UUID;

-- Seed credentials for sandbox providers if they do not exist, specifying environment='staging'
INSERT INTO public.provider_credentials (provider, environment, key_version, public_key, vault_key_reference, is_active, status)
VALUES 
    ('PROVIDUS', 'staging', 'providus_v1', 'providus-mock-pubkey', 'vault:providus-secret-key-v1', true, 'ACTIVE'),
    ('WEMA', 'staging', 'wema_v1', 'wema-mock-pubkey', 'vault:wema-secret-key-v1', true, 'ACTIVE'),
    ('PAYSTACK', 'staging', 'paystack_v1', 'paystack-mock-pubkey', 'vault:paystack-secret-key-v1', true, 'ACTIVE'),
    ('FLUTTERWAVE', 'staging', 'flutterwave_v1', 'flutterwave-mock-pubkey', 'vault:flutterwave-secret-key-v1', true, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- PHASE 2E ROLLBACK MIGRATION
ALTER TABLE public.quasar_verification_results DROP COLUMN IF EXISTS consumed_at;
ALTER TABLE public.quasar_verification_results DROP COLUMN IF EXISTS execution_reference;
DELETE FROM public.provider_credentials WHERE key_version IN ('providus_v1', 'wema_v1', 'paystack_v1', 'flutterwave_v1') AND environment = 'staging';

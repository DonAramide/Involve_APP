-- Seed the missing commissions settings into system_configurations table.
-- Phase 32C.2R.3: requires baseline objects public.config_value_type + public.system_configurations
-- (provided by 20260601000000_phase32c2r3_production_baseline.sql). Configuration only — no tenant/business money rows.
INSERT INTO public.system_configurations (config_key, config_value, value_type, category, description, is_system_reserved, requires_restart)
VALUES 
('commissions', '{"globalDefaultOnboardingFee": 10, "globalDefaultRevSharePercentage": 5}'::jsonb, 'json', 'COMMISSION', 'Global default onboarding fee and revenue share percentages', true, false)
ON CONFLICT (config_key) DO NOTHING;

-- Seed the missing commissions settings into system_configurations table
INSERT INTO public.system_configurations (config_key, config_value, value_type, category, description, is_system_reserved, requires_restart)
VALUES 
('commissions', '{"globalDefaultOnboardingFee": 10, "globalDefaultRevSharePercentage": 5}'::jsonb, 'json', 'COMMISSION', 'Global default onboarding fee and revenue share percentages', true, false)
ON CONFLICT (config_key) DO NOTHING;

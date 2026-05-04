-- 1. Create Usage Limits Configuration (System Data)
CREATE TABLE IF NOT EXISTS usage_limits (
    plan TEXT PRIMARY KEY, -- 'free', 'basic', 'premium'
    monthly_ai_limit INTEGER NOT NULL,
    price_ngn NUMERIC(10, 2) NOT NULL,
    features_enabled JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Seed Pricing & Limits
INSERT INTO usage_limits (plan, monthly_ai_limit, price_ngn, features_enabled)
VALUES 
('free', 20, 0.00, '{"curriculum": true, "notes_view": true, "global_cache": true, "export_pdf": true, "ai_gen": "limited"}'),
('basic', 200, 5000.00, '{"curriculum": true, "notes_view": true, "global_cache": true, "export_pdf": true, "ai_gen": "full", "teacher_dashboard": true}'),
('premium', 1000, 15000.00, '{"curriculum": true, "notes_view": true, "global_cache": true, "export_pdf": true, "ai_gen": "unlimited", "priority": true, "analytics": true}')
ON CONFLICT (plan) DO UPDATE SET 
monthly_ai_limit = EXCLUDED.monthly_ai_limit,
price_ngn = EXCLUDED.price_ngn,
features_enabled = EXCLUDED.features_enabled;

-- 3. Update Subscriptions Table Structure
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
ALTER COLUMN plan SET DEFAULT 'free',
ALTER COLUMN status SET DEFAULT 'active';

-- Ensure every tenant has a default free subscription if none exists
INSERT INTO subscriptions (tenant_id, plan, status, start_date, end_date)
SELECT id, 'free', 'active', NOW(), NOW() + INTERVAL '100 years'
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 1. Enhance AI Usage for Instrumentation
ALTER TABLE ai_usage 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'cache')),
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT 0;

-- 2. Add Onboarding timestamp to Tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- 3. Optimized Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_source ON ai_usage(source);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_tenants_onboarded ON tenants(onboarded_at);
CREATE INDEX IF NOT EXISTS idx_subs_active ON subscriptions(status, end_date);

-- 1. Enhance activity tracking for Retention
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Prevent Spam: Retention Notification Tracking
CREATE TABLE IF NOT EXISTS retention_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    milestone TEXT NOT NULL, -- e.g. '2_day_nudge', '5_day_warning', '10_day_reengagement'
    notified_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, milestone)
);

-- 3. Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_login ON users(last_login_at);

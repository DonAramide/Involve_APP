-- backend/database/invify_enterprise_orchestration_schema.sql
-- Enterprise Multi-Tenant Module Provisioning, Subscription Tiers & Experience Orchestration Engine
-- Supports scaling industry topologies across: retail, school, logistics, healthcare, finance, hospitality, fleet_operations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. EXPANDED INDUSTRY DOMAIN SCHEMA ALTERATIONS
-- ============================================================================
-- Safely alter the base tenants check constraints to support expanded verticals
DO $$ 
BEGIN
    ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_type_check;
EXCEPTION
    WHEN OTHERS THEN
        -- Handle gracefully if table doesn't exist yet
END $$;

-- If table does not exist natively, ensure base creation matches updated criteria
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('retail', 'school', 'logistics', 'healthcare', 'finance', 'hospitality', 'fleet_operations', 'service')),
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-apply explicit check bounds if table already populated
ALTER TABLE tenants ADD CONSTRAINT tenants_type_check 
    CHECK (type IN ('retail', 'school', 'logistics', 'healthcare', 'finance', 'hospitality', 'fleet_operations', 'service'));


-- ============================================================================
-- 2. MASTER SUBSCRIPTION TIERS ARCHITECTURE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_tiers (
    tier_id TEXT PRIMARY KEY, -- 'FREE', 'PRO', 'ENTERPRISE', 'CUSTOM_FEDERATION'
    tier_name TEXT NOT NULL,
    monthly_pricing_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_active_operators INTEGER NOT NULL DEFAULT 3,
    max_active_vehicles INTEGER NOT NULL DEFAULT 0,
    max_monthly_api_calls BIGINT NOT NULL DEFAULT 10000,
    max_ai_tokens_month INTEGER NOT NULL DEFAULT 5000,
    included_base_modules JSONB NOT NULL DEFAULT '["audit_trail", "auth_core", "operator_mgmt", "base_analytics", "notifications", "billing_profile"]',
    custom_federation_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-seed authoritative baseline configurations
INSERT INTO subscription_tiers (tier_id, tier_name, monthly_pricing_usd, max_active_operators, max_active_vehicles, max_monthly_api_calls, max_ai_tokens_month, included_base_modules, custom_federation_allowed)
VALUES 
('FREE', 'Hybrid Core Free Tier', 0.00, 3, 2, 5000, 2000, '["audit_trail", "auth_core", "operator_mgmt", "base_analytics", "notifications", "billing_profile"]', FALSE),
('PRO', 'Invify Professional Operations', 99.00, 25, 50, 500000, 50000, '["audit_trail", "auth_core", "operator_mgmt", "base_analytics", "notifications", "billing_profile", "pos_billing", "fleet_tracking", "curriculum_matrix"]', FALSE),
('ENTERPRISE', 'Unrestricted Operations Ecosystem', 499.00, 999999, 5000, 50000000, 2000000, '["audit_trail", "auth_core", "operator_mgmt", "base_analytics", "notifications", "billing_profile", "pos_billing", "fleet_tracking", "curriculum_matrix", "ai_copilot", "patient_records", "room_service", "dispatch_telemetry"]', TRUE),
('CUSTOM_FEDERATION', 'Dedicated High-Assurance Hybrid Matrix', 1299.00, 999999, 999999, 9999999999, 99999999, '["*"]', TRUE)
ON CONFLICT (tier_id) DO UPDATE SET
    included_base_modules = EXCLUDED.included_base_modules,
    max_active_operators = EXCLUDED.max_active_operators,
    max_active_vehicles = EXCLUDED.max_active_vehicles;


-- ============================================================================
-- 3. TENANT MODULE ALLOCATIONS & RBAC GOVERNANCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_identifier TEXT NOT NULL, -- e.g., 'ai_copilot', 'fleet_tracking', 'pos_billing', 'patient_records', 'room_service', 'curriculum_matrix'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    provisioned_at TIMESTAMPTZ DEFAULT NOW(),
    provisioned_by TEXT DEFAULT 'SYSTEM_ONBOARDING',
    required_rbac_capability TEXT NOT NULL, -- Capability string checked natively server-side
    custom_config JSONB DEFAULT '{}',
    UNIQUE(tenant_id, module_identifier)
);


-- ============================================================================
-- 4. GRANULAR TENANT FEATURE FLAGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL, -- e.g., 'enable_realtime_gps', 'enable_sso_federation', 'enable_offline_pos_sync', 'enable_canary_insights'
    flag_value BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, flag_key)
);


-- ============================================================================
-- 5. DYNAMIC BRANDING & THEME ORCHESTRATION PROFILES
-- ============================================================================
-- Satisfies authoritative rule: Deliver JSON theme tokens, cache locally with tenant version hashes
CREATE TABLE IF NOT EXISTS tenant_branding_profiles (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    theme_tokens JSONB NOT NULL DEFAULT '{
        "primary": "#22b8cf",
        "secondary": "#4c6ef5",
        "accent": "#fab005",
        "darkBg": "#07090b",
        "cardBg": "#0e1216",
        "fontFamily": "Inter, Roboto, sans-serif"
    }',
    logo_url TEXT DEFAULT '/assets/invify-logo-default.svg',
    company_display_name TEXT,
    layout_mode TEXT DEFAULT 'standard_sidebar', -- 'standard_sidebar', 'compact_mobile', 'full_dashboard'
    version_hash TEXT NOT NULL DEFAULT md5(random()::text),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- 6. REALTIME USAGE QUOTA TELEMETRY & ENFORCEMENT COUNTERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_usage_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    billing_period_month TEXT NOT NULL, -- e.g., '2026-05'
    metric_identifier TEXT NOT NULL, -- 'active_vehicles', 'active_operators', 'api_calls', 'ai_tokens'
    current_value BIGINT NOT NULL DEFAULT 0,
    threshold_limit BIGINT NOT NULL DEFAULT 0,
    enforcement_state TEXT NOT NULL DEFAULT 'NORMAL', -- 'NORMAL', 'WARNING_LOW', 'DOWNGRADE_READONLY', 'SUSPENDED'
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, billing_period_month, metric_identifier)
);


-- ============================================================================
-- 7. COMMERCIAL BILLING INTEGRATION PREPARATION
-- ============================================================================
-- Prepare architecture natively supporting automated invoicing, metered feeds, and multi-gateway mapping
CREATE TABLE IF NOT EXISTS tenant_billing_profiles (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    assigned_tier_id TEXT REFERENCES subscription_tiers(tier_id),
    stripe_customer_id TEXT,
    paystack_customer_code TEXT,
    flutterwave_customer_id TEXT,
    is_auto_renewal_active BOOLEAN DEFAULT TRUE,
    current_billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
    current_billing_cycle_end TIMESTAMPTZ,
    metered_feed_references JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- 8. PERFORMANCE INDEXES & AUDIT STAMPS
-- ============================================================================
CREATE INDEX idx_tenant_modules_lookup ON tenant_modules(tenant_id, is_active);
CREATE INDEX idx_tenant_flags_lookup ON tenant_feature_flags(tenant_id, flag_value);
CREATE INDEX idx_usage_quotas_lookup ON tenant_usage_quotas(tenant_id, billing_period_month);

-- Optional Row Level Security (RLS) policies mapping isolation controls
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_quotas ENABLE ROW LEVEL SECURITY;

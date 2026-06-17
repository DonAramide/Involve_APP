-- 016_integration_vault_migration.sql

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: integration_vault
-- Acts as the registry for external services
CREATE TABLE IF NOT EXISTS integration_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_identifier VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'meta_whatsapp', 'quasar_core', 'lesson_ai'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- e.g., 'COMMUNICATIONS', 'PAYMENTS', 'AI', 'POS'
    scope VARCHAR(50) NOT NULL DEFAULT 'GLOBAL', -- 'GLOBAL' or 'TENANT'
    tenant_id UUID DEFAULT NULL, -- Null for GLOBAL, populated for TENANT
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: integration_credentials
-- Stores the actual secrets securely with versioning
CREATE TABLE IF NOT EXISTS integration_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES integration_vault(id) ON DELETE CASCADE,
    credential_type VARCHAR(100) NOT NULL, -- 'API_KEY', 'TOKEN', 'CLIENT_SECRET', 'CERTIFICATE', 'PRIVATE_KEY', 'WEBHOOK_SECRET', 'OAUTH_CREDENTIAL'
    environment VARCHAR(50) NOT NULL DEFAULT 'PRODUCTION', -- 'SANDBOX', 'PRODUCTION'
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'STANDBY', 'REVOKED', 'EXPIRED'
    key_name VARCHAR(100) NOT NULL, -- e.g., 'KEY-001', 'v1'
    encrypted_value TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    key_version VARCHAR(50) NOT NULL DEFAULT 'v1', -- references VAULT_KEY_VERSION for rotation
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_by UUID, -- The operator who created it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Ensure only one ACTIVE credential per environment per vault_id
-- (Though application logic should manage this, it's good practice. We'll leave it to app logic to allow smooth rotation).

-- Table: integration_health_logs
-- Tracks connection stability
CREATE TABLE IF NOT EXISTS integration_health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES integration_vault(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL DEFAULT 'PRODUCTION',
    status VARCHAR(50) NOT NULL, -- 'HEALTHY', 'DEGRADED', 'DOWN'
    latency_ms INT,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: integration_usage_analytics
-- Tracks usage, requests, errors
CREATE TABLE IF NOT EXISTS integration_usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES integration_vault(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- e.g., 'requests_today', 'cost_estimate', 'errors'
    metric_value NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: integration_dependencies
-- Maps credentials to internal features
CREATE TABLE IF NOT EXISTS integration_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES integration_vault(id) ON DELETE CASCADE,
    used_by_feature VARCHAR(255) NOT NULL, -- e.g., 'OTP Service', 'Lesson AI', 'Tenant Verification'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_integration_credentials_vault_id ON integration_credentials(vault_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_logs_vault_id ON integration_health_logs(vault_id);
CREATE INDEX IF NOT EXISTS idx_integration_usage_vault_id ON integration_usage_analytics(vault_id);
CREATE INDEX IF NOT EXISTS idx_integration_dependencies_vault_id ON integration_dependencies(vault_id);

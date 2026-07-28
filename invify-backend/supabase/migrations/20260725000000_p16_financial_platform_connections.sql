-- Create ENUM types
CREATE TYPE financial_platform_connection_status AS ENUM ('UNPROVISIONED', 'PROVISIONING', 'ACTIVE', 'DEGRADED', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE financial_platform_health_status AS ENUM ('HEALTHY', 'DEGRADED', 'OFFLINE');
CREATE TYPE financial_platform_audit_action AS ENUM ('ACTIVATE', 'ROTATE', 'DEACTIVATE', 'HEALTH_CHECK', 'SUSPEND');
CREATE TYPE financial_platform_audit_status AS ENUM ('SUCCESS', 'FAILURE');

-- Create financial_platform_connections table
CREATE TABLE IF NOT EXISTS financial_platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provisioning_token VARCHAR(255),
    quasar_tenant_id VARCHAR(255),
    status financial_platform_connection_status NOT NULL DEFAULT 'UNPROVISIONED',
    health_status financial_platform_health_status,
    last_health_check_at TIMESTAMP WITH TIME ZONE,
    last_key_rotation_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT unique_tenant_connection UNIQUE (tenant_id)
);

-- Create financial_platform_audit table
CREATE TABLE IF NOT EXISTS financial_platform_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id),
    action financial_platform_audit_action NOT NULL,
    status financial_platform_audit_status NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Add triggers for updated_at
CREATE TRIGGER set_financial_platform_connections_updated_at
BEFORE UPDATE ON financial_platform_connections
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE financial_platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_platform_audit ENABLE ROW LEVEL SECURITY;

-- Policies for connections
CREATE POLICY "Tenants can read their own connections"
    ON financial_platform_connections FOR SELECT
    USING (tenant_id = auth.uid());

CREATE POLICY "Admins can manage connections"
    ON financial_platform_connections FOR ALL
    USING (is_admin(auth.uid()));

-- Policies for audit
CREATE POLICY "Tenants can read their own audit logs"
    ON financial_platform_audit FOR SELECT
    USING (tenant_id = auth.uid());

CREATE POLICY "Admins can insert and read audit logs"
    ON financial_platform_audit FOR ALL
    USING (is_admin(auth.uid()));

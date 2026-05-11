-- backend/database/device_activation_schema.sql

-- 1. Device Registry (Physical Hardware Tracking)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    device_id TEXT UNIQUE NOT NULL, -- e.g. Serial Number or IMEI
    device_name TEXT,
    model TEXT,
    os_version TEXT,
    status TEXT DEFAULT 'active', -- active, blocked, retired
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activation Codes (For linking devices to tenants)
CREATE TABLE IF NOT EXISTS device_activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    activation_code TEXT UNIQUE NOT NULL, -- 8-digit secure code
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_used BOOLEAN DEFAULT FALSE,
    device_id TEXT REFERENCES devices(device_id), -- Linked once activated
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activations_code ON device_activations(activation_code);
CREATE INDEX IF NOT EXISTS idx_activations_tenant ON device_activations(tenant_id);

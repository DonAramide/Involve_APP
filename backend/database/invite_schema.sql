-- 1. Create Invitation Table
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff',
    token_hash TEXT NOT NULL UNIQUE, -- SHA256 hashed token
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email, tenant_id, status) -- Prevent multiple pending invites for same user/tenant
);

-- 2. Performance Indexes
CREATE INDEX idx_invites_token ON invites(token_hash);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_tenant ON invites(tenant_id);

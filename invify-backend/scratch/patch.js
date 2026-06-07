const fs = require('fs');

const path = 'C:/Users/IIPS/.gemini/antigravity/brain/99096251-ccb1-4046-999f-2a1a7bb298e3/artifacts/staging_bootstrap.sql';
let sql = fs.readFileSync(path, 'utf8');

const tenantsStub = `-- ============================================================
-- Core Dependencies Missing from M7 Command Center Migrations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    plan VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    quaser_api_key VARCHAR(255),
    virtual_account_number VARCHAR(50),
    virtual_account_bank VARCHAR(100),
    virtual_account_status VARCHAR(50),
    onboarded_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

`;

if (!sql.includes('CREATE TABLE IF NOT EXISTS public.tenants')) {
  sql = tenantsStub + sql;
  fs.writeFileSync(path, sql);
  console.log('Fixed');
} else {
  console.log('Already fixed');
}

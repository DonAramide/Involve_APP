-- 1. Update 'users' table for RBAC correctness
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. Add 'is_active' for account lifecycle management
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. Standardize roles (Constraint for safety)
-- We will migrate existing roles to: super_admin, tenant_admin, staff
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'tenant_admin', 'staff'));

-- 4. Multi-Tenant Integrity Trigger: 
-- Ensure non-super_admins MUST have a tenant_id
CREATE OR REPLACE FUNCTION check_user_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role != 'super_admin' AND NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant users must have a valid tenant_id';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_check_user_integrity
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION check_user_integrity();

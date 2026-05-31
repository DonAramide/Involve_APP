-- Invify User Device Controls - Database Migration

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(200) NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  device_name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'blocked'
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(200),
  UNIQUE(user_id, device_id)
);

-- Seed mock devices for sandbox developer logins (sysadmin@IIPS.app, olive@invify.com)
-- Note: In a sandbox development, these seed values prevent immediate lockout for dev testing.
INSERT INTO user_devices (user_id, email, device_id, device_name, status, ip_address, user_agent, approved_at, approved_by)
VALUES 
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'sysadmin@IIPS.app', 'dev-browser-master-sysadmin', 'Chrome macOS Developer Station', 'approved', '127.0.0.1', 'Mozilla/5.0 Developer Sandbox', NOW(), 'system'),
  ('c3d11b8b-e85d-4f2b-8a8f-2872bc900382', 'olive@invify.com', 'dev-browser-master-olive', 'Firefox Windows Operator Station', 'approved', '192.168.1.42', 'Mozilla/5.0 Developer Sandbox', NOW(), 'system')
ON CONFLICT (user_id, device_id) DO NOTHING;

-- 1. Extend Tenants with Referral Metadata
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS bonus_quota INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- 2. Create Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'joined')),
    reward_applied BOOLEAN DEFAULT FALSE,
    soft_match_domain BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referrer_tenant_id, invited_email)
);

-- 3. Function to initialize referral codes for existing/new tenants
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM tenants WHERE referral_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Apply codes to existing tenants
UPDATE tenants SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- 4. Trigger to auto-generate code for new tenants
CREATE OR REPLACE FUNCTION trigger_tenant_referral_code() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenant_referral_code
BEFORE INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION trigger_tenant_referral_code();

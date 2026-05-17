-- SQL to create verification_codes table for WhatsApp OTP
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_phone ON verification_codes(phone);

-- Enforce Password Reset on First Login for New Business Profiles
ALTER TABLE users ADD COLUMN IF NOT EXISTS require_password_reset BOOLEAN DEFAULT TRUE;

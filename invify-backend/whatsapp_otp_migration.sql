-- WhatsApp OTPs Table Migration
CREATE TABLE IF NOT EXISTS whatsapp_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INT DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create an index to quickly lookup unverified, unexpired OTPs for a given phone
CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_phone_unverified ON whatsapp_otps (phone_number, verified, expires_at);

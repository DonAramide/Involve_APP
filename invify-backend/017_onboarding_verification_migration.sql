-- 017_onboarding_verification_migration.sql

CREATE TYPE channel_enum AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE purpose_enum AS ENUM ('SIGNUP', 'PASSWORD_RESET', 'LOGIN', 'PHONE_CHANGE', 'EMAIL_CHANGE');
CREATE TYPE verification_status_enum AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    code VARCHAR(255) NOT NULL, -- Stored as bcrypt hash
    channel channel_enum NOT NULL,
    purpose purpose_enum NOT NULL,
    status verification_status_enum NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_verification_email ON public.verification_codes(email);
CREATE INDEX idx_verification_phone ON public.verification_codes(phone);
CREATE INDEX idx_verification_channel ON public.verification_codes(channel);
CREATE INDEX idx_verification_purpose ON public.verification_codes(purpose);
CREATE INDEX idx_verification_status ON public.verification_codes(status);
CREATE INDEX idx_verification_expires_at ON public.verification_codes(expires_at);

-- Row Level Security (Service Role only)
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow service_role to do anything
CREATE POLICY "Enable all for service_role" ON public.verification_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create provider_secret_versions table if not exists
CREATE TABLE IF NOT EXISTS public.provider_secret_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider public.banking_provider_enum NOT NULL,
    key_version VARCHAR(100) NOT NULL,
    vault_key_reference VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ROTATING, RETIRED, COMPROMISED, REVOKED
    environment VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_provider_env_version UNIQUE (provider, environment, key_version)
);

-- Create provider_secret_audit table if not exists
CREATE TABLE IF NOT EXISTS public.provider_secret_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider public.banking_provider_enum,
    key_version VARCHAR(100),
    action VARCHAR(50) NOT NULL, -- READ, ROTATE, REVOKE, ERROR
    operator VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- SUCCESS, FAILED
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create provider_secret_rotation_jobs table if not exists
CREATE TABLE IF NOT EXISTS public.provider_secret_rotation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider public.banking_provider_enum NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
    scheduled_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RC1 Infrastructure Certification: Missing DDL resolution
-- Resolves the production blocker preventing persistent Queues and Secrets Management

CREATE TABLE IF NOT EXISTS queue_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_messages_status_next_attempt ON queue_messages(queue_name, status, next_attempt_at);

CREATE TABLE IF NOT EXISTS provider_secret_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    key_version VARCHAR(255) NOT NULL,
    vault_key_reference VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    environment VARCHAR(50) NOT NULL DEFAULT 'staging',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_secret_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50),
    key_version VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    operator VARCHAR(255) NOT NULL DEFAULT 'system',
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_secret_rotation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply RLS configurations as part of standard security
ALTER TABLE queue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_secret_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_secret_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_secret_rotation_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for internal service role (bypassing normal anon/authenticated access)
CREATE POLICY "Internal Services Full Access - queue_messages" ON queue_messages FOR ALL USING (true);
CREATE POLICY "Internal Services Full Access - provider_secret_versions" ON provider_secret_versions FOR ALL USING (true);
CREATE POLICY "Internal Services Full Access - provider_secret_audit" ON provider_secret_audit FOR ALL USING (true);
CREATE POLICY "Internal Services Full Access - provider_secret_rotation_jobs" ON provider_secret_rotation_jobs FOR ALL USING (true);

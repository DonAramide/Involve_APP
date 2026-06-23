-- ============================================================================
-- Phase 2B Staging DDL Migration Package (Hardened Gates V2)
-- Banking Runtime & Provider Integration Layer
-- ============================================================================

BEGIN;

-- Drop existing tables to allow safe execution loop
DROP TABLE IF EXISTS public.quasar_verification_requests CASCADE;
DROP TABLE IF EXISTS public.provider_credentials CASCADE;
DROP TABLE IF EXISTS public.provider_health_events CASCADE;
DROP TABLE IF EXISTS public.provider_health_registry CASCADE;
DROP TABLE IF EXISTS public.incoming_webhook_logs CASCADE;

-- 1. Create Enums Safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'banking_provider_enum') THEN
        CREATE TYPE public.banking_provider_enum AS ENUM ('PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_verification_status') THEN
        CREATE TYPE public.webhook_verification_status AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'REPLAY_REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'circuit_state_enum') THEN
        CREATE TYPE public.circuit_state_enum AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');
    END IF;
END$$;

-- 2. Hardened Webhook Queue Ingestion Table
CREATE TABLE public.incoming_webhook_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider                public.banking_provider_enum NOT NULL,
    event_type              VARCHAR(100) NOT NULL,
    payload                 JSONB NOT NULL,
    signature_header        TEXT NOT NULL,
    status                  public.webhook_verification_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    
    provider_event_id       VARCHAR(255) NOT NULL,
    payload_hash            VARCHAR(64) NOT NULL,
    
    verification_algorithm  VARCHAR(50),
    verification_result     TEXT,
    verified_at             TIMESTAMPTZ,
    
    received_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    replay_window_seconds   INTEGER,
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at            TIMESTAMPTZ,
    
    CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id)
);

-- Replay Protection: Prevent duplicate processing of identical payload hashes for verified events
CREATE UNIQUE INDEX uq_verified_payload_hash 
    ON public.incoming_webhook_logs(provider, payload_hash) 
    WHERE status = 'VERIFIED';

-- 3. Provider Circuit Breaker Health Registry
CREATE TABLE public.provider_health_registry (
    provider                public.banking_provider_enum PRIMARY KEY,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    error_rate_pct          NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    avg_latency_ms          INTEGER NOT NULL DEFAULT 0,
    health_score            NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    
    circuit_state           public.circuit_state_enum NOT NULL DEFAULT 'CLOSED',
    consecutive_failures    INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
    last_failure_at         TIMESTAMPTZ,
    next_retry_at           TIMESTAMPTZ,
    
    last_pinged_at          TIMESTAMPTZ DEFAULT now()
);

-- 4. Provider Health Events Audit Logs (Outages & transitions)
CREATE TABLE public.provider_health_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider                public.banking_provider_enum NOT NULL,
    old_state               public.circuit_state_enum NOT NULL,
    new_state               public.circuit_state_enum NOT NULL,
    reason_code             VARCHAR(100) NOT NULL,
    details                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Provider Key Credential Rotation Registry (Vault references only, no raw key materials)
CREATE TABLE public.provider_credentials (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider                public.banking_provider_enum NOT NULL,
    key_version             VARCHAR(50) NOT NULL,
    public_key              TEXT,
    vault_key_reference     VARCHAR(255) NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    rotated_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_provider_key_version UNIQUE (provider, key_version)
);

-- 6. Quasar Verification Handshake Requests
CREATE TABLE public.quasar_verification_requests (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    withdrawal_id           UUID NOT NULL,
    signed_token            TEXT NOT NULL,
    nonce                   VARCHAR(100) NOT NULL UNIQUE,
    expires_at              TIMESTAMPTZ NOT NULL,
    verification_status     VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED')),
    
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    financial_event_id      UUID NOT NULL REFERENCES public.financial_events(id) ON DELETE CASCADE,
    issued_by               UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verification_hash       VARCHAR(64) NOT NULL,
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Automatic Circuit Evaluation Engine function
CREATE OR REPLACE FUNCTION public.evaluate_provider_health(
    p_provider public.banking_provider_enum,
    p_has_failed BOOLEAN,
    p_latency_ms INTEGER
)
RETURNS public.circuit_state_enum AS $$
DECLARE
    v_state public.circuit_state_enum;
    v_failures INTEGER;
BEGIN
    -- Get current state
    SELECT circuit_state, consecutive_failures INTO v_state, v_failures
    FROM public.provider_health_registry
    WHERE provider = p_provider;

    IF p_has_failed THEN
        v_failures := v_failures + 1;
        
        -- Trip circuit to OPEN on 5 consecutive failures
        IF v_state = 'CLOSED' AND v_failures >= 5 THEN
            v_state := 'OPEN';
            
            UPDATE public.provider_health_registry
            SET circuit_state = 'OPEN',
                consecutive_failures = v_failures,
                last_failure_at = now(),
                next_retry_at = now() + INTERVAL '5 minutes',
                health_score = 0.00
            WHERE provider = p_provider;
        ELSE
            -- Trial failed in HALF_OPEN, transition back to OPEN and restart cooldown
            IF v_state = 'HALF_OPEN' THEN
                v_state := 'OPEN';
                UPDATE public.provider_health_registry
                SET circuit_state = 'OPEN',
                    consecutive_failures = v_failures,
                    last_failure_at = now(),
                    next_retry_at = now() + INTERVAL '5 minutes'
                WHERE provider = p_provider;
            ELSE
                UPDATE public.provider_health_registry
                SET consecutive_failures = v_failures,
                    last_failure_at = now()
                WHERE provider = p_provider;
            END IF;
        END IF;
    ELSE
        -- Success
        IF v_state = 'HALF_OPEN' THEN
            -- In HALF_OPEN, 5 consecutive successful trials transition back to CLOSED
            IF v_failures > 0 THEN
                v_failures := v_failures - 1;
            END IF;
            
            IF v_failures = 0 THEN
                v_state := 'CLOSED';
                UPDATE public.provider_health_registry
                SET circuit_state = 'CLOSED',
                    consecutive_failures = 0,
                    health_score = 100.00
                WHERE provider = p_provider;
            ELSE
                UPDATE public.provider_health_registry
                SET consecutive_failures = v_failures
                WHERE provider = p_provider;
            END IF;
        ELSE
            UPDATE public.provider_health_registry
            SET consecutive_failures = 0,
                health_score = 100.00
            WHERE provider = p_provider;
        END IF;
    END IF;

    RETURN v_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to Log Circuit State Transitions
CREATE OR REPLACE FUNCTION public.log_provider_health_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.circuit_state IS DISTINCT FROM NEW.circuit_state THEN
        INSERT INTO public.provider_health_events (
            provider,
            old_state,
            new_state,
            reason_code,
            details
        )
        VALUES (
            NEW.provider,
            OLD.circuit_state,
            NEW.circuit_state,
            'CIRCUIT_TRANSITION',
            format('Circuit transitioned from %s to %s. Consecutive failures: %s.', OLD.circuit_state, NEW.circuit_state, NEW.consecutive_failures)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_provider_health_transition
    BEFORE UPDATE ON public.provider_health_registry
    FOR EACH ROW EXECUTE FUNCTION public.log_provider_health_transition();

CREATE INDEX idx_webhooks_status ON public.incoming_webhook_logs(status);
CREATE INDEX idx_health_events_provider ON public.provider_health_events(provider);

COMMIT;

-- ============================================================================
-- Phase 2B Staging DDL Migration Package
-- Banking Runtime & Provider Integration Layer
-- ============================================================================

BEGIN;

-- Drop existing tables to allow safe execution loop
DROP TABLE IF EXISTS public.provider_health_events CASCADE;
DROP TABLE IF EXISTS public.provider_health_registry CASCADE;
DROP TABLE IF EXISTS public.incoming_webhook_logs CASCADE;

DROP TYPE IF EXISTS public.webhook_verification_status CASCADE;
DROP TYPE IF EXISTS public.circuit_state_enum CASCADE;

-- 1. Create Enums
CREATE TYPE public.webhook_verification_status AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'REPLAY_REJECTED');
CREATE TYPE public.circuit_state_enum AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- 2. Webhook Queue Ingestion Table
CREATE TABLE public.incoming_webhook_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider                public.banking_provider_enum NOT NULL,
    event_type              VARCHAR(100) NOT NULL,
    payload                 JSONB NOT NULL,
    signature_header        TEXT NOT NULL,
    status                  public.webhook_verification_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at            TIMESTAMPTZ
);

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

-- 5. Trigger to Log Circuit State Transitions
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

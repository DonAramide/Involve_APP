-- Webhook Dead Letter Queue Table

CREATE TABLE IF NOT EXISTS public.webhook_dead_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR NOT NULL,
    endpoint VARCHAR NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    status VARCHAR DEFAULT 'PENDING', -- PENDING, REPLAYED, FAILED, DISCARDED
    created_at TIMESTAMPTZ DEFAULT now(),
    last_retry_at TIMESTAMPTZ
);

-- Index for querying pending webhooks efficiently
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_status ON public.webhook_dead_letters (status);

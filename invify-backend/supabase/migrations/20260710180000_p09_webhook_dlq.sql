/*
=============================================================================
Migration: p09_webhook_dlq
Description: Creates the Webhook Dead Letter Queue table.

--- MIGRATION GOVERNANCE ---
Rollback Strategy:
DROP TABLE IF EXISTS public.webhook_dead_letters CASCADE;

Verification Queries:
SELECT * FROM information_schema.tables WHERE table_name = 'webhook_dead_letters';
SELECT indexname FROM pg_indexes WHERE tablename = 'webhook_dead_letters' AND indexname = 'idx_webhook_dlq_status';

Backwards Compatibility Notes:
Fully backwards compatible. Additive table creation only.

Deployment Notes:
Run this before configuring the background webhook retry worker.

Risk Assessment:
Low Risk. Independent isolated table. No locks on existing tables.
=============================================================================
*/

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

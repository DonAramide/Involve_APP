/*
=============================================================================
Migration: fee_posting_outbox  (Phase 32F.9 — NOT YET APPLIED ANYWHERE)
Description: Durable outbox for fee ledger posting and fee reversal posting.

Exactly-once effect = at-least-once delivery (this outbox, retried until DONE
or NEEDS_ATTENTION) + at-most-once ledger write (ledgers.idempotency_key
UNIQUE, enforced again inside the guarded fee RPCs).

--- MIGRATION GOVERNANCE ---
Rollback Strategy:
DROP FUNCTION IF EXISTS public.claim_fee_posting_outbox(TEXT, INT, INT);
DROP TRIGGER IF EXISTS trg_fee_posting_outbox_guard ON public.fee_posting_outbox;
DROP FUNCTION IF EXISTS public.fee_posting_outbox_guard();
DROP TABLE IF EXISTS public.fee_posting_outbox;

Verification Queries:
SELECT count(*) FROM public.fee_posting_outbox;
SELECT proname FROM pg_proc WHERE proname = 'claim_fee_posting_outbox';

Backwards Compatibility Notes:
Additive. No producer or worker is started by the application in this phase.

Risk Assessment:
Low. Table stays empty until a later approved live phase wires a producer.
=============================================================================
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.fee_posting_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('FEE_ASSESSMENT_POST', 'FEE_REVERSAL_POST')),
    tenant_id UUID NOT NULL,
    assessment_id UUID NOT NULL,
    reversal_id TEXT,
    reference TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'DONE', 'RETRY', 'NEEDS_ATTENTION')),
    attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INT NOT NULL DEFAULT 8 CHECK (max_attempts > 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    last_error_code TEXT,
    ledger_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT fee_posting_outbox_reversal_shape CHECK (
        (kind = 'FEE_ASSESSMENT_POST' AND reversal_id IS NULL)
        OR (kind = 'FEE_REVERSAL_POST' AND reversal_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_fee_posting_outbox_due
    ON public.fee_posting_outbox (status, next_attempt_at)
    WHERE status IN ('PENDING', 'RETRY', 'PROCESSING');

-- Events are never deleted; identity and payload are immutable; DONE is terminal.
CREATE OR REPLACE FUNCTION public.fee_posting_outbox_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'fee_posting_outbox rows cannot be deleted';
    END IF;
    IF NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.assessment_id IS DISTINCT FROM OLD.assessment_id
       OR NEW.reversal_id IS DISTINCT FROM OLD.reversal_id
       OR NEW.reference IS DISTINCT FROM OLD.reference
       OR NEW.payload IS DISTINCT FROM OLD.payload THEN
        RAISE EXCEPTION 'fee_posting_outbox identity and payload are immutable';
    END IF;
    IF OLD.status = 'DONE' AND NEW.status IS DISTINCT FROM 'DONE' THEN
        RAISE EXCEPTION 'fee_posting_outbox DONE is terminal';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fee_posting_outbox_guard ON public.fee_posting_outbox;
CREATE TRIGGER trg_fee_posting_outbox_guard
BEFORE UPDATE OR DELETE ON public.fee_posting_outbox
FOR EACH ROW EXECUTE FUNCTION public.fee_posting_outbox_guard();

-- Claims due events. SKIP LOCKED lets several workers run without double-claiming.
-- PROCESSING rows whose lease expired (worker crashed) are reclaimed.
CREATE OR REPLACE FUNCTION public.claim_fee_posting_outbox(
    p_worker TEXT,
    p_limit INT DEFAULT 10,
    p_lease_seconds INT DEFAULT 300
) RETURNS SETOF public.fee_posting_outbox AS $$
BEGIN
    RETURN QUERY
    UPDATE public.fee_posting_outbox o
    SET status = 'PROCESSING',
        locked_at = now(),
        locked_by = p_worker,
        attempts = o.attempts + 1
    WHERE o.id IN (
        SELECT c.id
        FROM public.fee_posting_outbox c
        WHERE (c.status IN ('PENDING', 'RETRY') AND c.next_attempt_at <= now())
           OR (c.status = 'PROCESSING' AND c.locked_at < now() - make_interval(secs => p_lease_seconds))
        ORDER BY c.next_attempt_at, c.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(p_limit, 0)
    )
    RETURNING o.*;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.fee_posting_outbox ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    REVOKE ALL ON FUNCTION public.claim_fee_posting_outbox(TEXT, INT, INT) FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON public.fee_posting_outbox FROM anon;
        REVOKE ALL ON FUNCTION public.claim_fee_posting_outbox(TEXT, INT, INT) FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON public.fee_posting_outbox FROM authenticated;
        REVOKE ALL ON FUNCTION public.claim_fee_posting_outbox(TEXT, INT, INT) FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT SELECT, INSERT, UPDATE ON public.fee_posting_outbox TO service_role;
        GRANT EXECUTE ON FUNCTION public.claim_fee_posting_outbox(TEXT, INT, INT) TO service_role;
    END IF;
END;
$$;

COMMIT;

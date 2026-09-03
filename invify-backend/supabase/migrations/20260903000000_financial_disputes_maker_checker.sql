-- Maker-checker refunds, chargebacks, and manual Quasar tenant debits.

CREATE TABLE IF NOT EXISTS public.financial_disputes (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    tenant_name                 TEXT,
    case_type                   TEXT NOT NULL CHECK (case_type IN ('REFUND', 'CHARGEBACK', 'MANUAL_DEBIT')),
    status                      TEXT NOT NULL DEFAULT 'PENDING_CHECKER'
                                CHECK (status IN ('PENDING_CHECKER', 'APPROVED_EXECUTING', 'POSTED', 'REJECTED', 'FAILED')),
    amount_kobo                 INTEGER NOT NULL CHECK (amount_kobo > 0),
    currency                    TEXT NOT NULL DEFAULT 'NGN',
    reason                      TEXT NOT NULL,
    original_payment_reference  TEXT,
    maker_id                    TEXT NOT NULL,
    maker_email                 TEXT NOT NULL,
    checker_id                  TEXT,
    checker_email               TEXT,
    checker_comment             TEXT,
    rejected_reason             TEXT,
    quasar_debit_id             TEXT,
    quasar_status               TEXT,
    ledger_reference            TEXT,
    idempotency_key             TEXT UNIQUE,
    failure_message             TEXT,
    metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    posted_at                   TIMESTAMPTZ,
    rejected_at                 TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_financial_disputes_status
    ON public.financial_disputes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_disputes_tenant
    ON public.financial_disputes (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_disputes_maker
    ON public.financial_disputes (maker_id, status);

CREATE TABLE IF NOT EXISTS public.financial_dispute_events (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id      UUID NOT NULL REFERENCES public.financial_disputes(id) ON DELETE RESTRICT,
    event_type   TEXT NOT NULL,
    actor_id     TEXT,
    actor_email  TEXT,
    from_status  TEXT,
    to_status    TEXT,
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_dispute_events_case
    ON public.financial_dispute_events (case_id, created_at ASC);

ALTER TABLE public.financial_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_dispute_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_disputes_service_all ON public.financial_disputes;
CREATE POLICY financial_disputes_service_all
    ON public.financial_disputes
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS financial_dispute_events_service_all ON public.financial_dispute_events;
CREATE POLICY financial_dispute_events_service_all
    ON public.financial_dispute_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

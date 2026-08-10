-- School payment events + disputes (device → admin web)
-- Synced from Flutter student profile Cash/POS payments and Raise Dispute.

CREATE TABLE IF NOT EXISTS public.school_payment_events (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    local_invoice_number TEXT NOT NULL,
    sync_id              TEXT,
    student_key          TEXT,
    admission_number     TEXT,
    student_name         TEXT,
    class_name           TEXT,
    amount               NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method       TEXT,
    payment_status       TEXT NOT NULL DEFAULT 'Paid',
    balance_before       NUMERIC(12,2),
    credit_before        NUMERIC(12,2),
    balance_after        NUMERIC(12,2),
    credit_after         NUMERIC(12,2),
    applied_to_bills     NUMERIC(12,2),
    to_credit            NUMERIC(12,2),
    remarks              TEXT,
    metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
    paid_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, local_invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_school_payment_events_tenant
  ON public.school_payment_events(tenant_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_payment_events_admission
  ON public.school_payment_events(tenant_id, admission_number);

CREATE TABLE IF NOT EXISTS public.payment_disputes (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    payment_event_id     UUID REFERENCES public.school_payment_events(id) ON DELETE SET NULL,
    local_invoice_number TEXT NOT NULL,
    student_key          TEXT,
    admission_number     TEXT,
    student_name         TEXT,
    amount               NUMERIC(12,2),
    payment_method       TEXT,
    reason               TEXT NOT NULL,
    details              TEXT,
    status               TEXT NOT NULL DEFAULT 'OPEN',
    raised_by            TEXT,
    resolved_by          TEXT,
    resolution_notes     TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_tenant
  ON public.payment_disputes(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status
  ON public.payment_disputes(tenant_id, status);

ALTER TABLE public.school_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_payment_events_select ON public.school_payment_events;
CREATE POLICY school_payment_events_select ON public.school_payment_events FOR SELECT USING (true);

DROP POLICY IF EXISTS payment_disputes_select ON public.payment_disputes;
CREATE POLICY payment_disputes_select ON public.payment_disputes FOR SELECT USING (true);

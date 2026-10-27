/*
Payment alert trail.

Every inbound credit is stored until a device socket acknowledges
payment.success. Pending rows are resent while that tenant has a
connected device. This table does not move money.
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_alert_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    reference TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered')),
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_attempt_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivered_device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, reference)
);

CREATE INDEX IF NOT EXISTS payment_alert_deliveries_pending_idx
    ON public.payment_alert_deliveries (next_attempt_at)
    WHERE status = 'pending';

ALTER TABLE public.payment_alert_deliveries ENABLE ROW LEVEL SECURITY;

COMMIT;

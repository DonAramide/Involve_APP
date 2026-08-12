-- WhatsApp Cloud API message log + webhook idempotency
-- Additive: does not alter notifications / verification_codes / FCM tables.

CREATE TABLE IF NOT EXISTS public.whatsapp_message_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    customer_id         TEXT,
    invoice_id          TEXT,
    receipt_id          TEXT,
    message_type        TEXT NOT NULL,
    recipient_phone     TEXT NOT NULL,
    phone_number_id     TEXT,
    template_name       TEXT,
    meta_message_id     TEXT,
    status              TEXT NOT NULL DEFAULT 'pending',
    meta_status         TEXT,
    error_code          TEXT,
    error_message       TEXT,
    idempotency_key     TEXT,
    payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    read_at             TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT whatsapp_message_log_status_check
      CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'failed')),
    CONSTRAINT whatsapp_message_log_type_check
      CHECK (message_type IN ('OTP', 'INVOICE', 'RECEIPT', 'PAYMENT_REMINDER', 'GENERAL_NOTIFICATION'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_message_log_meta_message_id
  ON public.whatsapp_message_log (meta_message_id)
  WHERE meta_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_message_log_idempotency_key
  ON public.whatsapp_message_log (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_tenant_created
  ON public.whatsapp_message_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_status
  ON public.whatsapp_message_log (status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_invoice
  ON public.whatsapp_message_log (invoice_id)
  WHERE invoice_id IS NOT NULL;

-- Idempotent webhook event store (Meta may retry deliveries)
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id            TEXT NOT NULL,
    event_type          TEXT NOT NULL,
    meta_message_id     TEXT,
    phone_number_id     TEXT,
    payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_whatsapp_webhook_events_event_id UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_meta_message
  ON public.whatsapp_webhook_events (meta_message_id)
  WHERE meta_message_id IS NOT NULL;

ALTER TABLE public.whatsapp_message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

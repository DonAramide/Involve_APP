-- Phase B.1: Payment Orchestrator Schema

-- 1. Immutable Event Store (payment_events)
CREATE TABLE public.payment_events (
    event_id UUID PRIMARY KEY,
    version INT NOT NULL DEFAULT 1,
    type VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL, -- references tenants(id) ideally, depending on existing schema
    correlation_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for idempotency and fast lookups
CREATE UNIQUE INDEX idx_payment_events_event_id ON public.payment_events(event_id);
CREATE INDEX idx_payment_events_tenant_id ON public.payment_events(tenant_id);
CREATE INDEX idx_payment_events_correlation_id ON public.payment_events(correlation_id);

-- 2. Payment Intents
CREATE TABLE public.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL, -- references invoices(id)
    amount BIGINT NOT NULL, -- in cents/smallest currency unit
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED', -- CREATED, PENDING, PROCESSING, SUCCEEDED, FAILED
    correlation_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_intents_tenant_id ON public.payment_intents(tenant_id);
CREATE INDEX idx_payment_intents_invoice_id ON public.payment_intents(invoice_id);

-- 3. Payment Attempts
CREATE TABLE public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
    quasar_attempt_id VARCHAR(255),
    provider_method VARCHAR(100), -- WALLET, VIRTUAL_ACCOUNT, BANK_TRANSFER, CARD
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, SUCCEEDED, FAILED
    error_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_attempts_intent_id ON public.payment_attempts(intent_id);

-- 4. Refunds
CREATE TABLE public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
    quasar_refund_id VARCHAR(255),
    amount BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, PROCESSING, COMPLETED, FAILED, REVERSED
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refunds_intent_id ON public.refunds(intent_id);

-- 5. Reconciliation Records
CREATE TABLE public.reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    target_type VARCHAR(100) NOT NULL, -- PAYMENT_INTENT, SETTLEMENT, etc.
    target_id UUID NOT NULL,
    discrepancy_type VARCHAR(100) NOT NULL, -- MISSED_WEBHOOK, DELAYED_SETTLEMENT, STATUS_MISMATCH
    invify_state JSONB,
    quasar_state JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_reconciliation_records_tenant_id ON public.reconciliation_records(tenant_id);
CREATE INDEX idx_reconciliation_records_status ON public.reconciliation_records(status);

-- RLS Policies (Row Level Security)

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_records ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own data, but cannot write (Backend Service handles writes)
CREATE POLICY "Tenants can read own payment events" ON public.payment_events FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Tenants can read own payment intents" ON public.payment_intents FOR SELECT USING (tenant_id = auth.uid());
-- Attempts and Refunds are joined via Intent, but standard Supabase setup often requires explicit tenant_id for RLS simplicity. 
-- Since we didn't add tenant_id to attempts/refunds, we use subqueries or assume the backend uses service_role key to bypass RLS.
-- For safety, we will assume service_role handles all mutations.

-- Add a trigger to update 'updated_at' columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_intents_updated_at
    BEFORE UPDATE ON public.payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_attempts_updated_at
    BEFORE UPDATE ON public.payment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at
    BEFORE UPDATE ON public.refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_records_updated_at
    BEFORE UPDATE ON public.reconciliation_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

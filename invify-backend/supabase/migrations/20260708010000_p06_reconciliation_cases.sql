-- Migration to add enterprise reconciliation tracking tables

CREATE TABLE IF NOT EXISTS public.reconciliation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., REC-2026-9901
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(100) NOT NULL, -- ties to transactions_log.reference and ledgers.reference
    type VARCHAR(50) NOT NULL, -- 'MISSING_SETTLEMENT', 'DUPLICATE', 'MISMATCH', 'TIMEOUT', etc.
    severity VARCHAR(20) NOT NULL, -- 'WARNING', 'CRITICAL'
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'INVESTIGATING', 'MATCHED', 'MISMATCH', 'FAILED', 'ESCALATED'
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expected_amount DECIMAL(15, 2) DEFAULT 0.00,
    actual_amount DECIMAL(15, 2) DEFAULT 0.00,
    difference_amount DECIMAL(15, 2) DEFAULT 0.00,
    risk_score INT DEFAULT 0,
    anomaly_score DECIMAL(5, 2) DEFAULT 0.00,
    fraud_flags JSONB DEFAULT '[]'::jsonb,
    ledger_batch_id VARCHAR(100),
    settlement_batch_id VARCHAR(100),
    wallet_id VARCHAR(100),
    card_id VARCHAR(100),
    provider_reference VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_recon_cases_tenant ON public.reconciliation_cases(tenant_id);
CREATE INDEX idx_recon_cases_status ON public.reconciliation_cases(status);
CREATE INDEX idx_recon_cases_tx_ref ON public.reconciliation_cases(transaction_reference);

CREATE TABLE IF NOT EXISTS public.reconciliation_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.reconciliation_cases(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL, -- 'PAYMENT_RECEIVED', 'GATEWAY_PROCESSED', 'SETTLEMENT_CREATED', 'LEDGER_POSTED', 'BANK_CONFIRMED', 'MATCHED', 'CLOSED'
    description TEXT,
    source_system VARCHAR(50), -- 'QUASAR', 'PROVIDER_WEBHOOK', 'MANUAL', 'BANK_API'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_recon_timeline_case ON public.reconciliation_timeline(case_id);
CREATE INDEX idx_recon_timeline_ts ON public.reconciliation_timeline(timestamp);

-- Function to handle auto-updating the updated_at column
CREATE OR REPLACE FUNCTION update_reconciliation_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reconciliation_cases_updated_at
BEFORE UPDATE ON public.reconciliation_cases
FOR EACH ROW
EXECUTE FUNCTION update_reconciliation_cases_updated_at();

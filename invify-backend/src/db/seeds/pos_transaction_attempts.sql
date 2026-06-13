-- Create POS Transaction Attempts Table (Audit Ledger)
CREATE TABLE IF NOT EXISTS public.pos_transaction_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    terminal_id VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Declined, Aborted
    status_code VARCHAR(10),
    host VARCHAR(50),
    masked_pan VARCHAR(20),
    rrn VARCHAR(50),
    stan VARCHAR(20),
    auth_code VARCHAR(50),
    staff_name VARCHAR(100),
    items_jsonb JSONB,
    raw_request JSONB,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying on the ledger
CREATE INDEX idx_pos_attempts_tenant ON public.pos_transaction_attempts(tenant_id);
CREATE INDEX idx_pos_attempts_status ON public.pos_transaction_attempts(status);
CREATE INDEX idx_pos_attempts_created_at ON public.pos_transaction_attempts(created_at DESC);

-- Allow RLS if needed
ALTER TABLE public.pos_transaction_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for tenant admins" ON public.pos_transaction_attempts FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM users WHERE tenant_id::text = pos_transaction_attempts.tenant_id::text
  )
);

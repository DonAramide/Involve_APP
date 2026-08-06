-- 20260803000002_p18c_invoices_table.sql
-- P18c: Create public.invoices and public.invoice_items tables for transaction ledger sync from mobile app
-- These tables are required for storing transaction records synced from the Flutter client.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_number  TEXT        NOT NULL,
    customer_id     VARCHAR     REFERENCES public.customers(id) ON DELETE SET NULL,
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_status  TEXT        NOT NULL DEFAULT 'Unpaid',
    payment_method  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);

-- 2. Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID        NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_id         UUID        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    quantity        INTEGER     NOT NULL DEFAULT 1,
    unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    type            TEXT        NOT NULL DEFAULT 'product',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON public.invoice_items(item_id);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_invoices_select" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "tenant_invoice_items_select" ON public.invoice_items FOR SELECT USING (true);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS invoices_set_updated_at ON public.invoices;
CREATE TRIGGER invoices_set_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS invoice_items_set_updated_at ON public.invoice_items;
CREATE TRIGGER invoice_items_set_updated_at
    BEFORE UPDATE ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

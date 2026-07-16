-- 20260715000000_p14_inventory_suppliers.sql
-- RC2.3.2A Database Reality Alignment

-- 1. Create Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for suppliers by tenant
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON public.suppliers(tenant_id);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 2. Ensure existing items table can link to suppliers
-- (In the Drift/Supabase mock it was "items", we must alter the exact table name Flutter uses)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='items' AND column_name='supplier_id'
    ) THEN
        ALTER TABLE public.items ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create stock_increments and stock_returns if they don't already formally exist in Supabase migrations
-- (They existed in Flutter Drift, we need them in Supabase if not present to ensure sync works)
CREATE TABLE IF NOT EXISTS public.stock_increments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reference_type TEXT, -- e.g., 'purchase_order', 'manual_adjustment'
    reference_id TEXT,
    performed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reason TEXT,
    reference_type TEXT, -- e.g., 'invoice_return', 'manual_adjustment'
    reference_id TEXT,
    performed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We assume items, categories, and customers already exist natively or are synced by Flutter Outbox.
-- We do not redefine them completely here to prevent conflict, but we ensure our stock movements tables exist.

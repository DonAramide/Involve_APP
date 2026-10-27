-- 20260715000000_p14_inventory_suppliers.sql
-- RC2.3.2A Database Reality Alignment
--
-- Phase 32C.2R.3: items table is created later by p18. Greenfield-safe:
--   - always create suppliers
--   - alter items / create stock_* only when public.items already exists
-- Deferred completion: 20260803000003_phase32c2r3_p14_inventory_after_items.sql

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

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON public.suppliers(tenant_id);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='items'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='items' AND column_name='supplier_id'
    ) THEN
      ALTER TABLE public.items
        ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
    END IF;

    CREATE TABLE IF NOT EXISTS public.stock_increments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      reference_type TEXT,
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
      reference_type TEXT,
      reference_id TEXT,
      performed_by UUID REFERENCES public.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    RAISE NOTICE 'p14: public.items absent — stock_* and items.supplier_id deferred to 20260803000003_phase32c2r3';
  END IF;
END $$;

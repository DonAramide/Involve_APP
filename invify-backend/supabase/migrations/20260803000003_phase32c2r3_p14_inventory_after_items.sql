-- Phase 32C.2R.3: complete p14 inventory linkage after p18 items exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='items'
  ) THEN
    RAISE NOTICE 'p14 after-items: items still missing; skip';
    RETURN;
  END IF;

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
END $$;

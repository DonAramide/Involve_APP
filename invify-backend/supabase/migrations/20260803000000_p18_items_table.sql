-- 20260803000000_p18_items_table.sql
-- P18: Create public.items table for inventory sync from mobile app
-- This table was previously assumed to exist but was never formally created via migration.
-- The Flutter Drift local DB uses an identical schema (see item_table.dart).
-- ─────────────────────────────────────────────────────────────────────────────

-- Extension needed for uuid generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Items (Products) Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.items (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    sku             TEXT,                               -- Generated on sync: NAME_ID
    barcode         TEXT,
    category        TEXT,                               -- string enum from Flutter
    category_id     UUID        REFERENCES public.suppliers(id) ON DELETE SET NULL,  -- optional FK
    supplier_id     UUID        REFERENCES public.suppliers(id) ON DELETE SET NULL,
    price           NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_qty       INTEGER     NOT NULL DEFAULT 0,
    min_stock_qty   NUMERIC(10,2) NOT NULL DEFAULT 0,
    type            TEXT        NOT NULL DEFAULT 'product'
                    CHECK (type IN ('product', 'service')),
    billing_type    TEXT,                               -- 'fixed', 'per_day', 'per_hour'
    service_category TEXT,                              -- 'Hotel', 'Lounge', etc.
    requires_time_tracking BOOLEAN NOT NULL DEFAULT false,
    business_mode   TEXT        NOT NULL DEFAULT 'retail',
    status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
    is_deleted      BOOLEAN     NOT NULL DEFAULT false,
    is_default      BOOLEAN     NOT NULL DEFAULT false,
    sync_id         TEXT,                               -- Mobile device sync ID
    device_id       TEXT,                               -- Originating device ID
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one SKU per tenant (enables upsert on sync)
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sku_tenant ON public.items(sku, tenant_id)
    WHERE sku IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_items_tenant_id   ON public.items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_type        ON public.items(type);
CREATE INDEX IF NOT EXISTS idx_items_status      ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_name        ON public.items(name);
CREATE INDEX IF NOT EXISTS idx_items_barcode     ON public.items(barcode) WHERE barcode IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Categories Table (also needed for inventory display)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON public.categories(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Backend service role bypasses RLS. These policies cover anon/authenticated reads.
CREATE POLICY "tenant_items_select" ON public.items
    FOR SELECT USING (true); -- filtered by tenant_id in queries

CREATE POLICY "tenant_categories_select" ON public.categories
    FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auto-update updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_set_updated_at ON public.items;
CREATE TRIGGER items_set_updated_at
    BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
CREATE TRIGGER categories_set_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Fix category_id FK (was pointing to suppliers erroneously above) 
-- ─────────────────────────────────────────────────────────────────────────────
-- category_id should reference categories, but categories table may not exist yet at DDL parse time
-- So we add it as an ALTER after categories exists
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_category_id_fkey;
ALTER TABLE public.items
    ADD CONSTRAINT items_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

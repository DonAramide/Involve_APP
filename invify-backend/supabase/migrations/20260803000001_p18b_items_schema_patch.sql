-- 20260803000001_p18b_items_schema_patch.sql
-- P18b: Patch existing public.items table to add columns required for mobile Web Sync.
-- The base items table already exists from a prior setup.
-- This migration safely adds missing columns and the unique index for upsert support.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add cost_price column (mirrors Flutter Drift ItemTable.costPrice)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='items' AND column_name='cost_price' AND table_schema='public'
    ) THEN
        ALTER TABLE public.items ADD COLUMN cost_price NUMERIC(12,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add is_deleted flag (mirrors Flutter Drift ItemTable.isDeleted)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='items' AND column_name='is_deleted' AND table_schema='public'
    ) THEN
        ALTER TABLE public.items ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add device_id for tracking which mobile device originated the record
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='items' AND column_name='device_id' AND table_schema='public'
    ) THEN
        ALTER TABLE public.items ADD COLUMN device_id TEXT;
    END IF;
END $$;

-- Unique partial index: enables ON CONFLICT (sku, tenant_id) upsert for idempotent sync
-- Partial: only enforces uniqueness when sku IS NOT NULL (some items may have no SKU)
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sku_tenant
    ON public.items(sku, tenant_id)
    WHERE sku IS NOT NULL;

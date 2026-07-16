/*
=============================================================================
Migration: p12_production_reconciliation
Description: Forward compatibility migration to rectify production drift.
             Casts wallets.tenant_id to UUID and reconstructs the canonical 
             double-entry ledgers header table using a deterministic hierarchy.

--- MIGRATION GOVERNANCE ---
Rollback Strategy:
ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS fk_ledger;
ALTER TABLE public.ledger_entries DROP COLUMN IF EXISTS ledger_id;
-- Cannot easily rollback wallets.tenant_id from UUID to TEXT safely without data loss risk, 
-- but it is structurally forward compatible.

Verification Queries:
-- 1. Check for anomalous timestamp buckets (e.g. odd number of legs, or massive batches)
SELECT tenant_id, created_at, COUNT(*) 
FROM public.ledger_entries 
WHERE ledger_id IS NULL AND idempotency_key IS NULL AND reference IS NULL
GROUP BY tenant_id, created_at 
HAVING COUNT(*) % 2 != 0 OR COUNT(*) > 10;

Backwards Compatibility Notes:
Fully backwards compatible. Fixes the broken canonical architecture in production.

Deployment Notes:
Must be executed manually or via CI against production to synchronize state before running `supabase migration repair`.
=============================================================================
*/

BEGIN;

-- 1. Upgrade Wallets tenant_id to UUID
-- Temporarily drop RLS policies depending on tenant_id
DROP POLICY IF EXISTS "tenant_owner_reads_own_wallet" ON public.wallets;
DROP POLICY IF EXISTS "tenant_owner_updates_own_wallet" ON public.wallets;

ALTER TABLE public.wallets 
ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID;

-- Recreate RLS policies
CREATE POLICY "tenant_owner_reads_own_wallet" ON public.wallets FOR SELECT
    USING ((SELECT tenant_id::uuid FROM public.users WHERE id = auth.uid()) = tenant_id);

CREATE POLICY "tenant_owner_updates_own_wallet" ON public.wallets FOR UPDATE
    USING ((SELECT tenant_id::uuid FROM public.users WHERE id = auth.uid()) = tenant_id);

-- 2. Ensure ledger_id exists on ledger_entries
ALTER TABLE public.ledger_entries 
ADD COLUMN IF NOT EXISTS ledger_id UUID;

-- 3. Disable Append-Only Guard temporarily for backfill
DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON public.ledger_entries;

-- 4. Deterministic Backfill Logic
DO $$
DECLARE
    v_group RECORD;
    v_new_ledger_id UUID;
BEGIN
    -- We loop through unique transaction groups using the hierarchical strategy:
    -- 1. Existing ledger_id (if partially applied)
    -- 2. idempotency_key (from metadata or if added as a column in drift)
    -- 3. reference (if available)
    -- 4. Fallback: tenant_id + created_at
    
    FOR v_group IN (
        SELECT 
            COALESCE(
                ledger_id::TEXT, 
                (metadata->>'idempotency_key'), 
                reference, 
                (tenant_id::TEXT || '-' || extract(epoch from created_at)::TEXT)
            ) AS grouping_key,
            MAX(tenant_id::TEXT)::UUID AS tenant_id,
            MAX(reference) AS reference,
            MAX(metadata->>'idempotency_key') AS idempotency_key,
            MAX(created_at) AS created_at
        FROM public.ledger_entries
        WHERE ledger_id IS NULL
        GROUP BY 1
    )
    LOOP
        -- Generate a new ledger header
        v_new_ledger_id := gen_random_uuid();
        
        INSERT INTO public.ledgers (id, tenant_id, reference, idempotency_key, created_at)
        VALUES (
            v_new_ledger_id, 
            v_group.tenant_id, 
            COALESCE(v_group.reference, 'BF-REF-' || extract(epoch from v_group.created_at)), 
            COALESCE(v_group.idempotency_key, 'BF-IDEMP-' || v_group.grouping_key),
            v_group.created_at
        );
        
        -- Map children to the new ledger header using the same hierarchy
        UPDATE public.ledger_entries
        SET ledger_id = v_new_ledger_id
        WHERE ledger_id IS NULL 
          AND COALESCE(
                ledger_id::TEXT, 
                (metadata->>'idempotency_key'), 
                reference, 
                (tenant_id::TEXT || '-' || extract(epoch from created_at)::TEXT)
              ) = v_group.grouping_key;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Enforce Constraints
ALTER TABLE public.ledger_entries ALTER COLUMN ledger_id SET NOT NULL;
ALTER TABLE public.ledger_entries ADD CONSTRAINT fk_ledger FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON DELETE RESTRICT;

-- 6. Restore Append-Only Guard
CREATE TRIGGER trg_prevent_ledger_modification
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_modification();

COMMIT;

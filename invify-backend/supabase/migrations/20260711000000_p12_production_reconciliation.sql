/*
=============================================================================
Migration: p12_production_reconciliation
Description: Forward compatibility migration to rectify production drift.
             Casts wallets.tenant_id to UUID and reconstructs the canonical
             double-entry ledgers header table using a deterministic hierarchy.

Phase 32C.2R.3:
  Already recorded in staging history. Body made greenfield-safe:
  - backfill only when drifted columns/rows exist
  - skip duplicate FK if p10 already attached ledger_id
=============================================================================
*/

BEGIN;

-- 1. Upgrade Wallets tenant_id to UUID (no-op if already uuid)
DROP POLICY IF EXISTS "tenant_owner_reads_own_wallet" ON public.wallets;
DROP POLICY IF EXISTS "tenant_owner_updates_own_wallet" ON public.wallets;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='wallets'
      AND column_name='tenant_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.wallets
      ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID;
  END IF;
END $$;

CREATE POLICY "tenant_owner_reads_own_wallet" ON public.wallets FOR SELECT
    USING ((SELECT tenant_id::uuid FROM public.users WHERE id = auth.uid()) = tenant_id);

CREATE POLICY "tenant_owner_updates_own_wallet" ON public.wallets FOR UPDATE
    USING ((SELECT tenant_id::uuid FROM public.users WHERE id = auth.uid()) = tenant_id);

-- 2. Ensure ledger_id exists on ledger_entries
ALTER TABLE public.ledger_entries
ADD COLUMN IF NOT EXISTS ledger_id UUID;

-- 3. Disable Append-Only Guard temporarily for backfill
DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON public.ledger_entries;

-- 4. Deterministic Backfill Logic (only when drift columns exist / null ledger_ids remain)
DO $$
DECLARE
    v_group RECORD;
    v_new_ledger_id UUID;
    v_has_metadata boolean;
    v_has_reference boolean;
BEGIN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ledger_entries' AND column_name='metadata'
    ) INTO v_has_metadata;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ledger_entries' AND column_name='reference'
    ) INTO v_has_reference;

    -- Greenfield p10 already sets ledger_id NOT NULL — nothing to backfill.
    IF NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE ledger_id IS NULL LIMIT 1) THEN
      RAISE NOTICE 'p12: no null ledger_id rows; skipping backfill';
      RETURN;
    END IF;

    IF v_has_metadata AND v_has_reference THEN
      FOR v_group IN EXECUTE $q$
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
      $q$
      LOOP
        v_new_ledger_id := gen_random_uuid();
        INSERT INTO public.ledgers (id, tenant_id, reference, idempotency_key, created_at)
        VALUES (
            v_new_ledger_id,
            v_group.tenant_id,
            COALESCE(v_group.reference, 'BF-REF-' || extract(epoch from v_group.created_at)),
            COALESCE(v_group.idempotency_key, 'BF-IDEMP-' || v_group.grouping_key),
            v_group.created_at
        );
        EXECUTE $u$
          UPDATE public.ledger_entries
          SET ledger_id = $1
          WHERE ledger_id IS NULL
            AND COALESCE(
                  ledger_id::TEXT,
                  (metadata->>'idempotency_key'),
                  reference,
                  (tenant_id::TEXT || '-' || extract(epoch from created_at)::TEXT)
                ) = $2
        $u$ USING v_new_ledger_id, v_group.grouping_key;
      END LOOP;
    ELSE
      RAISE NOTICE 'p12: drifted metadata/reference columns absent; skipping hierarchical backfill';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Enforce Constraints (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ledger_entries'
      AND column_name='ledger_id' AND is_nullable='YES'
  ) THEN
    -- Only force NOT NULL when no nulls remain
    IF NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE ledger_id IS NULL LIMIT 1) THEN
      ALTER TABLE public.ledger_entries ALTER COLUMN ledger_id SET NOT NULL;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ledger') THEN
    ALTER TABLE public.ledger_entries
      ADD CONSTRAINT fk_ledger FOREIGN KEY (ledger_id) REFERENCES public.ledgers(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 6. Restore Append-Only Guard
DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON public.ledger_entries;
CREATE TRIGGER trg_prevent_ledger_modification
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_modification();

COMMIT;

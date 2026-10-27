-- DO NOT APPLY to Supabase production, staging, or any shared database.
-- Forward-only proposal. Apply only inside an isolated throwaway Postgres test.
--
-- Problem
-- -------
-- PARENT_LIABILITY is a TENANT-LEVEL SHARED POOL on ledger_entries
-- (tenant_id, account = 'PARENT_LIABILITY'). There is no parent_id column.
-- Independent parents of one tenant share one balance. Application-level
-- SUM(...) then process_ledger_double_entry is not atomic.
--
-- Smallest change
-- ---------------
-- Additive RPC allocate_parent_credit. Do NOT replace process_ledger_double_entry.
-- Webhooks keep process_ledger_double_entry / process_ledger_double_entry_text
-- with quasar:{ref}:credit and never take this advisory lock.
--
-- Lock identity (canonical)
-- -------------------------
-- pg_advisory_xact_lock(hashtext(v_tenant::text), hashtext('PARENT_LIABILITY'))
-- v_tenant is p_tenant_id::uuid (Postgres canonical lowercase uuid text).
-- Callers must mint idempotency keys as alloc:{canonical-uuid}:{identity}.
-- Same-tenant parents serialize together because the pool is tenant-scoped.
-- Other tenants use a different lock key.
--
-- Order (one transaction)
-- 1. Cast tenant to uuid. Reject non-positive amounts and amounts with more
--    than two decimal places (same contract as process_ledger_double_entry).
--    Do not trunc/round the requested amount.
-- 2. Require p_idempotency_key LIKE 'alloc:' || v_tenant::text || ':%'
-- 3. Advisory lock.
-- 4. If ledgers.idempotency_key exists -> DE-DUPLICATED (no new rows).
-- 5. SUM PARENT_LIABILITY. If amount > available -> INSUFFICIENT_PARENT_LIABILITY
--    before any insert.
-- 6. public.process_ledger_double_entry (PARENT_LIABILITY DEBIT + USER_WALLET CREDIT).
--    Inner failure aborts this statement; no partial allocation rows remain.
--
-- Deadlock vs existing ops
-- - This RPC: advisory lock THEN process_ledger_double_entry (wallet FOR UPDATE).
-- - Webhook / payment-alert: process_ledger_double_entry only (wallet FOR UPDATE).
-- - Payout: wallets FOR UPDATE THEN process_ledger_double_entry.
-- No lock-order cycle.
--
-- Permissions
-- -----------
-- SECURITY DEFINER with search_path = public, pg_temp.
-- EXECUTE: service_role only. Not PUBLIC, not anon, not authenticated.
-- Ownership stays with the installing superuser / supabase_admin.
--
-- Rollback
-- DROP FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB);
-- Does not un-post committed allocations. App then fail-closes until callers revert.

CREATE OR REPLACE FUNCTION public.allocate_parent_credit(
    p_tenant_id VARCHAR,
    p_idempotency_key VARCHAR,
    p_reference VARCHAR,
    p_amount NUMERIC,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_tenant UUID;
    v_amount NUMERIC(15,2);
    v_available NUMERIC(15,2);
    v_entries JSONB;
    v_key TEXT;
BEGIN
    BEGIN
        v_tenant := p_tenant_id::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'PARENT_ALLOC_INVALID_TENANT' USING ERRCODE = 'P0001';
    END;

    IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> trunc(p_amount, 2) THEN
        RAISE EXCEPTION 'PARENT_ALLOC_INVALID_AMOUNT' USING ERRCODE = 'P0001';
    END IF;
    v_amount := p_amount;

    v_key := p_idempotency_key;
    IF v_key IS NULL OR v_key NOT LIKE ('alloc:' || v_tenant::text || ':%') THEN
        RAISE EXCEPTION 'PARENT_ALLOC_INVALID_KEY' USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_tenant::text), hashtext('PARENT_LIABILITY'));

    IF EXISTS (
        SELECT 1 FROM public.ledgers WHERE idempotency_key = v_key
    ) THEN
        RETURN jsonb_build_object('status', 'DE-DUPLICATED');
    END IF;

    SELECT COALESCE(SUM(
        CASE
            WHEN type = 'CREDIT' THEN amount
            WHEN type = 'DEBIT' THEN -amount
            ELSE 0
        END
    ), 0)
    INTO v_available
    FROM public.ledger_entries
    WHERE tenant_id = v_tenant
      AND account = 'PARENT_LIABILITY';

    IF v_amount > v_available THEN
        RAISE EXCEPTION 'INSUFFICIENT_PARENT_LIABILITY' USING ERRCODE = 'P0001',
            DETAIL = format('available=%s amount=%s tenant=%s', v_available, v_amount, v_tenant);
    END IF;

    v_entries := jsonb_build_array(
        jsonb_build_object('account', 'PARENT_LIABILITY', 'type', 'DEBIT', 'amount', v_amount),
        jsonb_build_object('account', 'USER_WALLET', 'type', 'CREDIT', 'amount', v_amount)
    );

    RETURN public.process_ledger_double_entry(
        v_tenant::text,
        v_key,
        p_reference,
        v_entries,
        COALESCE(p_metadata, '{}'::jsonb)
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB) FROM PUBLIC;

DO $phase2c_grants$
BEGIN
    REVOKE ALL ON FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB) FROM anon;
EXCEPTION
    WHEN undefined_object THEN NULL;
END
$phase2c_grants$;

DO $phase2c_grants_auth$
BEGIN
    REVOKE ALL ON FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB) FROM authenticated;
EXCEPTION
    WHEN undefined_object THEN NULL;
END
$phase2c_grants_auth$;

DO $phase2c_grants_svc$
BEGIN
    GRANT EXECUTE ON FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB) TO service_role;
EXCEPTION
    WHEN undefined_object THEN NULL;
END
$phase2c_grants_svc$;

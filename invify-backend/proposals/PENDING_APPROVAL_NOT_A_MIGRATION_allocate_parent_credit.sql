-- PENDING APPROVAL. NOT a Supabase migration.
-- Do NOT copy into supabase/migrations until a live staging then production
-- preflight confirms the kobo-precision varchar process_ledger_double_entry
-- and numeric ledger_entries.amount. Do NOT execute this file against shared
-- databases from this review.
--
-- Source body: proposals/DO_NOT_APPLY_allocate_parent_credit.sql
-- Grant style: supabase/migrations/20261003100000_fee_guarded_ledger_posting.sql
--
-- Rollback: DROP FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB);
-- Dropping the function does NOT reverse posted ledger rows. Callers then
-- fail closed until the function is restored or callers are reverted.
--
-- Suggested timestamp if approved later: after 20261015000000.

BEGIN;

DO $preflight$
DECLARE
    v_def TEXT;
    v_amount_type TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid)
    INTO v_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'process_ledger_double_entry'
      AND pg_get_function_identity_arguments(p.oid)
          LIKE 'p_tenant_id character varying%'
    LIMIT 1;

    IF v_def IS NULL THEN
        RAISE EXCEPTION 'PREFLIGHT: public.process_ledger_double_entry(varchar,...) is missing';
    END IF;
    IF v_def NOT LIKE '%Amounts must be positive with at most 2 decimal places.%' THEN
        RAISE EXCEPTION 'PREFLIGHT: process_ledger_double_entry is not the kobo-precision body';
    END IF;

    SELECT data_type
    INTO v_amount_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ledger_entries'
      AND column_name = 'amount';

    IF v_amount_type IS DISTINCT FROM 'numeric' THEN
        RAISE EXCEPTION 'PREFLIGHT: ledger_entries.amount type is % (need numeric)', v_amount_type;
    END IF;
END
$preflight$;

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

DO $grants$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB) FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB) FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.allocate_parent_credit(VARCHAR, VARCHAR, VARCHAR, NUMERIC, JSONB) TO service_role;
    ELSE
        RAISE EXCEPTION 'PREFLIGHT: service_role is missing; refusing to install allocate_parent_credit';
    END IF;
END
$grants$;

COMMIT;

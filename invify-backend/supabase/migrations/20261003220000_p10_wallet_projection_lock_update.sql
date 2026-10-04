/*
=============================================================================
Migration: p10_wallet_projection_lock_update  (Phase 32F.10)
Description: Replace INSERT(delta) ON CONFLICT wallet projection in the live
             staging varchar process_ledger_double_entry with:
               ensure wallet at 0 → lock row → new_balance = current + delta
               → update if >= 0 else INSUFFICIENT_BALANCE.
             Does not drop/replace the UUID overload wrapper.
             Does not change 32F.10 guarded fee RPCs.

--- MIGRATION GOVERNANCE ---
Rollback Strategy:
Restore the previous varchar process_ledger_double_entry body (INSERT
v_wallet_delta ON CONFLICT (tenant_id) DO UPDATE). UUID wrapper untouched.

Verification Queries:
SELECT pg_get_function_identity_arguments(p.oid), p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'process_ledger_double_entry'
ORDER BY 1;
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'process_ledger_double_entry'
  AND pg_get_function_identity_arguments(p.oid) LIKE 'p_tenant_id character varying%';

Backwards Compatibility Notes:
Same varchar signature, SECURITY DEFINER, ledger insert path, return JSON.
Only the wallet cache write changes. UUID overload still delegates here.

Risk Assessment:
Medium. Touches the live staging ledger processor. Staging only until reviewed.
Does not rewrite historical ledger rows.
=============================================================================
*/

BEGIN;

CREATE OR REPLACE FUNCTION public.process_ledger_double_entry(
    p_tenant_id character varying,
    p_idempotency_key character varying,
    p_reference character varying,
    p_entries jsonb,
    p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_tenant_uuid UUID := p_tenant_id::uuid;
    v_ledger_id UUID;
    v_total_credits BIGINT := 0;
    v_total_debits BIGINT := 0;
    v_entry JSONB;
    v_account VARCHAR;
    v_type VARCHAR;
    v_amount BIGINT;
    v_wallet_delta BIGINT := 0;
    v_current_balance NUMERIC(15,2);
    v_new_balance NUMERIC(15,2);
BEGIN
    IF EXISTS (SELECT 1 FROM public.ledgers WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('status', 'DE-DUPLICATED');
    END IF;

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_amount := (v_entry->>'amount')::BIGINT;
        v_type := v_entry->>'type';
        v_account := v_entry->>'account';
        IF v_amount <= 0 THEN
            RAISE EXCEPTION 'Amounts must be strictly positive integers.';
        END IF;
        IF v_type = 'CREDIT' THEN
            v_total_credits := v_total_credits + v_amount;
            IF v_account = 'USER_WALLET' THEN
                v_wallet_delta := v_wallet_delta + v_amount;
            END IF;
        ELSIF v_type = 'DEBIT' THEN
            v_total_debits := v_total_debits + v_amount;
            IF v_account = 'USER_WALLET' THEN
                v_wallet_delta := v_wallet_delta - v_amount;
            END IF;
        ELSE
            RAISE EXCEPTION 'Invalid entry type: %', v_type;
        END IF;
    END LOOP;

    IF v_total_credits != v_total_debits THEN
        RAISE EXCEPTION 'Double-entry unbalanced. Credits (%), Debits (%)', v_total_credits, v_total_debits;
    END IF;

    INSERT INTO public.ledgers (tenant_id, reference, idempotency_key, metadata)
    VALUES (v_tenant_uuid, p_reference, p_idempotency_key, p_metadata)
    RETURNING id INTO v_ledger_id;

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        INSERT INTO public.ledger_entries (ledger_id, tenant_id, account, type, amount, currency)
        VALUES (
            v_ledger_id,
            v_tenant_uuid,
            v_entry->>'account',
            v_entry->>'type',
            (v_entry->>'amount')::BIGINT,
            COALESCE(v_entry->>'currency', 'NGN')
        );
    END LOOP;

    -- Ensure tenant wallet exists with balance 0 (never INSERT a negative delta).
    INSERT INTO public.wallets (tenant_id, balance, currency)
    VALUES (v_tenant_uuid, 0, 'NGN')
    ON CONFLICT (tenant_id) DO NOTHING;

    IF v_wallet_delta != 0 THEN
        SELECT balance INTO v_current_balance
        FROM public.wallets
        WHERE tenant_id = v_tenant_uuid
        FOR UPDATE;

        v_new_balance := COALESCE(v_current_balance, 0) + v_wallet_delta;
        IF v_new_balance < 0 THEN
            RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001',
                DETAIL = format('available=%s delta=%s', v_current_balance, v_wallet_delta);
        END IF;

        UPDATE public.wallets
        SET balance = v_new_balance,
            updated_at = now()
        WHERE tenant_id = v_tenant_uuid;
    END IF;

    RETURN jsonb_build_object('status', 'CREATED', 'ledger_id', v_ledger_id);
END;
$function$;

COMMIT;

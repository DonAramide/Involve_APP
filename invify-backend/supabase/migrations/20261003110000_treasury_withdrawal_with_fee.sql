/*
=============================================================================
Migration: treasury_withdrawal_with_fee  (Phase 32F.10)
Description: Atomic treasury withdrawal: lock wallet, require
             balance >= requested + service_fee, debit total, credit
             EXTERNAL_BANK with requested only, credit fee accounts.

Apply to STAGING only. Do not apply to production in this phase.

Rollback:
DROP FUNCTION IF EXISTS public.request_treasury_withdrawal_with_fee(UUID, VARCHAR, VARCHAR, BIGINT, JSONB, JSONB);
=============================================================================
*/

BEGIN;

CREATE OR REPLACE FUNCTION public.request_treasury_withdrawal_with_fee(
    p_tenant_id UUID,
    p_idempotency_key VARCHAR,
    p_reference VARCHAR,
    p_requested_amount BIGINT,
    p_fee_entries JSONB DEFAULT '[]'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_balance BIGINT;
    v_existing UUID;
    v_fee_total BIGINT := 0;
    v_total BIGINT;
    v_entry JSONB;
    v_account TEXT;
    v_type TEXT;
    v_amount BIGINT;
    v_entries JSONB;
BEGIN
    IF p_idempotency_key IS NULL OR p_idempotency_key NOT LIKE 'payout:%' THEN
        RAISE EXCEPTION 'TREASURY_INVALID_KEY' USING ERRCODE = 'P0001';
    END IF;
    IF p_requested_amount IS NULL OR p_requested_amount <= 0 THEN
        RAISE EXCEPTION 'TREASURY_INVALID_AMOUNT' USING ERRCODE = 'P0001';
    END IF;

    SELECT balance INTO v_balance
    FROM public.wallets
    WHERE tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TREASURY_WALLET_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    SELECT id INTO v_existing FROM public.ledgers WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'DE-DUPLICATED', 'ledger_id', v_existing);
    END IF;

    FOR v_entry IN SELECT * FROM jsonb_array_elements(COALESCE(p_fee_entries, '[]'::jsonb))
    LOOP
        v_account := v_entry->>'account';
        v_type := v_entry->>'type';
        v_amount := (v_entry->>'amount')::BIGINT;
        IF v_amount IS NULL OR v_amount <= 0 THEN
            RAISE EXCEPTION 'TREASURY_INVALID_FEE_BUNDLE' USING ERRCODE = 'P0001';
        END IF;
        IF v_type = 'CREDIT' AND v_account IN ('PLATFORM_FEE', 'PROCESSOR_FEE', 'SERVICE_FEE', 'AGENT_FEE') THEN
            v_fee_total := v_fee_total + v_amount;
        ELSE
            RAISE EXCEPTION 'TREASURY_INVALID_FEE_BUNDLE' USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    v_total := p_requested_amount + v_fee_total;
    IF v_balance < v_total THEN
        RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001',
            DETAIL = format('available=%s requested=%s fee=%s total_required=%s', v_balance, p_requested_amount, v_fee_total, v_total);
    END IF;

    v_entries := jsonb_build_array(
        jsonb_build_object('account', 'USER_WALLET', 'type', 'DEBIT', 'amount', v_total),
        jsonb_build_object('account', 'EXTERNAL_BANK', 'type', 'CREDIT', 'amount', p_requested_amount)
    );
    IF v_fee_total > 0 THEN
        v_entries := v_entries || COALESCE(p_fee_entries, '[]'::jsonb);
    END IF;

    RETURN public.process_ledger_double_entry(
        p_tenant_id,
        p_idempotency_key,
        p_reference,
        v_entries,
        p_metadata || jsonb_build_object(
            'guard', 'request_treasury_withdrawal_with_fee',
            'requested_amount', p_requested_amount,
            'service_fee', v_fee_total,
            'total_required', v_total
        )
    );
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    REVOKE ALL ON FUNCTION public.request_treasury_withdrawal_with_fee(UUID, VARCHAR, VARCHAR, BIGINT, JSONB, JSONB) FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON FUNCTION public.request_treasury_withdrawal_with_fee(UUID, VARCHAR, VARCHAR, BIGINT, JSONB, JSONB) FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON FUNCTION public.request_treasury_withdrawal_with_fee(UUID, VARCHAR, VARCHAR, BIGINT, JSONB, JSONB) FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.request_treasury_withdrawal_with_fee(UUID, VARCHAR, VARCHAR, BIGINT, JSONB, JSONB) TO service_role;
    END IF;
END;
$$;

COMMIT;

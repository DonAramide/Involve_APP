/*
=============================================================================
Migration: fee_kobo_precision
Description: Keep ledger amounts at two decimal places. A 102 kobo fee posts
             as 1.02, not as a whole naira. Whole-naira credits still post
             unchanged. Staging ledger columns are already numeric.

Rollback: restore the previous varchar process_ledger_double_entry and the
BIGINT fee-guard functions from 20261003220000 and 20261003100000.
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
    v_total_credits NUMERIC(15,2) := 0;
    v_total_debits NUMERIC(15,2) := 0;
    v_entry JSONB;
    v_account VARCHAR;
    v_type VARCHAR;
    v_amount NUMERIC(15,2);
    v_wallet_delta NUMERIC(15,2) := 0;
    v_current_balance NUMERIC(15,2);
    v_new_balance NUMERIC(15,2);
BEGIN
    IF EXISTS (SELECT 1 FROM public.ledgers WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('status', 'DE-DUPLICATED');
    END IF;

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_amount := (v_entry->>'amount')::NUMERIC;
        v_type := v_entry->>'type';
        v_account := v_entry->>'account';
        IF v_amount IS NULL OR v_amount <= 0 OR v_amount <> trunc(v_amount, 2) THEN
            RAISE EXCEPTION 'Amounts must be positive with at most 2 decimal places.';
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
            trunc((v_entry->>'amount')::NUMERIC, 2),
            COALESCE(v_entry->>'currency', 'NGN')
        );
    END LOOP;

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

CREATE OR REPLACE FUNCTION public.post_fee_debit_guarded(
    p_tenant_id UUID,
    p_idempotency_key VARCHAR,
    p_reference VARCHAR,
    p_entries JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_balance NUMERIC(15,2);
    v_existing UUID;
    v_entry JSONB;
    v_account TEXT;
    v_type TEXT;
    v_amount NUMERIC(15,2);
    v_wallet_debit NUMERIC(15,2) := 0;
    v_wallet_debit_count INT := 0;
BEGIN
    IF p_idempotency_key IS NULL OR p_idempotency_key NOT LIKE 'ledger:fee:assess:%' THEN
        RAISE EXCEPTION 'FEE_DEBIT_INVALID_KEY' USING ERRCODE = 'P0001';
    END IF;

    SELECT balance INTO v_balance
    FROM public.wallets
    WHERE tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'FEE_DEBIT_WALLET_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    SELECT id INTO v_existing FROM public.ledgers WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'DE-DUPLICATED', 'ledger_id', v_existing);
    END IF;

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_account := v_entry->>'account';
        v_type := v_entry->>'type';
        v_amount := (v_entry->>'amount')::NUMERIC;
        IF v_amount IS NULL OR v_amount <= 0 OR v_amount <> trunc(v_amount, 2) THEN
            RAISE EXCEPTION 'FEE_DEBIT_INVALID_BUNDLE' USING ERRCODE = 'P0001';
        END IF;
        IF v_type = 'DEBIT' AND v_account = 'USER_WALLET' THEN
            v_wallet_debit := v_wallet_debit + v_amount;
            v_wallet_debit_count := v_wallet_debit_count + 1;
        ELSIF v_type = 'CREDIT' AND v_account IN ('PLATFORM_FEE', 'PROCESSOR_FEE', 'SERVICE_FEE', 'AGENT_FEE') THEN
            NULL;
        ELSE
            RAISE EXCEPTION 'FEE_DEBIT_INVALID_BUNDLE' USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    IF v_wallet_debit_count <> 1 OR v_wallet_debit <= 0 THEN
        RAISE EXCEPTION 'FEE_DEBIT_INVALID_BUNDLE' USING ERRCODE = 'P0001';
    END IF;

    IF v_balance < v_wallet_debit THEN
        RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001',
            DETAIL = format('available=%s required=%s', v_balance, v_wallet_debit);
    END IF;

    RETURN public.process_ledger_double_entry(
        p_tenant_id,
        p_idempotency_key,
        p_reference,
        p_entries,
        p_metadata || jsonb_build_object('guard', 'post_fee_debit_guarded')
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.post_fee_reversal_guarded(
    p_tenant_id UUID,
    p_idempotency_key VARCHAR,
    p_reference VARCHAR,
    p_assessment_id UUID,
    p_entries JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_existing UUID;
    v_original_ledger UUID;
    v_entry JSONB;
    v_account TEXT;
    v_type TEXT;
    v_amount NUMERIC(15,2);
    v_wallet_credit NUMERIC(15,2) := 0;
    v_fee_debit NUMERIC(15,2) := 0;
    v_original NUMERIC(15,2);
    v_reversed NUMERIC(15,2);
BEGIN
    IF p_idempotency_key IS NULL OR p_idempotency_key NOT LIKE 'ledger:fee:reverse:%' THEN
        RAISE EXCEPTION 'FEE_REVERSAL_INVALID_KEY' USING ERRCODE = 'P0001';
    END IF;

    PERFORM 1 FROM public.wallets WHERE tenant_id = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FEE_REVERSAL_WALLET_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    SELECT id INTO v_existing FROM public.ledgers WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'DE-DUPLICATED', 'ledger_id', v_existing);
    END IF;

    SELECT id INTO v_original_ledger
    FROM public.ledgers
    WHERE idempotency_key = 'ledger:fee:assess:' || p_assessment_id::text
      AND tenant_id = p_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FEE_REVERSAL_ORIGINAL_NOT_POSTED' USING ERRCODE = 'P0001';
    END IF;

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_account := v_entry->>'account';
        v_type := v_entry->>'type';
        v_amount := (v_entry->>'amount')::NUMERIC;
        IF v_amount IS NULL OR v_amount <= 0 OR v_amount <> trunc(v_amount, 2) THEN
            RAISE EXCEPTION 'FEE_REVERSAL_INVALID_BUNDLE' USING ERRCODE = 'P0001';
        END IF;

        IF v_type = 'CREDIT' AND v_account = 'USER_WALLET' THEN
            v_wallet_credit := v_wallet_credit + v_amount;
        ELSIF v_type = 'DEBIT' AND v_account IN ('PLATFORM_FEE', 'PROCESSOR_FEE', 'SERVICE_FEE', 'AGENT_FEE') THEN
            v_fee_debit := v_fee_debit + v_amount;

            SELECT COALESCE(SUM(e.amount), 0) INTO v_original
            FROM public.ledger_entries e
            WHERE e.ledger_id = v_original_ledger AND e.account = v_account AND e.type = 'CREDIT';

            SELECT COALESCE(SUM(e.amount), 0) INTO v_reversed
            FROM public.ledger_entries e
            JOIN public.ledgers l ON l.id = e.ledger_id
            WHERE l.tenant_id = p_tenant_id
              AND l.idempotency_key LIKE 'ledger:fee:reverse:%'
              AND l.metadata->>'assessmentId' = p_assessment_id::text
              AND e.account = v_account
              AND e.type = 'DEBIT';

            IF v_reversed + v_amount > v_original THEN
                RAISE EXCEPTION 'FEE_REVERSAL_EXCEEDS_ORIGINAL' USING ERRCODE = 'P0001',
                    DETAIL = format('account=%s original=%s reversed=%s requested=%s', v_account, v_original, v_reversed, v_amount);
            END IF;
        ELSE
            RAISE EXCEPTION 'FEE_REVERSAL_INVALID_BUNDLE' USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    IF v_wallet_credit <= 0 OR v_wallet_credit <> v_fee_debit THEN
        RAISE EXCEPTION 'FEE_REVERSAL_INVALID_BUNDLE' USING ERRCODE = 'P0001';
    END IF;

    RETURN public.process_ledger_double_entry(
        p_tenant_id,
        p_idempotency_key,
        p_reference,
        p_entries,
        p_metadata || jsonb_build_object('assessmentId', p_assessment_id::text, 'guard', 'post_fee_reversal_guarded')
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;

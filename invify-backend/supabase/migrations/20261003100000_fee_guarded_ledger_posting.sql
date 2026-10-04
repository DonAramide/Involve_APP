/*
=============================================================================
Migration: fee_guarded_ledger_posting  (Phase 32F.9 — NOT YET APPLIED ANYWHERE)
Description: Balance-guarded, idempotent fee debit and over-reversal-guarded
             fee reversal RPCs for the (disabled) live fee ledger poster.

--- MIGRATION GOVERNANCE ---
Rollback Strategy:
DROP FUNCTION IF EXISTS public.post_fee_reversal_guarded(UUID, VARCHAR, VARCHAR, UUID, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.post_fee_debit_guarded(UUID, VARCHAR, VARCHAR, JSONB, JSONB);

Verification Queries:
SELECT proname FROM pg_proc WHERE proname IN ('post_fee_debit_guarded', 'post_fee_reversal_guarded');

Backwards Compatibility Notes:
Additive. No table changes. process_ledger_double_entry and
request_payout_with_lock are untouched. Nothing calls these RPCs while
FEE_ORCHESTRATION_LIVE is unset.

Risk Assessment:
Low. Functions are only reachable from FeeLedgerPoster, which refuses to run
unless mode=LIVE and FEE_ORCHESTRATION_LIVE=true.
=============================================================================
*/

BEGIN;

-- Atomic check-and-debit for a fee assessment bundle.
--   * Locks the tenant wallet row (same lock request_payout_with_lock takes),
--     so concurrent fee debits and payouts serialize on one row.
--   * Idempotent on p_idempotency_key: a replay returns DE-DUPLICATED, no new rows.
--   * Rejects with INSUFFICIENT_BALANCE before any ledger row is written.
--   * Bundle shape enforced: one USER_WALLET debit, credits only to fee accounts.
CREATE OR REPLACE FUNCTION public.post_fee_debit_guarded(
    p_tenant_id UUID,
    p_idempotency_key VARCHAR,
    p_reference VARCHAR,
    p_entries JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_balance BIGINT;
    v_existing UUID;
    v_entry JSONB;
    v_account TEXT;
    v_type TEXT;
    v_amount BIGINT;
    v_wallet_debit BIGINT := 0;
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

    -- Checked under the wallet lock so a concurrent duplicate waits, then replays.
    SELECT id INTO v_existing FROM public.ledgers WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'DE-DUPLICATED', 'ledger_id', v_existing);
    END IF;

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_account := v_entry->>'account';
        v_type := v_entry->>'type';
        v_amount := (v_entry->>'amount')::BIGINT;
        IF v_amount IS NULL OR v_amount <= 0 THEN
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

    -- Balancing, entry insert and wallet projection update stay in the shared processor.
    RETURN public.process_ledger_double_entry(
        p_tenant_id,
        p_idempotency_key,
        p_reference,
        p_entries,
        p_metadata || jsonb_build_object('guard', 'post_fee_debit_guarded')
    );
END;
$$ LANGUAGE plpgsql;

-- Idempotent fee reversal that can never restore more than was charged.
--   * Requires the original assessment ledger (ledger:fee:assess:{assessment}).
--   * Per fee account: prior reversals + this reversal <= original credit.
--   * USER_WALLET credit must equal the sum of fee-account debits.
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
    v_amount BIGINT;
    v_wallet_credit BIGINT := 0;
    v_fee_debit BIGINT := 0;
    v_original BIGINT;
    v_reversed BIGINT;
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
        v_amount := (v_entry->>'amount')::BIGINT;
        IF v_amount IS NULL OR v_amount <= 0 THEN
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

DO $$
BEGIN
    REVOKE ALL ON FUNCTION public.post_fee_debit_guarded(UUID, VARCHAR, VARCHAR, JSONB, JSONB) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.post_fee_reversal_guarded(UUID, VARCHAR, VARCHAR, UUID, JSONB, JSONB) FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON FUNCTION public.post_fee_debit_guarded(UUID, VARCHAR, VARCHAR, JSONB, JSONB) FROM anon;
        REVOKE ALL ON FUNCTION public.post_fee_reversal_guarded(UUID, VARCHAR, VARCHAR, UUID, JSONB, JSONB) FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON FUNCTION public.post_fee_debit_guarded(UUID, VARCHAR, VARCHAR, JSONB, JSONB) FROM authenticated;
        REVOKE ALL ON FUNCTION public.post_fee_reversal_guarded(UUID, VARCHAR, VARCHAR, UUID, JSONB, JSONB) FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.post_fee_debit_guarded(UUID, VARCHAR, VARCHAR, JSONB, JSONB) TO service_role;
        GRANT EXECUTE ON FUNCTION public.post_fee_reversal_guarded(UUID, VARCHAR, VARCHAR, UUID, JSONB, JSONB) TO service_role;
    END IF;
END;
$$;

COMMIT;

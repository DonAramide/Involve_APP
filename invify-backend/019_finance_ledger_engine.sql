-- 019_finance_ledger_engine.sql

BEGIN;

-- 1. Create or Update Core Tables
CREATE TABLE IF NOT EXISTS public.ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    reference VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id UUID NOT NULL REFERENCES public.ledgers(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL,
    account VARCHAR(100) NOT NULL, -- USER_WALLET, QUASAR_CLEARING, EXTERNAL_BANK, REVENUE, COMMISSIONS, TAXES, etc.
    type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    amount BIGINT NOT NULL CHECK (amount > 0), -- Must be strictly positive and in integer kobo
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Derived Cache Projection for Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,
    balance BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Append-Only Trigger for ledger_entries
CREATE OR REPLACE FUNCTION public.prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are strictly immutable. Modifications are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON public.ledger_entries;
CREATE TRIGGER trg_prevent_ledger_modification
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_modification();

-- 3. Double-Entry Processor RPC
CREATE OR REPLACE FUNCTION public.process_ledger_double_entry(
    p_tenant_id UUID,
    p_idempotency_key VARCHAR,
    p_reference VARCHAR,
    p_entries JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_ledger_id UUID;
    v_total_credits BIGINT := 0;
    v_total_debits BIGINT := 0;
    v_entry JSONB;
    v_account VARCHAR;
    v_type VARCHAR;
    v_amount BIGINT;
    v_wallet_delta BIGINT := 0;
BEGIN
    -- Idempotency check
    IF EXISTS (SELECT 1 FROM public.ledgers WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('status', 'DE-DUPLICATED');
    END IF;

    -- Validate Entries Balancing
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

    -- Create Ledger
    INSERT INTO public.ledgers (tenant_id, reference, idempotency_key, metadata)
    VALUES (p_tenant_id, p_reference, p_idempotency_key, p_metadata)
    RETURNING id INTO v_ledger_id;

    -- Create Ledger Entries
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        INSERT INTO public.ledger_entries (ledger_id, tenant_id, account, type, amount, currency)
        VALUES (
            v_ledger_id,
            p_tenant_id,
            v_entry->>'account',
            v_entry->>'type',
            (v_entry->>'amount')::BIGINT,
            COALESCE(v_entry->>'currency', 'NGN')
        );
    END LOOP;

    -- Update Wallet Projection
    IF v_wallet_delta != 0 THEN
        INSERT INTO public.wallets (tenant_id, balance)
        VALUES (p_tenant_id, v_wallet_delta)
        ON CONFLICT (tenant_id) DO UPDATE
        SET balance = public.wallets.balance + v_wallet_delta,
            updated_at = now();
    END IF;

    RETURN jsonb_build_object('status', 'CREATED', 'ledger_id', v_ledger_id);
END;
$$ LANGUAGE plpgsql;

-- 4. Pessimistic Locking RPC for Payouts
CREATE OR REPLACE FUNCTION public.request_payout_with_lock(
    p_tenant_id UUID,
    p_idempotency_key VARCHAR,
    p_reference VARCHAR,
    p_amount BIGINT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_balance BIGINT;
    v_entries JSONB;
BEGIN
    -- Lock Wallet Row
    SELECT balance INTO v_balance
    FROM public.wallets
    WHERE tenant_id = p_tenant_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for tenant %', p_tenant_id;
    END IF;

    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds. Available: %', v_balance;
    END IF;

    -- Build double entry payload
    v_entries := jsonb_build_array(
        jsonb_build_object('account', 'USER_WALLET', 'type', 'DEBIT', 'amount', p_amount),
        jsonb_build_object('account', 'EXTERNAL_BANK', 'type', 'CREDIT', 'amount', p_amount)
    );

    -- Process Double Entry
    RETURN public.process_ledger_double_entry(
        p_tenant_id,
        p_idempotency_key,
        p_reference,
        v_entries,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;

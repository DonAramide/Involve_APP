-- Invify Safe Ledger RPC
-- Implements SELECT FOR UPDATE with strict timeout.

CREATE OR REPLACE FUNCTION safe_upsert_ledger_entry(
    p_tenant_id UUID,
    p_reference TEXT,
    p_provider TEXT,
    p_type TEXT,
    p_amount DECIMAL,
    p_status TEXT,
    p_source TEXT,
    p_idempotency_key TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_entry_group_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_tx_id UUID;
    v_existing_status TEXT;
    v_stored_provider TEXT;
    v_result JSONB;
BEGIN
    -- 1. Set Strict Lock Timeout (5 seconds)
    -- This prevents long blocking and deadlocks in concurrent ingest.
    SET LOCAL lock_timeout = '5s';

    -- 2. Concurrency Lock on Transaction Anchor (SELECT FOR UPDATE)
    -- If another process is writing this reference, we wait or fail after 5s.
    BEGIN
        SELECT id, status, provider_used INTO v_tx_id, v_existing_status, v_stored_provider
        FROM transactions
        WHERE tenant_id = p_tenant_id AND reference = p_reference
        FOR UPDATE;
    EXCEPTION
        WHEN lock_not_available THEN
            RAISE EXCEPTION 'LOCK_TIMEOUT: Could not acquire lock on transaction % after 5s', p_reference;
    END;

    -- 3. Hardened Business Rules
    -- RULE: Provider Mismatch
    IF v_stored_provider IS NOT NULL AND v_stored_provider != p_provider THEN
        RAISE EXCEPTION 'PROVIDER_MISMATCH: Stored provider % does not match payload %', v_stored_provider, p_provider;
    END IF;

    -- RULE: Monotonic Status
    IF v_existing_status IN ('succeeded', 'failed') THEN
        RETURN jsonb_build_object('success', true, 'message', 'Terminal status locked', 'status', v_existing_status);
    END IF;

    -- 4. Atomic Upserts
    -- Update/Insert Transaction Anchor
    INSERT INTO transactions (tenant_id, reference, provider_used, status, amount, updated_at)
    VALUES (p_tenant_id, p_reference, p_provider, p_status, p_amount, NOW())
    ON CONFLICT (tenant_id, reference) DO UPDATE
    SET status = EXCLUDED.status,
        amount = EXCLUDED.amount,
        updated_at = NOW()
    RETURNING id INTO v_tx_id;

    -- Insert/Update Ledger Entry
    INSERT INTO ledger_entries (
        tenant_id, transaction_id, entry_group_id, reference, provider,
        type, amount, status, source, idempotency_key, metadata, created_at
    )
    VALUES (
        p_tenant_id, v_tx_id, p_entry_group_id, p_reference, p_provider,
        p_type, p_amount, p_status, p_source, p_idempotency_key, p_metadata, NOW()
    )
    ON CONFLICT (tenant_id, idempotency_key) DO UPDATE
    SET status = EXCLUDED.status,
        metadata = ledger_entries.metadata || EXCLUDED.metadata
    RETURNING row_to_json(ledger_entries)::jsonb INTO v_result;

    RETURN jsonb_build_object('success', true, 'entry', v_result);

END;
$$ LANGUAGE plpgsql;

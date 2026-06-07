-- 1. Fix Insert Trigger to handle all initial states
CREATE OR REPLACE FUNCTION trg_sync_wallet_balances_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure wallet exists
    INSERT INTO agent_commission_wallets (agent_id) 
    VALUES (NEW.agent_id) 
    ON CONFLICT DO NOTHING;

    IF NEW.status = 'PENDING' THEN
        UPDATE agent_commission_wallets SET pending_balance = pending_balance + NEW.amount WHERE agent_id = NEW.agent_id;
    ELSIF NEW.status = 'APPROVED' THEN
        UPDATE agent_commission_wallets SET approved_balance = approved_balance + NEW.amount WHERE agent_id = NEW.agent_id;
    ELSIF NEW.status = 'PAID' THEN
        UPDATE agent_commission_wallets SET paid_balance = paid_balance + NEW.amount WHERE agent_id = NEW.agent_id;
    ELSIF NEW.status = 'REVERSED' THEN
        UPDATE agent_commission_wallets SET reversed_balance = reversed_balance + NEW.amount WHERE agent_id = NEW.agent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Remove manual wallet updates from Approval RPC
CREATE OR REPLACE FUNCTION public.process_commission_approval(
    p_ticket_id UUID, 
    p_agent_id UUID, 
    p_amount NUMERIC, 
    p_operator_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Update queue status
    -- The trigger trigger_sync_wallet_balances will handle the wallet update automatically!
    UPDATE public.approval_queue 
    SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
    WHERE id = p_ticket_id AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Remove manual wallet updates from Clawback RPC
CREATE OR REPLACE FUNCTION public.execute_commission_clawback(
    p_agent_id UUID,
    p_amount NUMERIC,
    p_reason VARCHAR,
    p_justification TEXT,
    p_operator_id UUID
) RETURNS VOID AS $$
DECLARE
    v_ticket_id UUID;
BEGIN
    -- 1. Create a ticket in the approval queue with status 'REVERSED'
    -- The trigger trg_sync_wallet_balances_insert will handle the wallet update (add to reversed_balance)!
    INSERT INTO public.approval_queue (agent_id, source_type, amount, status)
    VALUES (p_agent_id, 'CLAWBACK', p_amount, 'REVERSED')
    RETURNING id INTO v_ticket_id;

    -- 2. Create the clawback record
    INSERT INTO public.commission_clawbacks (agent_id, amount, reason, reference_id, justification)
    VALUES (p_agent_id, p_amount, p_reason::public.clawback_reason, v_ticket_id, p_justification);

    -- 3. We must deduct from paid_balance manually since the ticket is inserted fresh as REVERSED 
    -- The trigger will add to reversed_balance, but it won't deduct from paid_balance because there is no 'OLD.status'.
    UPDATE public.agent_commission_wallets
    SET paid_balance = paid_balance - p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE agent_id = p_agent_id;

    -- 4. Log audit event
    INSERT INTO public.commission_events (agent_id, event_type, amount, previous_state, new_state, reference_id, metadata)
    VALUES (
        p_agent_id,
        'COMMISSION_CLAWBACK',
        p_amount,
        'PAID',
        'REVERSED',
        v_ticket_id,
        jsonb_build_object('reason', p_reason, 'justification', p_justification, 'operator_id', p_operator_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

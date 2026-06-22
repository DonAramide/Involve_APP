-- ============================================================================
-- Phase 1D Staging DDL Migration Package
-- Operational Treasury & Settlement Layer
-- ============================================================================

BEGIN;

-- Drop existing tables to allow safe execution loop
DROP TABLE IF EXISTS public.settlement_discrepancies CASCADE;
DROP TABLE IF EXISTS public.provider_balance_snapshots CASCADE;
DROP TABLE IF EXISTS public.provider_clearing_profiles CASCADE;
DROP TABLE IF EXISTS public.provider_settlement_batches CASCADE;
DROP TABLE IF EXISTS public.daily_reconciliation_reports CASCADE;

DROP TYPE IF EXISTS public.reconciliation_status CASCADE;

-- 1. Reconciliation Status Enum
CREATE TYPE public.reconciliation_status AS ENUM ('BALANCED', 'MISMATCHED_DRIFT', 'UNRECONCILED');

-- 2. Daily Reconciliation Logs
CREATE TABLE public.daily_reconciliation_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recon_date              DATE NOT NULL UNIQUE,
    ledger_total            NUMERIC(15,2) NOT NULL,
    treasury_total          NUMERIC(15,2) NOT NULL,
    mismatch_amount         NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status                  public.reconciliation_status NOT NULL DEFAULT 'UNRECONCILED',
    details                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Provider Clearing Profiles
CREATE TABLE public.provider_clearing_profiles (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type         VARCHAR(100) UNIQUE NOT NULL,
    clearing_window_hours INTEGER NOT NULL DEFAULT 24, -- T+1
    grace_period_hours    INTEGER NOT NULL DEFAULT 6,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Provider Settlement Batches
CREATE TABLE public.provider_settlement_batches (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_reference         VARCHAR(255) UNIQUE NOT NULL,
    provider_type           VARCHAR(100) NOT NULL,
    total_records           INTEGER NOT NULL DEFAULT 0,
    total_amount            NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    processed_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Provider Balance Snapshots (For tracking liquidity reserves)
CREATE TABLE public.provider_balance_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type           VARCHAR(100) NOT NULL,
    reported_balance        NUMERIC(15,2) NOT NULL CHECK (reported_balance >= 0),
    clearing_balance        NUMERIC(15,2) NOT NULL CHECK (clearing_balance >= 0),
    captured_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Add batch references to existing provider settlements
ALTER TABLE public.provider_settlements 
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.provider_settlement_batches(id) ON DELETE SET NULL;

-- 7. Settlement Matching Discrepancy Logs
CREATE TABLE public.settlement_discrepancies (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_settlement_id  UUID NOT NULL REFERENCES public.provider_settlements(id),
    financial_event_id      UUID REFERENCES public.financial_events(id),
    discrepancy_type        VARCHAR(50) NOT NULL CHECK (discrepancy_type IN ('UNDER_SETTLEMENT', 'OVER_SETTLEMENT', 'DUPLICATE', 'MISSING')),
    expected_amount         NUMERIC(15,2) NOT NULL,
    actual_amount           NUMERIC(15,2) NOT NULL,
    resolved                BOOLEAN NOT NULL DEFAULT false,
    resolved_by             UUID REFERENCES public.users(id),
    resolved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Treasury Operations Dashboard API View Function
CREATE OR REPLACE FUNCTION public.get_treasury_operations_dashboard()
RETURNS TABLE (
    merchant_liabilities       NUMERIC(15,2),
    platform_revenue           NUMERIC(15,2),
    agent_liabilities          NUMERIC(15,2),
    reserve_balances           NUMERIC(15,2),
    settlement_balances        NUMERIC(15,2),
    freeze_statistics          JSONB
) AS $$
DECLARE
    v_merchant_liab NUMERIC(15,2);
    v_platform_rev  NUMERIC(15,2);
    v_agent_liab     NUMERIC(15,2);
    v_reserves       NUMERIC(15,2);
    v_settlements    NUMERIC(15,2);
    v_freeze_stats   JSONB;
BEGIN
    -- Sum merchant accounts
    SELECT COALESCE(SUM(amount), 0.00) INTO v_merchant_liab
    FROM public.treasury_journal_entries
    WHERE treasury_account_id IN (
        SELECT id FROM public.treasury_accounts WHERE account_type = 'MERCHANT_TREASURY'
    ) AND direction = 'debit'; -- net debit reflects liability balance

    -- Sum platform revenue
    SELECT COALESCE(SUM(amount), 0.00) INTO v_platform_rev
    FROM public.treasury_journal_entries
    WHERE treasury_account_id IN (
        SELECT id FROM public.treasury_accounts WHERE account_type = 'PLATFORM_TREASURY'
    ) AND direction = 'credit';

    -- Sum agent positions
    SELECT COALESCE(SUM(amount), 0.00) INTO v_agent_liab
    FROM public.treasury_journal_entries
    WHERE treasury_account_id IN (
        SELECT id FROM public.treasury_accounts WHERE account_type = 'AGENT_TREASURY'
    ) AND direction = 'credit';

    -- Sum reserved funds
    SELECT COALESCE(SUM(amount), 0.00) INTO v_reserves
    FROM public.reserved_funds
    WHERE status = 'active';

    -- Sum provider settlement clearing funds
    SELECT COALESCE(SUM(amount), 0.00) INTO v_settlements
    FROM public.provider_settlements
    WHERE status = 'SETTLED';

    -- Build freeze metrics
    SELECT jsonb_build_object(
        'total_active_freezes', COUNT(*),
        'aml_freezes', COUNT(*) FILTER (WHERE freeze_type = 'AML_REVIEW'),
        'fraud_freezes', COUNT(*) FILTER (WHERE freeze_type = 'FRAUD_REVIEW'),
        'full_account_freezes', COUNT(*) FILTER (WHERE freeze_scope = 'FULL_ACCOUNT')
    ) INTO v_freeze_stats
    FROM public.financial_freezes
    WHERE is_active = true;

    RETURN QUERY SELECT 
        COALESCE(v_merchant_liab, 0.00),
        COALESCE(v_platform_rev, 0.00),
        COALESCE(v_agent_liab, 0.00),
        COALESCE(v_reserves, 0.00),
        COALESCE(v_settlements, 0.00),
        v_freeze_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Daily Ledger-to-Treasury Reconciliation procedure
CREATE OR REPLACE FUNCTION public.reconcile_treasury_balances(p_date DATE)
RETURNS VOID AS $$
DECLARE
    v_ledger_sum NUMERIC(15,2);
    v_treasury_sum NUMERIC(15,2);
    v_mismatch NUMERIC(15,2);
    v_status public.reconciliation_status;
BEGIN
    -- Aggregate Level 1 ledger positions
    SELECT COALESCE(SUM(amount), 0.00) INTO v_ledger_sum
    FROM public.ledger_entries
    WHERE created_at::date = p_date AND status = 'completed';

    -- Aggregate Level 1 journal entry positions
    SELECT COALESCE(SUM(amount), 0.00) INTO v_treasury_sum
    FROM public.treasury_journal_entries
    WHERE created_at::date = p_date AND direction = 'credit';

    v_mismatch := ABS(v_ledger_sum - v_treasury_sum);

    IF v_mismatch = 0.00 THEN
        v_status := 'BALANCED';
    ELSE
        v_status := 'MISMATCHED_DRIFT';
        
        -- Insert consistency alert
        INSERT INTO public.financial_consistency_audits (severity, mismatch_type, details)
        VALUES (
            'CRITICAL',
            'DAILY_TREASURY_DRIFT',
            jsonb_build_object(
                'recon_date', p_date,
                'ledger_total', v_ledger_sum,
                'treasury_total', v_treasury_sum,
                'drift_variance', v_mismatch
            )
        );
    END IF;

    -- Upsert daily report
    INSERT INTO public.daily_reconciliation_reports (recon_date, ledger_total, treasury_total, mismatch_amount, status)
    VALUES (p_date, v_ledger_sum, v_treasury_sum, v_mismatch, v_status)
    ON CONFLICT (recon_date) DO UPDATE
    SET ledger_total = EXCLUDED.ledger_total,
        treasury_total = EXCLUDED.treasury_total,
        mismatch_amount = EXCLUDED.mismatch_amount,
        status = EXCLUDED.status,
        created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

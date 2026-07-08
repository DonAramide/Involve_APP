-- ============================================================================
-- Phase 1B DDL Package: Stored Procedure Posting, Constraints & Hardening
-- ============================================================================

BEGIN;

-- 1. DROP EXISTING CONSTRAINTS / TRIGGERS TO PREVENT COLLISIONS
DROP TRIGGER IF EXISTS trg_prevent_direct_wallet_mutation ON public.wallets;

DROP FUNCTION IF EXISTS public.post_financial_transaction(UUID, NUMERIC, public.entry_type_enum, VARCHAR, VARCHAR, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.prevent_direct_wallet_mutation() CASCADE;
DROP FUNCTION IF EXISTS public.sync_wallet_cache_on_ledger_insert() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_ledger_modification() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_fee_modification() CASCADE;
DROP FUNCTION IF EXISTS public.log_tenant_fee_profile_history() CASCADE;
DO $$
BEGIN
    EXECUTE 'DROP PROCEDURE IF EXISTS public.rebuild_wallet_balance(UUID) CASCADE';
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;
DROP FUNCTION IF EXISTS public.rebuild_wallet_balance(UUID) CASCADE;

DROP TABLE IF EXISTS public.fee_transactions CASCADE;
DROP TABLE IF EXISTS public.tenant_fee_profile_history CASCADE;
DROP TABLE IF EXISTS public.tenant_fee_profiles CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;
DROP TYPE IF EXISTS public.entry_type_enum CASCADE;

-- Ensure agents.agent_code is unique (Blocker 3 Addendum)
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_agent_code_key CASCADE;
ALTER TABLE public.agents ADD CONSTRAINT agents_agent_code_key UNIQUE (agent_code);

-- 2. CREATE EXPANDED ENTRY TYPE ENUM
CREATE TYPE public.entry_type_enum AS ENUM (
    'SEED',
    'CREDIT',
    'DEBIT',
    'REFUND',
    'COMMISSION',
    'PAYOUT',
    'REVERSAL',
    'ADJUSTMENT',
    'CARD_PAYMENT',
    'VIRTUAL_ACCOUNT_CREDIT',
    'WITHDRAWAL',
    'FEE_DEBIT',
    'PLATFORM_REVENUE',
    'AGENT_REVENUE'
);

-- 3. CORE PLATFORM IDENTITY ATTRIBUTION SEED
INSERT INTO public.tenants (
    id, 
    name, 
    type, 
    plan, 
    status, 
    tenant_code, 
    agent_code, 
    owner_name, 
    owner_email,
    created_at, 
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Invify Platform Revenue',
    'platform',
    'enterprise',
    'active',
    'SYSTEM',
    'SYSTEM',
    'Invify Platform',
    'system@invify.app',
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE
SET name = 'Invify Platform Revenue',
    status = 'active',
    tenant_code = 'SYSTEM',
    agent_code = 'SYSTEM';

-- 4. CREATE TABLES

-- 4A. ledger_entries
CREATE TABLE public.ledger_entries (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    amount          NUMERIC(15,2)   NOT NULL,
    entry_type      public.entry_type_enum NOT NULL,
    status          VARCHAR(50)     NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    reference       VARCHAR(255)    NOT NULL,
    idempotency_key VARCHAR(255)    UNIQUE NULL,
    metadata        JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    
    -- Constraint: Inbound credits must be positive
    CONSTRAINT chk_positive_credit CHECK (
        NOT (entry_type IN ('CARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT') AND amount <= 0)
    ),
    
    -- Constraint: Withdrawals must always be negative (Improvement 1)
    CONSTRAINT chk_negative_withdrawal CHECK (
        NOT (entry_type = 'WITHDRAWAL' AND amount >= 0)
    )
);

-- Enforce unique index on reference and type only for primary payment/credit events to protect against duplicate callback notifications
-- while allowing reversals, refunds, and other entry types to reuse the reference.
CREATE UNIQUE INDEX idx_ledger_entries_reference_type_credit ON public.ledger_entries(reference, entry_type)
WHERE entry_type IN ('CARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT');

-- 4B. tenant_fee_profiles (Supports detailed inward/outward rates & caps)
CREATE TABLE public.tenant_fee_profiles (
    tenant_id                      UUID         PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    card_inward_fee_bps            INTEGER      NULL CHECK (card_inward_fee_bps IS NULL OR card_inward_fee_bps >= 0),
    card_inward_fee_cap            NUMERIC(15,2) NULL CHECK (card_inward_fee_cap IS NULL OR card_inward_fee_cap >= 0),
    card_inward_agent_share_bps    INTEGER      NULL CHECK (card_inward_agent_share_bps IS NULL OR (card_inward_agent_share_bps >= 0 AND card_inward_agent_share_bps <= 10000)),
    
    transfer_inward_fee_bps        INTEGER      NULL CHECK (transfer_inward_fee_bps IS NULL OR transfer_inward_fee_bps >= 0),
    transfer_inward_fee_cap        NUMERIC(15,2) NULL CHECK (transfer_inward_fee_cap IS NULL OR transfer_inward_fee_cap >= 0),
    transfer_inward_agent_share_bps INTEGER     NULL CHECK (transfer_inward_agent_share_bps IS NULL OR (transfer_inward_agent_share_bps >= 0 AND transfer_inward_agent_share_bps <= 10000)),

    withdrawal_outward_fee_bps     INTEGER      NULL CHECK (withdrawal_outward_fee_bps IS NULL OR withdrawal_outward_fee_bps >= 0),
    withdrawal_outward_fee_cap     NUMERIC(15,2) NULL CHECK (withdrawal_outward_fee_cap IS NULL OR withdrawal_outward_fee_cap >= 0),
    withdrawal_outward_agent_share_bps INTEGER   NULL CHECK (withdrawal_outward_agent_share_bps IS NULL OR (withdrawal_outward_agent_share_bps >= 0 AND withdrawal_outward_agent_share_bps <= 10000)),

    updated_at                     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at                     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4C. tenant_fee_profile_history (Stores change history of overrides)
CREATE TABLE public.tenant_fee_profile_history (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID            NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    old_config    JSONB           NULL,
    new_config    JSONB           NOT NULL,
    changed_by    UUID            NULL REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 4D. fee_transactions
CREATE TABLE public.fee_transactions (
    id                     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_entry_id        UUID            NOT NULL REFERENCES public.ledger_entries(id) ON DELETE RESTRICT UNIQUE,
    tenant_id              UUID            NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    gross_amount           NUMERIC(15,2)   NOT NULL CHECK (gross_amount >= 0),
    fee_percentage_bps     INTEGER         NOT NULL CHECK (fee_percentage_bps >= 0),
    total_fee_deducted     NUMERIC(15,2)   NOT NULL CHECK (total_fee_deducted >= 0),
    platform_revenue_share NUMERIC(15,2)   NOT NULL CHECK (platform_revenue_share >= 0),
    agent_commission_share NUMERIC(15,2)   NOT NULL CHECK (agent_commission_share >= 0),
    agent_id               UUID            NULL, -- referring agent
    created_at             TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_status ON public.ledger_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference     ON public.ledger_entries(reference);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_idempotency   ON public.ledger_entries(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at    ON public.ledger_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_tx_tenant                ON public.fee_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_history_tenant           ON public.tenant_fee_profile_history(tenant_id);

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.ledger_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_fee_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_fee_profile_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_transactions        ENABLE ROW LEVEL SECURITY;

-- 6A. Restrictive write-block policies for clients
CREATE POLICY "no_client_write_ledger" ON public.ledger_entries AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "no_client_write_profiles" ON public.tenant_fee_profiles AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "no_client_write_history" ON public.tenant_fee_profile_history AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "no_client_write_fees" ON public.fee_transactions AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);

-- 6B. Select permission grants for clients
CREATE POLICY "super_admin_reads_all_ledger" ON public.ledger_entries FOR SELECT USING (is_admin_or_service());
CREATE POLICY "super_admin_reads_profiles" ON public.tenant_fee_profiles FOR SELECT USING (is_admin_or_service());
CREATE POLICY "super_admin_reads_history" ON public.tenant_fee_profile_history FOR SELECT USING (is_admin_or_service());
CREATE POLICY "super_admin_reads_fees" ON public.fee_transactions FOR SELECT USING (is_admin_or_service());

CREATE POLICY "tenant_owner_reads_own_ledger" ON public.ledger_entries FOR SELECT 
  USING (tenant_id IS NOT NULL AND (SELECT tenant_id::text FROM public.users WHERE id = auth.uid()) = tenant_id::text);
CREATE POLICY "tenant_owner_reads_own_profile" ON public.tenant_fee_profiles FOR SELECT 
  USING ((SELECT tenant_id::text FROM public.users WHERE id = auth.uid()) = tenant_id::text);
CREATE POLICY "tenant_owner_reads_own_history" ON public.tenant_fee_profile_history FOR SELECT 
  USING (tenant_id IS NOT NULL AND (SELECT tenant_id::text FROM public.users WHERE id = auth.uid()) = tenant_id::text);
CREATE POLICY "tenant_owner_reads_own_fees" ON public.fee_transactions FOR SELECT 
  USING (tenant_id IS NOT NULL AND (SELECT tenant_id::text FROM public.users WHERE id = auth.uid()) = tenant_id::text);

-- 7. IMMUTABILITY ENFORCEMENT TRIGGERS (Block UPDATE and DELETE)
CREATE OR REPLACE FUNCTION public.prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are strictly immutable. Modifications (UPDATE/DELETE) are prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_ledger_modification
    BEFORE UPDATE OR DELETE ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_modification();

CREATE OR REPLACE FUNCTION public.prevent_fee_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Fee transaction details are strictly immutable.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_fee_modification
    BEFORE UPDATE OR DELETE ON public.fee_transactions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_fee_modification();

-- 7B. SECURITY CONTEXT TESTING LOGS
DROP TABLE IF EXISTS public.security_context_logs CASCADE;
CREATE TABLE public.security_context_logs (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario          VARCHAR(255)   NOT NULL,
    current_user_val  VARCHAR(255)   NOT NULL,
    session_user_val  VARCHAR(255)   NOT NULL,
    auth_role_val     VARCHAR(255)   NOT NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);
ALTER TABLE public.security_context_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anyone to write context logs" ON public.security_context_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anyone to read context logs" ON public.security_context_logs FOR SELECT USING (true);
CREATE POLICY "Allow anyone to delete context logs" ON public.security_context_logs FOR DELETE USING (true);

-- 8. WALLET CACHE ENFORCEMENT & HARDENING ON public.wallets
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_tenant_id_unique;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_tenant_id_unique UNIQUE (tenant_id);

ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_owner_reads_own_wallet" ON public.wallets;
CREATE POLICY "tenant_owner_reads_own_wallet" ON public.wallets FOR SELECT
    USING ((SELECT tenant_id::text FROM public.users WHERE id = auth.uid()) = tenant_id::text);

DROP POLICY IF EXISTS "tenant_owner_updates_own_wallet" ON public.wallets;
CREATE POLICY "tenant_owner_updates_own_wallet" ON public.wallets FOR UPDATE
    USING ((SELECT tenant_id::text FROM public.users WHERE id = auth.uid()) = tenant_id::text);

DROP POLICY IF EXISTS "super_admin_all_wallet" ON public.wallets;
CREATE POLICY "super_admin_all_wallet" ON public.wallets USING (is_admin_or_service());

-- Sync trigger updating wallets.balance cache (only updates, direct modifications blocked)
CREATE OR REPLACE FUNCTION public.sync_wallet_cache_on_ledger_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        INSERT INTO public.wallets (tenant_id, balance, currency, updated_at)
        VALUES (NEW.tenant_id::text, GREATEST(0.00, NEW.amount), 'NGN', now())
        ON CONFLICT (tenant_id) DO UPDATE
        SET balance = public.wallets.balance + NEW.amount,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_wallet_cache_on_ledger_insert
    AFTER INSERT ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_cache_on_ledger_insert();

-- Hardened write-block trigger for wallets balance column (uses CURRENT_USER check)
CREATE OR REPLACE FUNCTION public.prevent_direct_wallet_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the context of this trigger execution
    INSERT INTO public.security_context_logs (scenario, current_user_val, session_user_val, auth_role_val)
    VALUES (
        'wallet_mutation_trigger',
        CURRENT_USER::text,
        SESSION_USER::text,
        COALESCE(auth.role(), 'NULL')
    );

    -- Reject mutations coming from standard authenticated clients
    IF CURRENT_USER = 'authenticated' THEN
        RAISE EXCEPTION 'Direct wallet balance mutation is prohibited. Updates must be posted as ledger entries.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_direct_wallet_mutation
    BEFORE UPDATE OF balance ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_wallet_mutation();

-- 9. FEE CONFIGURATION AUDIT TRAIL TRIGGER
CREATE OR REPLACE FUNCTION public.log_tenant_fee_profile_history()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
BEGIN
    BEGIN
        v_changed_by := NULLIF(CURRENT_SETTING('request.jwt.claims', true)::jsonb->>'sub', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_changed_by := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.tenant_fee_profile_history (tenant_id, old_config, new_config, changed_by, changed_at)
        VALUES (
            NEW.tenant_id,
            NULL,
            jsonb_build_object(
                'card_inward_fee_bps', NEW.card_inward_fee_bps,
                'card_inward_fee_cap', NEW.card_inward_fee_cap,
                'card_inward_agent_share_bps', NEW.card_inward_agent_share_bps,
                'transfer_inward_fee_bps', NEW.transfer_inward_fee_bps,
                'transfer_inward_fee_cap', NEW.transfer_inward_fee_cap,
                'transfer_inward_agent_share_bps', NEW.transfer_inward_agent_share_bps,
                'withdrawal_outward_fee_bps', NEW.withdrawal_outward_fee_bps,
                'withdrawal_outward_fee_cap', NEW.withdrawal_outward_fee_cap,
                'withdrawal_outward_agent_share_bps', NEW.withdrawal_outward_agent_share_bps
            ),
            v_changed_by,
            now()
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.tenant_fee_profile_history (tenant_id, old_config, new_config, changed_by, changed_at)
        VALUES (
            NEW.tenant_id,
            jsonb_build_object(
                'card_inward_fee_bps', OLD.card_inward_fee_bps,
                'card_inward_fee_cap', OLD.card_inward_fee_cap,
                'card_inward_agent_share_bps', OLD.card_inward_agent_share_bps,
                'transfer_inward_fee_bps', OLD.transfer_inward_fee_bps,
                'transfer_inward_fee_cap', OLD.transfer_inward_fee_cap,
                'transfer_inward_agent_share_bps', OLD.transfer_inward_agent_share_bps,
                'withdrawal_outward_fee_bps', OLD.withdrawal_outward_fee_bps,
                'withdrawal_outward_fee_cap', OLD.withdrawal_outward_fee_cap,
                'withdrawal_outward_agent_share_bps', OLD.withdrawal_outward_agent_share_bps
            ),
            jsonb_build_object(
                'card_inward_fee_bps', NEW.card_inward_fee_bps,
                'card_inward_fee_cap', NEW.card_inward_fee_cap,
                'card_inward_agent_share_bps', NEW.card_inward_agent_share_bps,
                'transfer_inward_fee_bps', NEW.transfer_inward_fee_bps,
                'transfer_inward_fee_cap', NEW.transfer_inward_fee_cap,
                'transfer_inward_agent_share_bps', NEW.transfer_inward_agent_share_bps,
                'withdrawal_outward_fee_bps', NEW.withdrawal_outward_fee_bps,
                'withdrawal_outward_fee_cap', NEW.withdrawal_outward_fee_cap,
                'withdrawal_outward_agent_share_bps', NEW.withdrawal_outward_agent_share_bps
            ),
            v_changed_by,
            now()
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.tenant_fee_profile_history (tenant_id, old_config, new_config, changed_by, changed_at)
        VALUES (
            OLD.tenant_id,
            jsonb_build_object(
                'card_inward_fee_bps', OLD.card_inward_fee_bps,
                'card_inward_fee_cap', OLD.card_inward_fee_cap,
                'card_inward_agent_share_bps', OLD.card_inward_agent_share_bps,
                'transfer_inward_fee_bps', OLD.transfer_inward_fee_bps,
                'transfer_inward_fee_cap', OLD.transfer_inward_fee_cap,
                'transfer_inward_agent_share_bps', OLD.transfer_inward_agent_share_bps,
                'withdrawal_outward_fee_bps', OLD.withdrawal_outward_fee_bps,
                'withdrawal_outward_fee_cap', OLD.withdrawal_outward_fee_cap,
                'withdrawal_outward_agent_share_bps', OLD.withdrawal_outward_agent_share_bps
            ),
            '{}'::jsonb,
            v_changed_by,
            now()
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_tenant_fee_profile_history
    AFTER INSERT OR UPDATE OR DELETE ON public.tenant_fee_profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_tenant_fee_profile_history();

-- 10. RECONCILIATION & RECOVERY FUNCTION FOR WALLET BALANCE CACHE
CREATE OR REPLACE FUNCTION public.rebuild_wallet_balance(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total NUMERIC(15,2);
BEGIN
    -- Log context for verification
    INSERT INTO public.security_context_logs (scenario, current_user_val, session_user_val, auth_role_val)
    VALUES (
        'rebuild_wallet_balance',
        CURRENT_USER::text,
        SESSION_USER::text,
        COALESCE(auth.role(), 'NULL')
    );

    -- Derive canonical balance from ledger_entries
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total
    FROM public.ledger_entries
    WHERE tenant_id = p_tenant_id
      AND status = 'completed';

    -- Write canonical total back to the mutable balance cache
    INSERT INTO public.wallets (tenant_id, balance, currency, updated_at)
    VALUES (p_tenant_id::text, v_total, 'NGN', now())
    ON CONFLICT (tenant_id) DO UPDATE
    SET balance = v_total,
        updated_at = now();
END;
$$;

-- 13. TEMPORARY DEBUGGING UTILITY FUNCTION
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN result;
END;
$$;

-- 11. TRANSACTION AND REVENUE POSTING STORED PROCEDURE
-- Handles validation, fee calculation with caps, splits, and atomic double-entry logs.
CREATE OR REPLACE FUNCTION public.post_financial_transaction(
    p_tenant_id UUID,
    p_amount NUMERIC(15,2),
    p_entry_type public.entry_type_enum,
    p_reference VARCHAR(255),
    p_idempotency_key VARCHAR(255),
    p_metadata JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ledger_id UUID;
    v_existing_id UUID;
    
    -- Fee parameters
    v_fee_bps INT;
    v_fee_cap NUMERIC(15,2);
    v_agent_share_bps INT;
    
    -- Calculated fee divisions
    v_total_fee NUMERIC(15,2) := 0.00;
    v_agent_share NUMERIC(15,2) := 0.00;
    v_platform_share NUMERIC(15,2) := 0.00;
    v_agent_id UUID;
    
    -- System defaults fallbacks (Basis Points & Caps)
    v_default_bps INT;
    v_default_cap NUMERIC(15,2);
    v_default_agent_bps INT;
    
    -- Safety validation
    v_current_balance NUMERIC(15,2);
BEGIN
    -- Log context for verification
    INSERT INTO public.security_context_logs (scenario, current_user_val, session_user_val, auth_role_val)
    VALUES (
        'post_financial_transaction',
        CURRENT_USER::text,
        SESSION_USER::text,
        COALESCE(auth.role(), 'NULL')
    );

    -- 1. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM public.ledger_entries
        WHERE idempotency_key = p_idempotency_key;
        
        IF v_existing_id IS NOT NULL THEN
            RETURN v_existing_id;
        END IF;
    END IF;

    -- 2. First-wallet race condition prevention: Upsert empty wallet first
    INSERT INTO public.wallets (tenant_id, balance, currency, updated_at)
    VALUES (p_tenant_id::text, 0.00, 'NGN', now())
    ON CONFLICT (tenant_id) DO NOTHING;

    -- 3. Lock wallet row for safety (Guarantees serialization)
    SELECT balance INTO v_current_balance 
    FROM public.wallets 
    WHERE tenant_id = p_tenant_id::text 
    FOR UPDATE;

    -- 4. Coerce & enforce withdrawal negative amounts (Improvement 1)
    IF p_entry_type = 'WITHDRAWAL' THEN
        IF p_amount >= 0 THEN
            RAISE EXCEPTION 'WITHDRAWAL amount must always be negative. Received: %', p_amount;
        END IF;
        
        -- Enforce withdrawal limit check (withdrawal + fee must not push balance below zero)
        IF (v_current_balance + p_amount) < 0 THEN
            RAISE EXCEPTION 'Insufficient wallet balance for withdrawal. Balance: ₦%, Requested: ₦%', v_current_balance, ABS(p_amount);
        END IF;
    END IF;

    -- 5. Run Transaction Posting Core logic
    -- Insert primary transaction record
    INSERT INTO public.ledger_entries (tenant_id, amount, entry_type, status, reference, idempotency_key, metadata)
    VALUES (p_tenant_id, p_amount, p_entry_type, 'completed', p_reference, p_idempotency_key, p_metadata)
    RETURNING id INTO v_ledger_id;

    -- 6. Automatic Fee assessment (For CARD_PAYMENT, VIRTUAL_ACCOUNT_CREDIT, and WITHDRAWAL)
    IF p_entry_type IN ('CARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT', 'WITHDRAWAL') THEN
        -- Resolve configured defaults or profile overrides based on type
        IF p_entry_type = 'CARD_PAYMENT' THEN
            -- Defaults
            v_default_bps := COALESCE((SELECT (config_value->>'card_inward_fee_bps')::int FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 150);
            v_default_cap := COALESCE((SELECT (config_value->>'card_inward_fee_cap')::numeric FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 2000.00);
            v_default_agent_bps := COALESCE((SELECT (config_value->>'card_inward_agent_share_bps')::int FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 4000);
            
            -- Overrides
            SELECT card_inward_fee_bps, card_inward_fee_cap, card_inward_agent_share_bps INTO v_fee_bps, v_fee_cap, v_agent_share_bps
            FROM public.tenant_fee_profiles WHERE tenant_id = p_tenant_id;
            
        ELSIF p_entry_type = 'VIRTUAL_ACCOUNT_CREDIT' THEN
            -- Defaults
            v_default_bps := COALESCE((SELECT (config_value->>'transfer_inward_fee_bps')::int FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 100);
            v_default_cap := COALESCE((SELECT (config_value->>'transfer_inward_fee_cap')::numeric FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 1000.00);
            v_default_agent_bps := COALESCE((SELECT (config_value->>'transfer_inward_agent_share_bps')::int FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 4000);
            
            -- Overrides
            SELECT transfer_inward_fee_bps, transfer_inward_fee_cap, transfer_inward_agent_share_bps INTO v_fee_bps, v_fee_cap, v_agent_share_bps
            FROM public.tenant_fee_profiles WHERE tenant_id = p_tenant_id;
            
        ELSE -- WITHDRAWAL
            -- Defaults
            v_default_bps := COALESCE((SELECT (config_value->>'withdrawal_outward_fee_bps')::int FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 50);
            v_default_cap := COALESCE((SELECT (config_value->>'withdrawal_outward_fee_cap')::numeric FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 5000.00);
            v_default_agent_bps := COALESCE((SELECT (config_value->>'withdrawal_outward_agent_share_bps')::int FROM public.system_configurations WHERE config_key = 'global_fee_defaults'), 0);
            
            -- Overrides
            SELECT withdrawal_outward_fee_bps, withdrawal_outward_fee_cap, withdrawal_outward_agent_share_bps INTO v_fee_bps, v_fee_cap, v_agent_share_bps
            FROM public.tenant_fee_profiles WHERE tenant_id = p_tenant_id;
        END IF;

        -- Apply fallback defaults if overrides are null
        v_fee_bps := COALESCE(v_fee_bps, v_default_bps);
        v_fee_cap := COALESCE(v_fee_cap, v_default_cap);
        v_agent_share_bps := COALESCE(v_agent_share_bps, v_default_agent_bps);

        -- Assess fee and apply cap ceiling
        v_total_fee := ROUND(ABS(p_amount) * (v_fee_bps::numeric / 10000.0), 2);
        IF v_fee_cap IS NOT NULL AND v_total_fee > v_fee_cap THEN
            v_total_fee := v_fee_cap;
        END IF;

        -- Resolve referred agent with explicit safe handling (Blocker 3 Addendum)
        v_agent_id := NULL;
        BEGIN
            SELECT id INTO STRICT v_agent_id
            FROM public.agents a
            WHERE a.agent_code = (SELECT agent_code FROM public.tenants WHERE id = p_tenant_id);
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                v_agent_id := NULL;
            WHEN TOO_MANY_ROWS THEN
                -- Graceful fallback to first matching agent record if duplicates somehow exist
                SELECT id INTO v_agent_id
                FROM public.agents a
                WHERE a.agent_code = (SELECT agent_code FROM public.tenants WHERE id = p_tenant_id)
                LIMIT 1;
        END;

        -- Force platform allocation to 100% if no agent matches (Blocker 3 Addendum)
        IF v_agent_id IS NULL THEN
            v_agent_share_bps := 0;
        END IF;

        -- Calculate shares
        v_agent_share := ROUND(v_total_fee * (v_agent_share_bps::numeric / 10000.0), 2);
        v_platform_share := v_total_fee - v_agent_share;

        -- Record fee assessment debit if total fee is non-zero
        IF v_total_fee > 0 THEN
            -- Enforce withdrawal limits: ensure fee doesn't push balance below 0 during withdrawal payouts
            IF p_entry_type = 'WITHDRAWAL' AND (v_current_balance + p_amount - v_total_fee) < 0 THEN
                RAISE EXCEPTION 'Insufficient balance to cover withdrawal fee. Current balance: ₦%, Fee: ₦%', v_current_balance, v_total_fee;
            END IF;

            -- Debit merchant balance
            INSERT INTO public.ledger_entries (tenant_id, amount, entry_type, status, reference, idempotency_key, metadata)
            VALUES (
                p_tenant_id,
                -v_total_fee,
                'FEE_DEBIT',
                'completed',
                p_reference,
                'fee_debit:' || v_ledger_id,
                jsonb_build_object('originating_entry_id', v_ledger_id, 'platform_share', v_platform_share, 'agent_share', v_agent_share)
            );

            -- Record fee transaction audit lineage
            INSERT INTO public.fee_transactions (ledger_entry_id, tenant_id, gross_amount, fee_percentage_bps, total_fee_deducted, platform_revenue_share, agent_commission_share, agent_id)
            VALUES (
                v_ledger_id,
                p_tenant_id,
                ABS(p_amount),
                v_fee_bps,
                v_total_fee,
                v_platform_share,
                v_agent_share,
                v_agent_id
            );

            -- Credit Platform Share as PLATFORM_REVENUE ledger entry (maps to System UUID)
            INSERT INTO public.ledger_entries (tenant_id, amount, entry_type, status, reference, idempotency_key, metadata)
            VALUES (
                '00000000-0000-0000-0000-000000000001', -- system sentinel
                v_platform_share,
                'PLATFORM_REVENUE',
                'completed',
                p_reference,
                'platform_share:' || v_ledger_id,
                jsonb_build_object('originating_entry_id', v_ledger_id)
            );

            -- Credit Agent share as AGENT_REVENUE ledger entry (maps to System UUID with agent reference)
            IF v_agent_id IS NOT NULL AND v_agent_share > 0 THEN
                INSERT INTO public.ledger_entries (tenant_id, amount, entry_type, status, reference, idempotency_key, metadata)
                VALUES (
                    '00000000-0000-0000-0000-000000000001', -- system sentinel
                    v_agent_share,
                    'AGENT_REVENUE',
                    'completed',
                    p_reference,
                    'agent_share:' || v_ledger_id,
                    jsonb_build_object('originating_entry_id', v_ledger_id, 'agent_id', v_agent_id)
                );

                -- Update agent commission wallet cache
                INSERT INTO public.agent_commission_wallets (agent_id, approved_balance)
                VALUES (v_agent_id, v_agent_share)
                ON CONFLICT (agent_id) DO UPDATE
                SET approved_balance = public.agent_commission_wallets.approved_balance + EXCLUDED.approved_balance,
                    updated_at = now();
            END IF;
        END IF;
    END IF;

    RETURN v_ledger_id;
END;
$$;

-- Enable RLS and add policy for public.users so subqueries in wallet RLS policies can retrieve tenant_id
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_select_own_user" ON public.users;
CREATE POLICY "allow_select_own_user" ON public.users FOR SELECT
    USING (id = auth.uid());

COMMIT;

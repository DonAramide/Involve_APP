-- ============================================================================
-- Phase 1C Staging DDL Migration Package (Hardened Gate V4)
-- Treasury, Revenue & Multi-Layer Financial Consistency Engine
-- ============================================================================

BEGIN;

-- 1. CLEAN EXISTING TABLES AND TYPES FOR RE-MIGRATION IDEMPOTENCY
DROP TABLE IF EXISTS public.financial_consistency_audits CASCADE;
DROP TABLE IF EXISTS public.quasar_verification_records CASCADE;
DROP TABLE IF EXISTS public.provider_settlements CASCADE;
DROP TABLE IF EXISTS public.financial_freezes CASCADE;
DROP TABLE IF EXISTS public.reserved_funds CASCADE;
DROP TABLE IF EXISTS public.treasury_journal_entries CASCADE;
DROP TABLE IF EXISTS public.treasury_movements CASCADE;
DROP TABLE IF EXISTS public.treasury_accounts CASCADE;
DROP TABLE IF EXISTS public.financial_event_state_history CASCADE;
DROP TABLE IF EXISTS public.financial_events CASCADE;
DROP TABLE IF EXISTS public.financial_execution_locks CASCADE;

DROP TYPE IF EXISTS public.treasury_account_type CASCADE;
DROP TYPE IF EXISTS public.owner_type_enum CASCADE;
DROP TYPE IF EXISTS public.treasury_status_enum CASCADE;
DROP TYPE IF EXISTS public.audit_severity CASCADE;
DROP TYPE IF EXISTS public.reserve_status CASCADE;
DROP TYPE IF EXISTS public.freeze_scope_enum CASCADE;
DROP TYPE IF EXISTS public.freeze_type_enum CASCADE;
DROP TYPE IF EXISTS public.financial_event_type_enum CASCADE;
DROP TYPE IF EXISTS public.financial_event_state_enum CASCADE;
DROP TYPE IF EXISTS public.settlement_state_enum CASCADE;
DROP TYPE IF EXISTS public.verification_status_enum CASCADE;

-- 2. CREATE TYPE ENUMS
CREATE TYPE public.treasury_account_type AS ENUM (
    'MERCHANT_TREASURY',
    'PLATFORM_TREASURY',
    'AGENT_TREASURY',
    'RESERVE_TREASURY',
    'ESCROW_TREASURY',
    'PAYSTACK_SETTLEMENT',
    'FLUTTERWAVE_SETTLEMENT',
    'PROVIDUS_SETTLEMENT',
    'WEMA_SETTLEMENT',
    'NIBSS_SETTLEMENT'
);

CREATE TYPE public.owner_type_enum AS ENUM ('SYSTEM', 'TENANT', 'AGENT', 'PROVIDER');
CREATE TYPE public.treasury_status_enum AS ENUM ('ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED');
CREATE TYPE public.audit_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE public.reserve_status AS ENUM ('active', 'released_success', 'released_failed');
CREATE TYPE public.freeze_scope_enum AS ENUM ('WITHDRAWALS_ONLY', 'PAYOUTS_ONLY', 'SETTLEMENTS_ONLY', 'FULL_ACCOUNT');
CREATE TYPE public.freeze_type_enum AS ENUM ('AML_REVIEW', 'FRAUD_REVIEW', 'CHARGEBACK_INVESTIGATION', 'COMPLIANCE_REVIEW', 'COURT_ORDER', 'MANUAL_LOCK');
CREATE TYPE public.financial_event_type_enum AS ENUM ('INWARD_PAYMENT', 'PAYOUT_WITHDRAWAL', 'INTERNAL_RECLASSIFICATION', 'REVERSAL_ADJUSTMENT');
CREATE TYPE public.financial_event_state_enum AS ENUM ('INITIALIZED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE public.settlement_state_enum AS ENUM ('REPORTED', 'RECEIVED', 'VERIFIED', 'SETTLED', 'FAILED', 'REVERSED');
CREATE TYPE public.verification_status_enum AS ENUM ('SUCCESS', 'FAILED');

-- 3. FINANCIAL EVENTS MASTER REGISTRY
CREATE TABLE public.financial_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      public.financial_event_type_enum NOT NULL,
    state           public.financial_event_state_enum NOT NULL DEFAULT 'INITIALIZED',
    idempotency_key VARCHAR(255) UNIQUE NULL,
    reference       VARCHAR(255) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    tenant_id       UUID REFERENCES public.tenants(id) ON DELETE RESTRICT,
    agent_id        UUID REFERENCES public.agents(id) ON DELETE RESTRICT,
    created_by      UUID REFERENCES public.users(id) ON DELETE RESTRICT
);

-- 4. FINANCIAL EVENT STATE HISTORY
CREATE TABLE public.financial_event_state_history (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_event_id   UUID NOT NULL REFERENCES public.financial_events(id) ON DELETE CASCADE,
    old_state            public.financial_event_state_enum,
    new_state            public.financial_event_state_enum NOT NULL,
    changed_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TREASURY ACCOUNTS
CREATE TABLE public.treasury_accounts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type   public.treasury_account_type NOT NULL,
    owner_type     public.owner_type_enum NOT NULL,
    status         public.treasury_status_enum NOT NULL DEFAULT 'ACTIVE',
    currency       VARCHAR(3) NOT NULL DEFAULT 'NGN',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    tenant_id      UUID REFERENCES public.tenants(id) ON DELETE RESTRICT,
    agent_id       UUID REFERENCES public.agents(id) ON DELETE RESTRICT,
    provider_id    UUID, -- reference to gateway provider id
    
    CONSTRAINT chk_ownership_integrity CHECK (
        (owner_type = 'SYSTEM' AND tenant_id IS NULL AND agent_id IS NULL AND provider_id IS NULL) OR
        (owner_type = 'TENANT' AND tenant_id IS NOT NULL AND agent_id IS NULL AND provider_id IS NULL) OR
        (owner_type = 'AGENT' AND tenant_id IS NULL AND agent_id IS NOT NULL AND provider_id IS NULL) OR
        (owner_type = 'PROVIDER' AND tenant_id IS NULL AND agent_id IS NULL AND provider_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_treasury_merchant ON public.treasury_accounts (account_type, tenant_id) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX uq_treasury_agent ON public.treasury_accounts (account_type, agent_id) WHERE agent_id IS NOT NULL;
CREATE UNIQUE INDEX uq_treasury_provider ON public.treasury_accounts (account_type, provider_id) WHERE provider_id IS NOT NULL;
CREATE UNIQUE INDEX uq_treasury_system ON public.treasury_accounts (account_type) WHERE owner_type = 'SYSTEM';

-- 6. TREASURY MOVEMENTS
CREATE TABLE public.treasury_movements (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_event_id     UUID NOT NULL REFERENCES public.financial_events(id),
    source_account_id      UUID REFERENCES public.treasury_accounts(id),
    destination_account_id UUID REFERENCES public.treasury_accounts(id),
    amount                 NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency               VARCHAR(3) NOT NULL DEFAULT 'NGN',
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TREASURY JOURNAL ENTRIES (Double-entry trace legs)
CREATE TABLE public.treasury_journal_entries (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_event_id   UUID NOT NULL REFERENCES public.financial_events(id),
    treasury_account_id  UUID NOT NULL REFERENCES public.treasury_accounts(id),
    direction            VARCHAR(6) NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount               NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency             VARCHAR(3) NOT NULL DEFAULT 'NGN',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. RESERVED FUNDS WITH EXPIRATIONS
CREATE TABLE public.reserved_funds (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_event_id     UUID NOT NULL UNIQUE REFERENCES public.financial_events(id),
    tenant_id              UUID NOT NULL REFERENCES public.tenants(id),
    amount                 NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency               VARCHAR(3) NOT NULL DEFAULT 'NGN',
    reason                 VARCHAR(100) NOT NULL CHECK (reason IN ('withdrawal_hold', 'chargeback_risk', 'settlement_hold', 'dispute_lock')),
    status                 public.reserve_status NOT NULL DEFAULT 'active',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at             TIMESTAMPTZ NOT NULL,
    released_at            TIMESTAMPTZ
);

-- 9. FINANCIAL FREEZES WITH SCOPES
CREATE TABLE public.financial_freezes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
    freeze_type         public.freeze_type_enum NOT NULL,
    freeze_scope        public.freeze_scope_enum NOT NULL DEFAULT 'FULL_ACCOUNT',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    reason_code         VARCHAR(100) NOT NULL,
    created_by          UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    approved_by         UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    released_by         UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at         TIMESTAMPTZ
);

-- 10. PROVIDER SETTLEMENTS
CREATE TABLE public.provider_settlements (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_event_id             UUID NOT NULL REFERENCES public.financial_events(id),
    tenant_id                      UUID NOT NULL REFERENCES public.tenants(id),
    amount                         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency                       VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status                         public.settlement_state_enum NOT NULL DEFAULT 'REPORTED',
    provider_account_ref           VARCHAR(255) NOT NULL,
    provider_settlement_reference  VARCHAR(255) UNIQUE NOT NULL,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    provider_type                  VARCHAR(100) NOT NULL,
    provider_account_id            UUID NOT NULL
);

-- 11. QUASAR INDEPENDENT VERIFICATION RECORDS (Traceable Payload Lineage Edition)
CREATE TABLE public.quasar_verification_records (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    withdrawal_id               UUID NOT NULL,
    tenant_id                   UUID NOT NULL REFERENCES public.tenants(id),
    financial_event_id          UUID NOT NULL REFERENCES public.financial_events(id),
    
    invify_available_balance    NUMERIC(15,2) NOT NULL,
    invify_reserved_balance     NUMERIC(15,2) NOT NULL,
    invify_treasury_position    NUMERIC(15,2) NOT NULL,
    
    quasar_available_balance    NUMERIC(15,2) NOT NULL,
    quasar_treasury_position    NUMERIC(15,2) NOT NULL,
    
    verification_hash           VARCHAR(64) NOT NULL,
    verification_status         public.verification_status_enum NOT NULL DEFAULT 'FAILED',
    verified_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    request_hash                VARCHAR(64),
    response_hash               VARCHAR(64),
    verification_reference      VARCHAR(255),
    quasar_transaction_reference VARCHAR(255),
    verification_payload        JSONB,
    verification_result_payload  JSONB
);

-- 12. DISTRIBUTED EXECUTION LOCKS TABLE
CREATE TABLE public.financial_execution_locks (
    lock_key     VARCHAR(255) PRIMARY KEY,
    owner_id     UUID NOT NULL,
    acquired_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL
);

-- 13. CONSISTENCY AUDITS
CREATE TABLE public.financial_consistency_audits (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_event_id     UUID REFERENCES public.financial_events(id),
    tenant_id              UUID REFERENCES public.tenants(id),
    severity               public.audit_severity NOT NULL,
    mismatch_type          VARCHAR(100) NOT NULL,
    details                JSONB NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. EVENT STATE TRANSITION HISTORY TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.log_financial_event_state_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state) OR (TG_OP = 'INSERT') THEN
        INSERT INTO public.financial_event_state_history (financial_event_id, old_state, new_state, changed_at)
        VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.state ELSE NULL END, NEW.state, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_financial_event_state_changes
    AFTER INSERT OR UPDATE ON public.financial_events
    FOR EACH ROW EXECUTE FUNCTION public.log_financial_event_state_changes();

-- 15. JOURNAL BALANCE ENFORCEMENT ASSERTION FUNCTION
CREATE OR REPLACE FUNCTION public.assert_journal_balance(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
    v_debits NUMERIC(15,2);
    v_credits NUMERIC(15,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0.00) INTO v_debits
    FROM public.treasury_journal_entries
    WHERE financial_event_id = p_event_id AND direction = 'debit';

    SELECT COALESCE(SUM(amount), 0.00) INTO v_credits
    FROM public.treasury_journal_entries
    WHERE financial_event_id = p_event_id AND direction = 'credit';

    IF v_debits != v_credits THEN
        INSERT INTO public.financial_consistency_audits (financial_event_id, severity, mismatch_type, details)
        VALUES (
            p_event_id,
            'CRITICAL',
            'JOURNAL_IMBALANCE',
            jsonb_build_object('debits', v_debits, 'credits', v_credits)
        );
        RAISE EXCEPTION 'Journal imbalance detected. Debits: ₦%, Credits: ₦%', v_debits, v_credits;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. FINANCIAL CONSISTENCY AUDITOR (DECOUPLED CALCULATOR)
CREATE OR REPLACE FUNCTION public.verify_financial_consistency(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_ledger_bal NUMERIC(15,2);
    v_active_res NUMERIC(15,2);
    v_unsettled_set NUMERIC(15,2);
    v_computed_avail NUMERIC(15,2);
    v_wallet_cached NUMERIC(15,2);
    v_has_freeze BOOLEAN;
BEGIN
    -- Check active FULL_ACCOUNT freezes
    SELECT EXISTS (
        SELECT 1 FROM public.financial_freezes 
        WHERE tenant_id = p_tenant_id AND is_active = true AND freeze_scope = 'FULL_ACCOUNT'
    ) INTO v_has_freeze;
    
    IF v_has_freeze THEN
        RETURN false;
    END IF;

    -- Calculate Ledger Balance
    SELECT COALESCE(SUM(amount), 0.00) INTO v_ledger_bal
    FROM public.ledger_entries
    WHERE tenant_id = p_tenant_id AND status = 'completed';

    -- Calculate Active Reserves
    SELECT COALESCE(SUM(amount), 0.00) INTO v_active_res
    FROM public.reserved_funds
    WHERE tenant_id = p_tenant_id AND status = 'active';

    -- Calculate Unsettled Settlements
    SELECT COALESCE(SUM(amount), 0.00) INTO v_unsettled_set
    FROM public.provider_settlements
    WHERE tenant_id = p_tenant_id AND status != 'SETTLED';

    -- Computed Available Balance
    v_computed_avail := v_ledger_bal - v_active_res - v_unsettled_set;

    -- Fetch Wallet Cache
    SELECT COALESCE(balance, 0.00) INTO v_wallet_cached
    FROM public.wallets
    WHERE tenant_id = p_tenant_id::text;

    -- Mismatch Detection (raises warning alert, but doesn't override logic check)
    IF v_computed_avail != v_wallet_cached THEN
        INSERT INTO public.financial_consistency_audits (tenant_id, severity, mismatch_type, details)
        VALUES (
            p_tenant_id,
            'WARNING',
            'WALLET_CACHE_DRIFT',
            jsonb_build_object(
                'computed_available', v_computed_avail,
                'wallet_cached', v_wallet_cached
            )
        );
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. FINANCIAL FREEZE SCOPE VALIDATOR
CREATE OR REPLACE FUNCTION public.validate_financial_freeze(p_tenant_id UUID, p_scope public.freeze_scope_enum)
RETURNS BOOLEAN AS $$
DECLARE
    v_frozen BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.financial_freezes 
        WHERE tenant_id = p_tenant_id AND is_active = true 
          AND (freeze_scope = p_scope OR freeze_scope = 'FULL_ACCOUNT')
    ) INTO v_frozen;
    
    IF v_frozen THEN
        RAISE EXCEPTION 'Transaction blocked. Account under active financial freeze with scope: %', p_scope;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. FINANCIAL EVENT STATE MACHINE VALIDATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.validate_financial_event_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate lifecycle transitions on UPDATE
    IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
        IF NOT (
            (OLD.state = 'INITIALIZED' AND NEW.state = 'PENDING') OR
            (OLD.state = 'PENDING' AND NEW.state = 'PROCESSING') OR
            (OLD.state = 'PROCESSING' AND NEW.state = 'COMPLETED') OR
            (OLD.state = 'PROCESSING' AND NEW.state = 'FAILED') OR
            (OLD.state = 'COMPLETED' AND NEW.state = 'REVERSED')
        ) THEN
            RAISE EXCEPTION 'Illegal financial event state transition from % to %', OLD.state, NEW.state;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_financial_event_transition
    BEFORE UPDATE ON public.financial_events
    FOR EACH ROW EXECUTE FUNCTION public.validate_financial_event_transition();

CREATE INDEX idx_journal_event ON public.treasury_journal_entries(financial_event_id);
CREATE INDEX idx_freezes_tenant ON public.financial_freezes(tenant_id) WHERE is_active = true;

COMMIT;

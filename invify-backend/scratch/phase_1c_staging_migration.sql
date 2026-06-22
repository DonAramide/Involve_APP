-- ============================================================================
-- Phase 1C Staging DDL Migration Package (Financial Authority Edition)
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
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. QUASAR INDEPENDENT VERIFICATION RECORDS
CREATE TABLE public.quasar_verification_records (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    withdrawal_id               UUID NOT NULL, -- references external withdrawal request
    tenant_id                   UUID NOT NULL REFERENCES public.tenants(id),
    financial_event_id          UUID NOT NULL REFERENCES public.financial_events(id),
    
    -- Invify Balance states
    invify_available_balance    NUMERIC(15,2) NOT NULL,
    invify_reserved_balance     NUMERIC(15,2) NOT NULL,
    invify_treasury_position    NUMERIC(15,2) NOT NULL,
    
    -- Quasar Independent calculations
    quasar_available_balance    NUMERIC(15,2) NOT NULL,
    quasar_treasury_position    NUMERIC(15,2) NOT NULL,
    
    verification_hash           VARCHAR(64) NOT NULL, -- SHA-256 integrity hash
    verification_status         public.verification_status_enum NOT NULL DEFAULT 'FAILED',
    verified_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
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
CREATE OR REPLACE FUNCTION public.verify_journal_balance(p_event_id UUID)
RETURNS BOOLEAN AS $$
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

    RETURN (v_debits = v_credits);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. FINANCIAL CONSISTENCY AUDITOR
CREATE OR REPLACE FUNCTION public.verify_financial_consistency(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_ledger_total NUMERIC(15,2);
    v_wallet_total NUMERIC(15,2);
    v_has_active_freeze BOOLEAN;
BEGIN
    -- Assert freeze constraints
    SELECT EXISTS (
        SELECT 1 FROM public.financial_freezes 
        WHERE tenant_id = p_tenant_id AND is_active = true
    ) INTO v_has_active_freeze;

    IF v_has_active_freeze THEN
        RETURN false;
    END IF;

    -- Fetch ledger sum
    SELECT COALESCE(SUM(amount), 0.00) INTO v_ledger_total
    FROM public.ledger_entries
    WHERE tenant_id = p_tenant_id AND status = 'completed';

    -- Fetch wallet cache
    SELECT COALESCE(balance, 0.00) INTO v_wallet_total
    FROM public.wallets
    WHERE tenant_id = p_tenant_id::text;

    RETURN (v_ledger_total = v_wallet_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX idx_journal_event ON public.treasury_journal_entries(financial_event_id);
CREATE INDEX idx_freezes_tenant ON public.financial_freezes(tenant_id) WHERE is_active = true;

COMMIT;

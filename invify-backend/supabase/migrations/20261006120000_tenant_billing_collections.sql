/*
=============================================================================
Migration: tenant_billing_collections
Description: Commercial Tenant Billing & Collections (Invify Box / subscriptions /
             setup charges). Integer kobo. Separate from fee orchestration,
             merchant invoices, and tenant wallets. Do not apply to production
             until Phase 33 review.

Rollback: supabase/rollbacks/20261006120000_tenant_billing_collections.sql
=============================================================================
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  unapplied_credit_kobo BIGINT NOT NULL DEFAULT 0 CHECK (unapplied_credit_kobo >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  billing_account_id UUID NOT NULL REFERENCES public.billing_accounts(id),
  plan_name TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  frequency VARCHAR(16) NOT NULL DEFAULT 'MONTHLY',
  next_due DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  billing_account_id UUID NOT NULL REFERENCES public.billing_accounts(id),
  type VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
  gross_amount_kobo BIGINT NOT NULL CHECK (gross_amount_kobo >= 0),
  amount_paid_kobo BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid_kobo >= 0),
  amount_outstanding_kobo BIGINT NOT NULL CHECK (amount_outstanding_kobo >= 0),
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  device_id UUID,
  subscription_id UUID REFERENCES public.billing_subscriptions(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_obligation_paid_le_gross CHECK (amount_paid_kobo <= gross_amount_kobo),
  CONSTRAINT billing_obligation_types CHECK (type IN (
    'DEVICE_PURCHASE','DEVICE_INSTALLMENT','SUBSCRIPTION','SETUP_FEE',
    'INSTALLATION_FEE','DEVICE_REPLACEMENT','OTHER'
  ))
);

CREATE TABLE IF NOT EXISTS public.billing_installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  obligation_id UUID NOT NULL REFERENCES public.billing_obligations(id),
  device_id UUID,
  frequency VARCHAR(16) NOT NULL DEFAULT 'MONTHLY',
  installment_kobo BIGINT NOT NULL CHECK (installment_kobo > 0),
  remaining_kobo BIGINT NOT NULL CHECK (remaining_kobo >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  obligation_id UUID NOT NULL REFERENCES public.billing_obligations(id),
  plan_id UUID NOT NULL REFERENCES public.billing_installment_plans(id),
  sequence INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  paid_kobo BIGINT NOT NULL DEFAULT 0 CHECK (paid_kobo >= 0),
  outstanding_kobo BIGINT NOT NULL CHECK (outstanding_kobo >= 0),
  status VARCHAR(24) NOT NULL,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  waived BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_installment_paid_le_amount CHECK (paid_kobo <= amount_kobo),
  UNIQUE (plan_id, sequence)
);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  billing_account_id UUID NOT NULL REFERENCES public.billing_accounts(id),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  allocated_kobo BIGINT NOT NULL DEFAULT 0 CHECK (allocated_kobo >= 0),
  unapplied_kobo BIGINT NOT NULL DEFAULT 0 CHECK (unapplied_kobo >= 0),
  method VARCHAR(24) NOT NULL,
  reference TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  status VARCHAR(24) NOT NULL,
  verification TEXT,
  posted_by TEXT NOT NULL,
  posted_by_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversal_id UUID,
  CONSTRAINT billing_payment_alloc_le_amount CHECK (allocated_kobo + unapplied_kobo <= amount_kobo),
  UNIQUE (tenant_id, reference),
  UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.billing_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.billing_payments(id),
  installment_id UUID REFERENCES public.billing_installments(id),
  obligation_id UUID REFERENCES public.billing_obligations(id),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_payment_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES public.billing_payments(id),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  billing_account_id UUID,
  obligation_id UUID,
  payment_id UUID,
  amount_kobo BIGINT,
  previous_state JSONB,
  new_state JSONB,
  reference TEXT,
  reason TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_accounts_tenant_idx ON public.billing_accounts (tenant_id);
CREATE INDEX IF NOT EXISTS billing_obligations_tenant_status_idx ON public.billing_obligations (tenant_id, status);
CREATE INDEX IF NOT EXISTS billing_obligations_due_idx ON public.billing_obligations (due_date);
CREATE INDEX IF NOT EXISTS billing_installments_tenant_due_idx ON public.billing_installments (tenant_id, due_date, status);
CREATE INDEX IF NOT EXISTS billing_payments_tenant_status_idx ON public.billing_payments (tenant_id, status);
CREATE INDEX IF NOT EXISTS billing_payments_reference_idx ON public.billing_payments (reference);
CREATE INDEX IF NOT EXISTS billing_audit_tenant_idx ON public.billing_audit_events (tenant_id, created_at DESC);

COMMENT ON TABLE public.billing_accounts IS 'Invify commercial AR with a tenant. Not a spendable wallet. Not fee orchestration.';
COMMENT ON TABLE public.billing_obligations IS 'What the tenant owes Invify (box, subscription, setup). Not POS invoices.';
COMMENT ON COLUMN public.billing_payments.amount_kobo IS 'Integer kobo. Never floating-point.';

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payment_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_domain_events ENABLE ROW LEVEL SECURITY;

-- Platform backend (service_role) only. Tenants must not read another tenant's AR.
DROP POLICY IF EXISTS billing_accounts_service ON public.billing_accounts;
CREATE POLICY billing_accounts_service ON public.billing_accounts
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_subscriptions_service ON public.billing_subscriptions;
CREATE POLICY billing_subscriptions_service ON public.billing_subscriptions
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_obligations_service ON public.billing_obligations;
CREATE POLICY billing_obligations_service ON public.billing_obligations
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_installment_plans_service ON public.billing_installment_plans;
CREATE POLICY billing_installment_plans_service ON public.billing_installment_plans
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_installments_service ON public.billing_installments;
CREATE POLICY billing_installments_service ON public.billing_installments
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_payments_service ON public.billing_payments;
CREATE POLICY billing_payments_service ON public.billing_payments
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_payment_allocations_service ON public.billing_payment_allocations;
CREATE POLICY billing_payment_allocations_service ON public.billing_payment_allocations
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_payment_reversals_service ON public.billing_payment_reversals;
CREATE POLICY billing_payment_reversals_service ON public.billing_payment_reversals
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_audit_events_service ON public.billing_audit_events;
CREATE POLICY billing_audit_events_service ON public.billing_audit_events
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS billing_domain_events_service ON public.billing_domain_events;
CREATE POLICY billing_domain_events_service ON public.billing_domain_events
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMIT;

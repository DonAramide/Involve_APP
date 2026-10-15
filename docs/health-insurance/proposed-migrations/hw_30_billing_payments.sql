-- PROPOSED — NOT APPLIED. Phase 1 design artefact.
-- hw_30_billing_payments: dedicated health premium invoices, payments, allocations, and reconciliation.
-- Additive only.
-- Enforces:
--  - Complete separation from School Mode fee_structures and student tuition balances
--  - Integer kobo (bigint) currency precision
--  - Forward-only payment and invoice state transitions
--  - Server-verified Quasar payment completion before marking successful
--  - Strict allocation uniqueness (preventing duplicate ledger or invoice credits)

BEGIN;

DO $$ BEGIN
  IF to_regclass('public.hw_enrolments') IS NULL THEN
    RAISE EXCEPTION 'hw_30: prerequisite table public.hw_enrolments is missing';
  END IF;
END $$;

-- ---------------------------------------------------------------- premium invoices
CREATE TABLE IF NOT EXISTS public.hw_premium_invoices (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  enrolment_id             uuid NOT NULL REFERENCES public.hw_enrolments(id) ON DELETE RESTRICT,
  invoice_number           text NOT NULL,                                     -- e.g., 'HW-INV-2026-00001'
  payer_type               text NOT NULL CHECK (payer_type IN ('school', 'employer', 'guardian', 'staff', 'member')),
  payer_user_id            uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  guardian_link_id         uuid REFERENCES public.hw_guardian_links(id) ON DELETE RESTRICT,
  amount_due_minor         bigint NOT NULL CHECK (amount_due_minor > 0),      -- integer kobo
  amount_paid_minor        bigint NOT NULL DEFAULT 0 CHECK (amount_paid_minor >= 0),
  amount_refunded_minor    bigint NOT NULL DEFAULT 0 CHECK (amount_refunded_minor >= 0),
  currency                 char(3) NOT NULL DEFAULT 'NGN',
  status                   text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'issued',
    'partially_paid',
    'paid',
    'void',
    'refunded'
  )),
  due_date                 date NOT NULL,
  issued_at                timestamptz,
  paid_at                  timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number),
  CHECK (amount_paid_minor <= amount_due_minor),
  CHECK (amount_refunded_minor <= amount_paid_minor),
  CHECK (status <> 'paid' OR (amount_paid_minor = amount_due_minor AND paid_at IS NOT NULL)),
  CHECK (status <> 'issued' OR issued_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_hw_invoice_tenant_status ON public.hw_premium_invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_hw_invoice_enrolment ON public.hw_premium_invoices (tenant_id, enrolment_id);
CREATE INDEX IF NOT EXISTS ix_hw_invoice_payer ON public.hw_premium_invoices (tenant_id, payer_type, payer_user_id);

DROP TRIGGER IF EXISTS trg_hw_invoice_tenant ON public.hw_premium_invoices;
CREATE TRIGGER trg_hw_invoice_tenant BEFORE INSERT OR UPDATE OF tenant_id, enrolment_id ON public.hw_premium_invoices
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('hw_enrolments', 'enrolment_id', 'tenant_id::text');

DROP TRIGGER IF EXISTS trg_hw_invoice_upd ON public.hw_premium_invoices;
CREATE TRIGGER trg_hw_invoice_upd BEFORE UPDATE ON public.hw_premium_invoices FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- Invoice state transition trigger
CREATE OR REPLACE FUNCTION public.hw_invoice_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF (OLD.status, NEW.status) IN (
    ('draft', 'issued'),
    ('draft', 'void'),
    ('issued', 'partially_paid'),
    ('issued', 'paid'),
    ('issued', 'void'),
    ('partially_paid', 'paid'),
    ('partially_paid', 'refunded'),
    ('paid', 'refunded')
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'hw: illegal invoice status transition % -> %', OLD.status, NEW.status
    USING ERRCODE = 'integrity_constraint_violation';
END $$;

DROP TRIGGER IF EXISTS trg_hw_invoice_transition ON public.hw_premium_invoices;
CREATE TRIGGER trg_hw_invoice_transition BEFORE UPDATE OF status ON public.hw_premium_invoices
  FOR EACH ROW EXECUTE FUNCTION public.hw_invoice_transition();

-- ---------------------------------------------------------------- premium payments
CREATE TABLE IF NOT EXISTS public.hw_payments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  payment_reference        text NOT NULL,                                     -- Invify unique payment reference
  quasar_reference         text,                                              -- Quasar payment transaction reference
  idempotency_key          text NOT NULL UNIQUE,                              -- Client / caller idempotency token
  amount_minor             bigint NOT NULL CHECK (amount_minor > 0),          -- integer kobo
  currency                 char(3) NOT NULL DEFAULT 'NGN',
  status                   text NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated',
    'pending',
    'successful',
    'failed',
    'reversed',
    'refunded'
  )),
  payment_channel          text NOT NULL CHECK (payment_channel IN ('quasar_va', 'quasar_card', 'quasar_direct', 'manual_reconciled')),
  payer_id                 uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  payment_metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at              timestamptz,                                       -- MUST be populated by backend verification before 'successful'
  reconciled_at            timestamptz,                                       -- Internal ledger reconciliation timestamp
  ledger_journal_id        uuid,                                              -- Link to public.ledgers row if ledgered
  remitted_to_insurer_at   timestamptz,                                       -- Insurer remittance tracking
  failure_reason           text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, payment_reference),
  CHECK (status <> 'successful' OR verified_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_hw_payment_tenant_status ON public.hw_payments (tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_hw_payment_quasar_ref ON public.hw_payments (quasar_reference);
CREATE INDEX IF NOT EXISTS ix_hw_payment_reconciliation ON public.hw_payments (tenant_id, reconciled_at) WHERE status = 'successful';

DROP TRIGGER IF EXISTS trg_hw_payment_upd ON public.hw_payments;
CREATE TRIGGER trg_hw_payment_upd BEFORE UPDATE ON public.hw_payments FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- Payment state machine transition trigger
CREATE OR REPLACE FUNCTION public.hw_payment_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF (OLD.status, NEW.status) IN (
    ('initiated', 'pending'),
    ('initiated', 'failed'),
    ('pending', 'successful'),
    ('pending', 'failed'),
    ('successful', 'reversed'),
    ('successful', 'refunded')
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'hw: illegal payment status transition % -> %', OLD.status, NEW.status
    USING ERRCODE = 'integrity_constraint_violation';
END $$;

DROP TRIGGER IF EXISTS trg_hw_payment_transition ON public.hw_payments;
CREATE TRIGGER trg_hw_payment_transition BEFORE UPDATE OF status ON public.hw_payments
  FOR EACH ROW EXECUTE FUNCTION public.hw_payment_transition();

-- ---------------------------------------------------------------- payment allocations
CREATE TABLE IF NOT EXISTS public.hw_payment_allocations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  payment_id               uuid NOT NULL REFERENCES public.hw_payments(id) ON DELETE RESTRICT,
  invoice_id               uuid NOT NULL REFERENCES public.hw_premium_invoices(id) ON DELETE RESTRICT,
  allocated_amount_minor   bigint NOT NULL CHECK (allocated_amount_minor > 0),
  currency                 char(3) NOT NULL DEFAULT 'NGN',
  allocated_at             timestamptz NOT NULL DEFAULT now(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, invoice_id)                                             -- Strictly prevents duplicate allocation of same payment to invoice
);

CREATE INDEX IF NOT EXISTS ix_hw_alloc_invoice ON public.hw_payment_allocations (invoice_id);

DROP TRIGGER IF EXISTS trg_hw_alloc_tenant_payment ON public.hw_payment_allocations;
CREATE TRIGGER trg_hw_alloc_tenant_payment BEFORE INSERT OR UPDATE OF tenant_id, payment_id ON public.hw_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('hw_payments', 'payment_id', 'tenant_id::text');

DROP TRIGGER IF EXISTS trg_hw_alloc_tenant_invoice ON public.hw_payment_allocations;
CREATE TRIGGER trg_hw_alloc_tenant_invoice BEFORE INSERT OR UPDATE OF tenant_id, invoice_id ON public.hw_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('hw_premium_invoices', 'invoice_id', 'tenant_id::text');

COMMIT;

-- PROPOSED — NOT APPLIED. Phase 1 design artefact.
-- hw_20_policies_enrolments: enrolments, policies, claims, provider events.
-- Additive only.
-- Enforces:
--  - Distinct enrolment lifecycle state machine
--  - Provider-confirmed policy activation independent of payment
--  - Strictly scoped claims and authorisations (no clinical notes/diagnoses)
--  - Idempotent provider event logging

BEGIN;

DO $$ BEGIN
  IF to_regclass('public.hw_members') IS NULL OR to_regclass('public.hw_plan_versions') IS NULL THEN
    RAISE EXCEPTION 'hw_20: required prerequisite tables from hw_00 and hw_10 are missing';
  END IF;
END $$;

-- ---------------------------------------------------------------- enrolments
CREATE TABLE IF NOT EXISTS public.hw_enrolments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  member_id                uuid NOT NULL REFERENCES public.hw_members(id) ON DELETE RESTRICT,
  plan_version_id          uuid NOT NULL REFERENCES public.hw_plan_versions(id) ON DELETE RESTRICT,
  period_start             date NOT NULL,
  period_end               date NOT NULL,
  status                   text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'enrolment_pending',
    'awaiting_verification',
    'awaiting_premium_payment',
    'awaiting_insurer_activation',
    'active',
    'suspended',
    'expired',
    'cancelled',
    'rejected'
  )),
  status_reason            text,
  submitted_by             uuid REFERENCES public.users(id),
  submitted_at             timestamptz,
  verified_by              uuid REFERENCES public.users(id),
  verified_at              timestamptz,
  provider_sync_status     text NOT NULL DEFAULT 'pending' CHECK (provider_sync_status IN ('pending', 'submitted', 'synced', 'failed')),
  last_provider_sync_at    timestamptz,
  provider_error           text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS ix_hw_enrolment_tenant_status ON public.hw_enrolments (tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_hw_enrolment_member ON public.hw_enrolments (tenant_id, member_id);
CREATE INDEX IF NOT EXISTS ix_hw_enrolment_period ON public.hw_enrolments (tenant_id, period_start, period_end);

-- Prevent overlapping active/pending enrolments for the same member under the same tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_enrolment_active_period 
  ON public.hw_enrolments (tenant_id, member_id, plan_version_id, period_start)
  WHERE status NOT IN ('cancelled', 'rejected', 'expired');

DROP TRIGGER IF EXISTS trg_hw_enrolment_tenant ON public.hw_enrolments;
CREATE TRIGGER trg_hw_enrolment_tenant BEFORE INSERT OR UPDATE OF tenant_id, member_id ON public.hw_enrolments
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('hw_members', 'member_id', 'tenant_id::text');

DROP TRIGGER IF EXISTS trg_hw_enrolment_upd ON public.hw_enrolments;
CREATE TRIGGER trg_hw_enrolment_upd BEFORE UPDATE ON public.hw_enrolments FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- Enrolment state machine transition enforcement
CREATE OR REPLACE FUNCTION public.hw_enrolment_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  -- Valid transition map
  IF (OLD.status, NEW.status) IN (
    ('draft', 'enrolment_pending'),
    ('draft', 'cancelled'),
    ('enrolment_pending', 'awaiting_verification'),
    ('enrolment_pending', 'cancelled'),
    ('awaiting_verification', 'awaiting_premium_payment'),
    ('awaiting_verification', 'awaiting_insurer_activation'), -- When plan has activation_requires_payment = false
    ('awaiting_verification', 'rejected'),
    ('awaiting_verification', 'cancelled'),
    ('awaiting_premium_payment', 'awaiting_insurer_activation'),
    ('awaiting_premium_payment', 'cancelled'),
    ('awaiting_insurer_activation', 'active'),
    ('awaiting_insurer_activation', 'rejected'),
    ('awaiting_insurer_activation', 'cancelled'),
    ('active', 'suspended'),
    ('active', 'expired'),
    ('active', 'cancelled'),
    ('suspended', 'active'),
    ('suspended', 'cancelled'),
    ('suspended', 'expired')
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'hw: illegal enrolment transition % -> %', OLD.status, NEW.status
    USING ERRCODE = 'integrity_constraint_violation';
END $$;

DROP TRIGGER IF EXISTS trg_hw_enrolment_transition ON public.hw_enrolments;
CREATE TRIGGER trg_hw_enrolment_transition BEFORE UPDATE OF status ON public.hw_enrolments
  FOR EACH ROW EXECUTE FUNCTION public.hw_enrolment_transition();

-- ---------------------------------------------------------------- policies (insurer-confirmed coverage records)
CREATE TABLE IF NOT EXISTS public.hw_policies (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  enrolment_id             uuid NOT NULL UNIQUE REFERENCES public.hw_enrolments(id) ON DELETE RESTRICT,
  provider_id              uuid NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  policy_number            text NOT NULL,                                     -- Insurer issued policy reference
  certificate_url          text,                                              -- Secure signed reference if generated
  status                   text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'active',
    'suspended',
    'expired',
    'cancelled',
    'rejected_by_provider'
  )),
  effective_date           date NOT NULL,
  expiry_date              date NOT NULL,
  activation_event_id      text,                                              -- References the immutable provider event
  activation_confirmed_at  timestamptz,
  last_verified_at         timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (expiry_date >= effective_date),
  -- Active coverage strictly requires verified insurer activation metadata
  CHECK (status <> 'active' OR (activation_confirmed_at IS NOT NULL AND activation_event_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS ix_hw_policy_tenant_status ON public.hw_policies (tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_hw_policy_provider_num ON public.hw_policies (provider_id, policy_number);

DROP TRIGGER IF EXISTS trg_hw_policy_tenant ON public.hw_policies;
CREATE TRIGGER trg_hw_policy_tenant BEFORE INSERT OR UPDATE OF tenant_id, enrolment_id ON public.hw_policies
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('hw_enrolments', 'enrolment_id', 'tenant_id::text');

DROP TRIGGER IF EXISTS trg_hw_policy_upd ON public.hw_policies;
CREATE TRIGGER trg_hw_policy_upd BEFORE UPDATE ON public.hw_policies FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- Trigger guaranteeing that hw_enrolments can only transition to 'active' if an active policy exists
CREATE OR REPLACE FUNCTION public.hw_enrolment_active_policy_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_policy_status text;
BEGIN
  IF NEW.status = 'active' AND OLD.status <> 'active' THEN
    SELECT status INTO v_policy_status FROM public.hw_policies WHERE enrolment_id = NEW.id;
    IF v_policy_status IS NULL OR v_policy_status <> 'active' THEN
      RAISE EXCEPTION 'hw: cannot set enrolment % to active without verified active provider policy', NEW.id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hw_enrolment_active_policy_check ON public.hw_enrolments;
CREATE TRIGGER trg_hw_enrolment_active_policy_check BEFORE UPDATE OF status ON public.hw_enrolments
  FOR EACH ROW EXECUTE FUNCTION public.hw_enrolment_active_policy_check();

-- ---------------------------------------------------------------- claims & treatment authorisations (metadata only)
CREATE TABLE IF NOT EXISTS public.hw_claim_status_records (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  policy_id                uuid NOT NULL REFERENCES public.hw_policies(id) ON DELETE RESTRICT,
  member_id                uuid NOT NULL REFERENCES public.hw_members(id) ON DELETE RESTRICT,
  facility_id              uuid REFERENCES public.hw_facilities(id) ON DELETE SET NULL,
  claim_reference          text NOT NULL,                                     -- Insurer/HMO authorisation code
  record_type              text NOT NULL CHECK (record_type IN ('pre_authorisation', 'claim')),
  status                   text NOT NULL CHECK (status IN ('submitted', 'pending', 'approved', 'rejected', 'settled')),
  submitted_date           date NOT NULL,
  status_date              timestamptz NOT NULL,
  authorised_amount_minor  bigint CHECK (authorised_amount_minor >= 0),
  currency                 char(3) NOT NULL DEFAULT 'NGN',
  rejection_reason         text,                                              -- Generic administrative reason code only
  last_synced_at           timestamptz NOT NULL DEFAULT now(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, claim_reference)
);

CREATE INDEX IF NOT EXISTS ix_hw_claim_policy ON public.hw_claim_status_records (tenant_id, policy_id);
CREATE INDEX IF NOT EXISTS ix_hw_claim_member ON public.hw_claim_status_records (tenant_id, member_id);

DROP TRIGGER IF EXISTS trg_hw_claim_upd ON public.hw_claim_status_records;
CREATE TRIGGER trg_hw_claim_upd BEFORE UPDATE ON public.hw_claim_status_records FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ---------------------------------------------------------------- provider webhook / event ingress
CREATE TABLE IF NOT EXISTS public.hw_provider_events (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id              uuid NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  event_id                 text NOT NULL,                                     -- Provider event unique identifier
  event_type               text NOT NULL,                                     -- e.g., 'policy.activated', 'claim.status_changed'
  occurred_at              timestamptz NOT NULL,
  signature_verified       boolean NOT NULL DEFAULT false,
  processing_status        text NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processed', 'ignored_duplicate', 'ignored_out_of_order', 'failed')),
  error_message            text,
  raw_payload_redacted     jsonb NOT NULL,                                    -- Redacted of any raw clinical content
  processed_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, event_id),
  CHECK (signature_verified = true OR processing_status = 'failed')
);

CREATE INDEX IF NOT EXISTS ix_hw_provider_events_proc ON public.hw_provider_events (provider_id, processing_status);

COMMIT;

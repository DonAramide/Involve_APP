-- PROPOSED — NOT APPLIED.
-- Bank-owned HMO offering. One row per bank agent and published plan version.
-- Does not copy HMO, plan, category, provider, or price data.
-- Does not alter hw_plan_versions, hw_tenant_plan_offers, enrolments, or invoices.
-- Does not insert any offering rows.
--
-- hw_audit_events is not used: its tenant_id is required, and this offering
-- belongs to a bank rather than a tenant. History is the append-only
-- hw_bank_hmo_offering_events table in this file.
--
-- Rollback, when separately authorised, and only while no application depends
-- on these tables:
--   DROP TABLE IF EXISTS public.hw_bank_hmo_offering_events;
--   DROP TABLE IF EXISTS public.hw_bank_hmo_offerings;
--   DROP FUNCTION IF EXISTS public.hw_bank_hmo_offering_guard();
--   DROP FUNCTION IF EXISTS public.hw_bank_hmo_offering_event_immutable();
-- Do not drop hw_plan_versions, hw_tenant_plan_offers, agents, or users.

BEGIN;

CREATE TABLE IF NOT EXISTS public.hw_bank_hmo_offerings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         uuid NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  plan_version_id  uuid NOT NULL REFERENCES public.hw_plan_versions(id) ON DELETE RESTRICT,
  is_active        boolean NOT NULL DEFAULT false,
  reason           text NOT NULL,
  created_by       uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by       uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_hw_bank_hmo_offering UNIQUE (agent_id, plan_version_id),
  CONSTRAINT hw_bank_hmo_offering_reason_length CHECK (char_length(btrim(reason)) >= 5)
);

CREATE INDEX IF NOT EXISTS ix_hw_bank_hmo_offering_agent_active
  ON public.hw_bank_hmo_offerings (agent_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS ix_hw_bank_hmo_offering_version
  ON public.hw_bank_hmo_offerings (plan_version_id);

COMMENT ON TABLE public.hw_bank_hmo_offerings IS
  'Bank distribution switch for one published hw_plan_versions row. Reference price stays on that version. No bank price is stored here.';

-- Latest reason lives on the offering. Every status change also appends an event.
-- Reactivation updates the same offering row (the unique pair forbids a second row)
-- and inserts another event. Earlier events are not rewritten.
CREATE TABLE IF NOT EXISTS public.hw_bank_hmo_offering_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id         uuid NOT NULL REFERENCES public.hw_bank_hmo_offerings(id) ON DELETE RESTRICT,
  agent_id            uuid NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  action              text NOT NULL CHECK (action IN ('activated', 'deactivated', 'reactivated')),
  previous_is_active  boolean,
  new_is_active       boolean NOT NULL,
  actor_user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason              text NOT NULL,
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hw_bank_hmo_offering_event_reason_length CHECK (char_length(btrim(reason)) >= 5)
);

CREATE INDEX IF NOT EXISTS ix_hw_bank_hmo_offering_events_offering
  ON public.hw_bank_hmo_offering_events (offering_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_hw_bank_hmo_offering_events_agent
  ON public.hw_bank_hmo_offering_events (agent_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.hw_bank_hmo_offering_event_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'hw: bank HMO offering events are append-only';
END $$;

DROP TRIGGER IF EXISTS trg_hw_bank_hmo_offering_events_immutable ON public.hw_bank_hmo_offering_events;
CREATE TRIGGER trg_hw_bank_hmo_offering_events_immutable
  BEFORE UPDATE OR DELETE ON public.hw_bank_hmo_offering_events
  FOR EACH ROW EXECUTE FUNCTION public.hw_bank_hmo_offering_event_immutable();

-- Owner must be a non-deleted agent whose institution_type is BANK.
-- A new activation or a reactivation requires the plan version to be published.
-- Deactivation is still allowed after the version is later retired, so an
-- existing offering can be switched off without rewriting enrolments or invoices.
CREATE OR REPLACE FUNCTION public.hw_bank_hmo_offering_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  institution text;
  version_status text;
  turning_on boolean;
BEGIN
  SELECT upper(btrim(institution_type))
    INTO institution
  FROM public.agents
  WHERE id = NEW.agent_id
    AND deleted_at IS NULL;

  IF institution IS DISTINCT FROM 'BANK' THEN
    RAISE EXCEPTION 'hw: only a BANK agent can own an HMO offering';
  END IF;

  SELECT status INTO version_status
  FROM public.hw_plan_versions
  WHERE id = NEW.plan_version_id;

  turning_on := NEW.is_active
    AND (TG_OP = 'INSERT' OR OLD.is_active IS DISTINCT FROM true);

  IF turning_on AND version_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'hw: a bank offering can be activated only for a published plan version';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hw_bank_hmo_offering_guard ON public.hw_bank_hmo_offerings;
CREATE TRIGGER trg_hw_bank_hmo_offering_guard
  BEFORE INSERT OR UPDATE ON public.hw_bank_hmo_offerings
  FOR EACH ROW EXECUTE FUNCTION public.hw_bank_hmo_offering_guard();

ALTER TABLE public.hw_bank_hmo_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_bank_hmo_offering_events ENABLE ROW LEVEL SECURITY;

COMMIT;

-- DO NOT APPLY / DO NOT RERUN
-- Applied once on staging project rpcjelhacmkhzguljdgi (SQL Editor, 2026-10-28).
-- Do not rerun this file. Follow-up grant/RPC lockdown is
-- DO_NOT_APPLY_hw_invify_catalogue_audit_lockdown.sql and requires a
-- separate explicit approval.
--
-- UNAPPLIED originally — Invify-managed HMO catalogue (Phase 2).
-- Isolated disposable-database testing only.
-- Does not enable School ID Card persistence.
-- Does not post ledgers, invoices, enrolments, or payouts.
--
-- Prerequisites (must already exist): public.users, public.hw_providers,
-- public.hw_plans, public.hw_plan_versions, public.hw_facilities.
-- Those tables are defined in 20261015010000_hw_00_foundation.sql (also
-- still labelled proposed in-repo). Applying this file first will fail.
--
-- Why existing entities are insufficient
-- --------------------------------------
-- hw_providers is an HMO organisation (licence, adapter), not a sellable offering.
-- hw_plans / hw_plan_versions are coverage products of an HMO; HMO portal and
-- platform already share those rows with no catalogue_scope.
-- hw_plan_versions.benefits is jsonb without identity, so a benefit cannot be
-- independently assigned, priced, or referenced by a bank override.
-- hw_facilities.services is a text[] of network tags, not a priced service.
-- hw_bank_hmo_offerings is a bank distribution switch on plan_version_id, not
-- an Invify offering tree.
-- hw_tenant_plan_offers is tenant funding on a version, not a master SKU.
-- Mapping provider=offering / plan=product would silently mix tenant-HMO plans
-- with Invify master records and would collide with bank "offering" naming.
--
-- AAA000 ownership
-- ----------------
-- institutions seed AAA000 is an AGGREGATOR with PAYMENTS/TRANSFERS/VIRTUAL_ACCOUNTS
-- only. No hw_providers row is seeded for that institution. agents.agent_code
-- AAA000 is unique; tenants.agent_code is not. This migration therefore does
-- NOT bind catalogue rows to AAA000, a tenant, or a guessed provider.
-- Invify master rows use ownership_scope = 'invify_master' and require
-- owner_provider_id IS NULL.
--
-- Phase 3 hook
-- ------------
-- Banks will subscribe by hw_catalogue_offerings.id and optionally
-- hw_catalogue_products.id. Master rows are not updated by a bank write.
-- Existing hw_bank_hmo_offerings.plan_version_id remains valid for plan
-- distribution; a later additive FK catalogue_offering_id may be added
-- without rewriting master rows.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL
     OR to_regclass('public.hw_providers') IS NULL
     OR to_regclass('public.hw_plans') IS NULL
     OR to_regclass('public.hw_plan_versions') IS NULL
     OR to_regclass('public.hw_facilities') IS NULL THEN
    RAISE EXCEPTION
      'hw_invify_catalogue: prerequisite hw_* / users tables are missing. Do not apply this file first.';
  END IF;
END $$;

-- Composite unique lets products FK (plan_version_id, plan_id) so a version
-- cannot be associated with a different plan. (id) is already unique; (id, plan_id)
-- is a dependent uniqueness used only for the FK.
DO $$
BEGIN
  ALTER TABLE public.hw_plan_versions
    ADD CONSTRAINT uq_hw_plan_versions_id_plan UNIQUE (id, plan_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.hw_catalogue_offerings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL,
  name                text NOT NULL,
  description         text,
  status              text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published', 'suspended', 'retired')),
  ownership_scope     text NOT NULL DEFAULT 'invify_master'
                      CHECK (ownership_scope IN ('invify_master', 'hmo_provider')),
  owner_provider_id   uuid REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  created_by          uuid REFERENCES public.users(id),
  published_by        uuid REFERENCES public.users(id),
  published_at        timestamptz,
  retired_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (code ~ '^[A-Za-z0-9_-]{2,60}$'),
  CHECK (
    (ownership_scope = 'invify_master' AND owner_provider_id IS NULL)
    OR (ownership_scope = 'hmo_provider' AND owner_provider_id IS NOT NULL)
  ),
  CHECK (status <> 'published' OR published_at IS NOT NULL),
  CHECK (status <> 'retired' OR retired_at IS NOT NULL),
  CONSTRAINT uq_hw_catalogue_offerings_code UNIQUE (code)
);

COMMENT ON TABLE public.hw_catalogue_offerings IS
  'Invify-managed HMO offering. ownership_scope=invify_master is platform-owned and is not a tenant. Do not bind AAA000.';

CREATE TABLE IF NOT EXISTS public.hw_catalogue_services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id   uuid NOT NULL REFERENCES public.hw_catalogue_offerings(id) ON DELETE RESTRICT,
  code          text NOT NULL,
  name          text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'suspended', 'retired')),
  sort_order    integer NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (code ~ '^[A-Za-z0-9_-]{2,60}$'),
  CONSTRAINT uq_hw_catalogue_services_code UNIQUE (offering_id, code)
);

CREATE INDEX IF NOT EXISTS ix_hw_catalogue_services_offering
  ON public.hw_catalogue_services (offering_id, status);

CREATE TABLE IF NOT EXISTS public.hw_catalogue_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id       uuid NOT NULL REFERENCES public.hw_catalogue_services(id) ON DELETE RESTRICT,
  code             text NOT NULL,
  name             text NOT NULL,
  description      text,
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published', 'suspended', 'retired')),
  -- Optional association to an existing plan version for premium/enrolment.
  -- Association only: this table never updates hw_plans / hw_plan_versions.
  plan_id          uuid REFERENCES public.hw_plans(id) ON DELETE RESTRICT,
  plan_version_id  uuid REFERENCES public.hw_plan_versions(id) ON DELETE RESTRICT,
  price_minor      bigint CHECK (price_minor IS NULL OR price_minor >= 0),
  currency         char(3) NOT NULL DEFAULT 'NGN',
  coverage         jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by       uuid REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (code ~ '^[A-Za-z0-9_-]{2,60}$'),
  CHECK ((plan_version_id IS NULL) = (plan_id IS NULL)),
  CONSTRAINT uq_hw_catalogue_products_code UNIQUE (service_id, code),
  CONSTRAINT fk_hw_catalogue_products_plan_pair
    FOREIGN KEY (plan_version_id, plan_id)
    REFERENCES public.hw_plan_versions (id, plan_id)
);

CREATE INDEX IF NOT EXISTS ix_hw_catalogue_products_service
  ON public.hw_catalogue_products (service_id, status);
CREATE INDEX IF NOT EXISTS ix_hw_catalogue_products_plan_version
  ON public.hw_catalogue_products (plan_version_id)
  WHERE plan_version_id IS NOT NULL;

-- Care delivery eligibility. Facilities are not HMO organisations.
CREATE TABLE IF NOT EXISTS public.hw_catalogue_product_facilities (
  product_id   uuid NOT NULL REFERENCES public.hw_catalogue_products(id) ON DELETE CASCADE,
  facility_id  uuid NOT NULL REFERENCES public.hw_facilities(id) ON DELETE RESTRICT,
  is_eligible  boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES public.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, facility_id)
);

DO $$
BEGIN
  IF to_regprocedure('public.hw_set_updated_at()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_hw_catalogue_offerings_upd ON public.hw_catalogue_offerings;
    CREATE TRIGGER trg_hw_catalogue_offerings_upd
      BEFORE UPDATE ON public.hw_catalogue_offerings
      FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();
    DROP TRIGGER IF EXISTS trg_hw_catalogue_services_upd ON public.hw_catalogue_services;
    CREATE TRIGGER trg_hw_catalogue_services_upd
      BEFORE UPDATE ON public.hw_catalogue_services
      FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();
    DROP TRIGGER IF EXISTS trg_hw_catalogue_products_upd ON public.hw_catalogue_products;
    CREATE TRIGGER trg_hw_catalogue_products_upd
      BEFORE UPDATE ON public.hw_catalogue_products
      FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();
  END IF;
END $$;

-- Catalogue audit is not tenant-owned. hw_audit_events.tenant_id is NOT NULL
-- and REFERENCES tenants(id). Bank HMO events already use a dedicated table
-- for the same reason. Do not insert catalogue rows into hw_audit_events and
-- do not bind institution seed 00000000-0000-0000-0000-000000000000.
CREATE TABLE IF NOT EXISTS public.hw_catalogue_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  actor_role       text NOT NULL DEFAULT 'platform_admin',
  action           text NOT NULL CHECK (action ~ '^catalogue\.'),
  resource_type    text NOT NULL,
  resource_id      text NOT NULL,
  changes          jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform_reason  text NOT NULL CHECK (char_length(btrim(platform_reason)) >= 5),
  occurred_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_hw_catalogue_events_resource
  ON public.hw_catalogue_events (resource_type, resource_id, occurred_at DESC);

COMMENT ON TABLE public.hw_catalogue_events IS
  'Append-only Invify catalogue audit. No tenant_id. Not hw_audit_events.';

DO $$
BEGIN
  IF to_regprocedure('public.hw_block_mutation()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_hw_catalogue_events_immutable ON public.hw_catalogue_events;
    CREATE TRIGGER trg_hw_catalogue_events_immutable
      BEFORE UPDATE OR DELETE ON public.hw_catalogue_events
      FOR EACH ROW EXECUTE FUNCTION public.hw_block_mutation();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hw_catalogue_apply_mutation(
  p_op text,
  p_payload jsonb,
  p_actor_user_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offering public.hw_catalogue_offerings%ROWTYPE;
  v_service public.hw_catalogue_services%ROWTYPE;
  v_product public.hw_catalogue_products%ROWTYPE;
  v_result jsonb;
  v_offering_id uuid;
  v_service_id uuid;
  v_product_id uuid;
  v_facility_id uuid;
  v_plan_id uuid;
  v_plan_version_id uuid;
  v_next text;
  v_eligible boolean;
  v_event_action text;
  v_event_type text;
  v_event_id text;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'catalogue actor is required' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'catalogue audit reason is required' USING ERRCODE = '22023';
  END IF;

  CASE p_op
    WHEN 'create_offering' THEN
      IF COALESCE(p_payload->>'ownership_scope', 'invify_master') <> 'invify_master'
         OR NULLIF(p_payload->>'owner_provider_id', '') IS NOT NULL
         OR NULLIF(p_payload->>'owner_tenant_id', '') IS NOT NULL THEN
        RAISE EXCEPTION 'Invify master offerings cannot bind a provider or tenant' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.hw_catalogue_offerings (
        code, name, description, status, ownership_scope, owner_provider_id, created_by
      ) VALUES (
        p_payload->>'code',
        p_payload->>'name',
        NULLIF(btrim(COALESCE(p_payload->>'description', '')), ''),
        'draft',
        'invify_master',
        NULL,
        p_actor_user_id
      ) RETURNING * INTO v_offering;
      v_result := to_jsonb(v_offering);
      v_event_action := 'catalogue.offering.created';
      v_event_type := 'hw_catalogue_offerings';
      v_event_id := v_offering.id::text;

    WHEN 'update_offering' THEN
      v_offering_id := (p_payload->>'offering_id')::uuid;
      SELECT * INTO v_offering
        FROM public.hw_catalogue_offerings
       WHERE id = v_offering_id
       FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Offering was not found' USING ERRCODE = '22023';
      END IF;
      IF v_offering.ownership_scope <> 'invify_master' OR v_offering.owner_provider_id IS NOT NULL THEN
        RAISE EXCEPTION 'Platform catalogue writes are limited to ownership_scope=invify_master' USING ERRCODE = '22023';
      END IF;
      IF v_offering.status = 'retired' THEN
        RAISE EXCEPTION 'A retired offering cannot be edited' USING ERRCODE = '22023';
      END IF;
      UPDATE public.hw_catalogue_offerings
         SET name = COALESCE(NULLIF(btrim(COALESCE(p_payload->>'name', '')), ''), name),
             description = CASE
               WHEN p_payload ? 'description' THEN NULLIF(btrim(COALESCE(p_payload->>'description', '')), '')
               ELSE description
             END
       WHERE id = v_offering.id
      RETURNING * INTO v_offering;
      v_result := to_jsonb(v_offering);
      v_event_action := 'catalogue.offering.updated';
      v_event_type := 'hw_catalogue_offerings';
      v_event_id := v_offering.id::text;

    WHEN 'set_offering_status' THEN
      v_offering_id := (p_payload->>'offering_id')::uuid;
      v_next := btrim(COALESCE(p_payload->>'status', ''));
      SELECT * INTO v_offering
        FROM public.hw_catalogue_offerings
       WHERE id = v_offering_id
       FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Offering was not found' USING ERRCODE = '22023';
      END IF;
      IF v_offering.ownership_scope <> 'invify_master' OR v_offering.owner_provider_id IS NOT NULL THEN
        RAISE EXCEPTION 'Platform catalogue writes are limited to ownership_scope=invify_master' USING ERRCODE = '22023';
      END IF;
      UPDATE public.hw_catalogue_offerings
         SET status = v_next,
             published_at = CASE
               WHEN v_next = 'published' AND published_at IS NULL THEN now()
               ELSE published_at
             END,
             published_by = CASE
               WHEN v_next = 'published' AND published_by IS NULL THEN p_actor_user_id
               ELSE published_by
             END,
             retired_at = CASE
               WHEN v_next = 'retired' THEN now()
               ELSE retired_at
             END
       WHERE id = v_offering.id
      RETURNING * INTO v_offering;
      v_result := to_jsonb(v_offering);
      v_event_action := 'catalogue.offering.' || v_next;
      v_event_type := 'hw_catalogue_offerings';
      v_event_id := v_offering.id::text;

    WHEN 'add_service' THEN
      v_offering_id := (p_payload->>'offering_id')::uuid;
      SELECT * INTO v_offering
        FROM public.hw_catalogue_offerings
       WHERE id = v_offering_id
       FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Offering was not found' USING ERRCODE = '22023';
      END IF;
      IF v_offering.ownership_scope <> 'invify_master' OR v_offering.owner_provider_id IS NOT NULL THEN
        RAISE EXCEPTION 'Platform catalogue writes are limited to ownership_scope=invify_master' USING ERRCODE = '22023';
      END IF;
      IF v_offering.status = 'retired' THEN
        RAISE EXCEPTION 'Cannot add a service to a retired offering' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.hw_catalogue_services (
        offering_id, code, name, description, status, sort_order, created_by
      ) VALUES (
        v_offering.id,
        p_payload->>'code',
        p_payload->>'name',
        NULLIF(btrim(COALESCE(p_payload->>'description', '')), ''),
        'draft',
        COALESCE((p_payload->>'sort_order')::integer, 0),
        p_actor_user_id
      ) RETURNING * INTO v_service;
      v_result := to_jsonb(v_service);
      v_event_action := 'catalogue.service.created';
      v_event_type := 'hw_catalogue_services';
      v_event_id := v_service.id::text;

    WHEN 'add_product' THEN
      v_service_id := (p_payload->>'service_id')::uuid;
      SELECT * INTO v_service
        FROM public.hw_catalogue_services
       WHERE id = v_service_id
       FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Service was not found' USING ERRCODE = '22023';
      END IF;
      SELECT * INTO v_offering
        FROM public.hw_catalogue_offerings
       WHERE id = v_service.offering_id
       FOR UPDATE;
      IF NOT FOUND OR v_offering.ownership_scope <> 'invify_master' OR v_offering.owner_provider_id IS NOT NULL THEN
        RAISE EXCEPTION 'Platform catalogue writes are limited to ownership_scope=invify_master' USING ERRCODE = '22023';
      END IF;
      v_plan_version_id := NULLIF(p_payload->>'plan_version_id', '')::uuid;
      v_plan_id := NULLIF(p_payload->>'plan_id', '')::uuid;
      IF v_plan_version_id IS NOT NULL THEN
        SELECT plan_id INTO v_plan_id
          FROM public.hw_plan_versions
         WHERE id = v_plan_version_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Linked plan version was not found' USING ERRCODE = '22023';
        END IF;
      END IF;
      INSERT INTO public.hw_catalogue_products (
        service_id, code, name, description, status, plan_id, plan_version_id,
        price_minor, currency, coverage, created_by
      ) VALUES (
        v_service.id,
        p_payload->>'code',
        p_payload->>'name',
        NULLIF(btrim(COALESCE(p_payload->>'description', '')), ''),
        'draft',
        v_plan_id,
        v_plan_version_id,
        NULLIF(p_payload->>'price_minor', '')::bigint,
        COALESCE(NULLIF(p_payload->>'currency', ''), 'NGN'),
        COALESCE(p_payload->'coverage', '[]'::jsonb),
        p_actor_user_id
      ) RETURNING * INTO v_product;
      v_result := to_jsonb(v_product);
      v_event_action := 'catalogue.product.created';
      v_event_type := 'hw_catalogue_products';
      v_event_id := v_product.id::text;

    WHEN 'assign_facility' THEN
      v_product_id := (p_payload->>'product_id')::uuid;
      v_facility_id := (p_payload->>'facility_id')::uuid;
      v_eligible := COALESCE((p_payload->>'is_eligible')::boolean, true);
      SELECT p.id, s.offering_id
        INTO v_product_id, v_offering_id
        FROM public.hw_catalogue_products p
        JOIN public.hw_catalogue_services s ON s.id = p.service_id
       WHERE p.id = v_product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product was not found' USING ERRCODE = '22023';
      END IF;
      SELECT * INTO v_offering
        FROM public.hw_catalogue_offerings
       WHERE id = v_offering_id
       FOR UPDATE;
      IF NOT FOUND OR v_offering.ownership_scope <> 'invify_master' OR v_offering.owner_provider_id IS NOT NULL THEN
        RAISE EXCEPTION 'Platform catalogue writes are limited to ownership_scope=invify_master' USING ERRCODE = '22023';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.hw_facilities f
         WHERE f.id = v_facility_id AND f.is_active IS TRUE
      ) THEN
        RAISE EXCEPTION 'Inactive facilities cannot be assigned to a catalogue product' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.hw_catalogue_product_facilities (
        product_id, facility_id, is_eligible, created_by
      ) VALUES (
        v_product_id, v_facility_id, v_eligible, p_actor_user_id
      )
      ON CONFLICT (product_id, facility_id) DO UPDATE
        SET is_eligible = EXCLUDED.is_eligible
      RETURNING jsonb_build_object(
        'product_id', product_id,
        'facility_id', facility_id,
        'is_eligible', is_eligible
      ) INTO v_result;
      v_event_action := 'catalogue.product.facility_assigned';
      v_event_type := 'hw_catalogue_product_facilities';
      v_event_id := v_product_id::text || ':' || v_facility_id::text;

    WHEN 'remove_facility' THEN
      v_product_id := (p_payload->>'product_id')::uuid;
      v_facility_id := (p_payload->>'facility_id')::uuid;
      SELECT p.id, s.offering_id
        INTO v_product_id, v_offering_id
        FROM public.hw_catalogue_products p
        JOIN public.hw_catalogue_services s ON s.id = p.service_id
       WHERE p.id = v_product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product was not found' USING ERRCODE = '22023';
      END IF;
      SELECT * INTO v_offering
        FROM public.hw_catalogue_offerings
       WHERE id = v_offering_id
       FOR UPDATE;
      IF NOT FOUND OR v_offering.ownership_scope <> 'invify_master' OR v_offering.owner_provider_id IS NOT NULL THEN
        RAISE EXCEPTION 'Platform catalogue writes are limited to ownership_scope=invify_master' USING ERRCODE = '22023';
      END IF;
      DELETE FROM public.hw_catalogue_product_facilities
       WHERE product_id = v_product_id
         AND facility_id = v_facility_id;
      v_result := jsonb_build_object(
        'productId', v_product_id,
        'facilityId', v_facility_id,
        'removed', true
      );
      v_event_action := 'catalogue.product.facility_removed';
      v_event_type := 'hw_catalogue_product_facilities';
      v_event_id := v_product_id::text || ':' || v_facility_id::text;

    ELSE
      RAISE EXCEPTION 'unknown catalogue operation' USING ERRCODE = '22023';
  END CASE;

  INSERT INTO public.hw_catalogue_events (
    actor_user_id, actor_role, action, resource_type, resource_id, changes, platform_reason
  ) VALUES (
    p_actor_user_id,
    'platform_admin',
    v_event_action,
    v_event_type,
    v_event_id,
    COALESCE(p_payload, '{}'::jsonb),
    btrim(p_reason)
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.hw_catalogue_apply_mutation(text, jsonb, uuid, text) IS
  'Atomic Invify catalogue mutation + hw_catalogue_events insert. Rollback both if either fails. No tenant_id.';

REVOKE ALL ON FUNCTION public.hw_catalogue_apply_mutation(text, jsonb, uuid, text) FROM PUBLIC;

ALTER TABLE public.hw_catalogue_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_catalogue_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_catalogue_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_catalogue_product_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_catalogue_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  r text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hw_catalogue_offerings',
    'hw_catalogue_services',
    'hw_catalogue_products',
    'hw_catalogue_product_facilities',
    'hw_catalogue_events'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM %I', t, r);
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      IF t = 'hw_catalogue_events' THEN
        EXECUTE 'GRANT SELECT, INSERT ON public.hw_catalogue_events TO service_role';
      ELSE
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t);
      END IF;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.hw_catalogue_apply_mutation(text, jsonb, uuid, text) TO service_role;
  END IF;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.hw_catalogue_apply_mutation(text, jsonb, uuid, text) FROM %I',
        r
      );
    END IF;
  END LOOP;
END $$;

-- Validation queries (run after apply in disposable DB only):
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.hw_catalogue_offerings'::regclass;
-- SELECT COUNT(*) FROM public.hw_catalogue_offerings WHERE ownership_scope = 'invify_master' AND owner_provider_id IS NOT NULL;
-- Expected: 0.
-- INSERT with plan_id of plan A and plan_version_id of plan B must fail fk_hw_catalogue_products_plan_pair.

-- Rollback (disposable DB):
-- DROP FUNCTION IF EXISTS public.hw_catalogue_apply_mutation(text, jsonb, uuid, text);
-- DROP TABLE IF EXISTS public.hw_catalogue_events;
-- DROP TABLE IF EXISTS public.hw_catalogue_product_facilities;
-- DROP TABLE IF EXISTS public.hw_catalogue_products;
-- DROP TABLE IF EXISTS public.hw_catalogue_services;
-- DROP TABLE IF EXISTS public.hw_catalogue_offerings;
-- ALTER TABLE public.hw_plan_versions DROP CONSTRAINT IF EXISTS uq_hw_plan_versions_id_plan;

COMMIT;

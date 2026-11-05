-- DO NOT APPLY until explicitly approved.
-- Staging-only follow-up for catalogue already created by
-- DO_NOT_APPLY_hw_invify_catalogue.sql on rpcjelhacmkhzguljdgi.
-- Do not rerun the original file. Do not run this on production.
--
-- Closes:
-- 1. service_role table INSERT/UPDATE/DELETE (and events INSERT) that
--    bypassed hw_catalogue_apply_mutation and therefore skipped
--    hw_catalogue_events.
-- 2. Direct RPC set_offering_status skipping the publication graph.
-- 3. search_path limited to pg_catalog, public, pg_temp.
--
-- Reads stay on PostgREST SELECT. Mutations stay on EXECUTE of the
-- SECURITY DEFINER RPC, which still writes as the function owner.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.hw_catalogue_apply_mutation(text,jsonb,uuid,text)') IS NULL
     OR to_regclass('public.hw_catalogue_offerings') IS NULL
     OR to_regclass('public.hw_catalogue_events') IS NULL THEN
    RAISE EXCEPTION
      'hw_invify_catalogue_audit_lockdown: catalogue objects missing. Do not apply this file first.';
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
SET search_path = pg_catalog, public, pg_temp
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
      IF v_next NOT IN ('draft', 'published', 'suspended', 'retired') THEN
        RAISE EXCEPTION 'Status must be draft, published, suspended, or retired' USING ERRCODE = '22023';
      END IF;
      IF v_next IS DISTINCT FROM v_offering.status THEN
        IF v_offering.status = 'retired'
           OR NOT (
             v_next = 'retired'
             OR (v_offering.status = 'draft' AND v_next = 'published')
             OR (v_offering.status = 'published' AND v_next = 'suspended')
             OR (v_offering.status = 'suspended' AND v_next = 'published')
           ) THEN
          RAISE EXCEPTION 'Cannot change catalogue status from % to %', v_offering.status, v_next
            USING ERRCODE = '22023';
        END IF;
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
  'Atomic Invify catalogue mutation + hw_catalogue_events insert. Trusted status graph. service_role EXECUTE only; table writes are definer-owned.';

REVOKE ALL ON FUNCTION public.hw_catalogue_apply_mutation(text, jsonb, uuid, text) FROM PUBLIC;

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
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
    LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM %I', t, r);
        IF r IN ('anon', 'authenticated') THEN
          EXECUTE format('REVOKE ALL ON public.%I FROM %I', t, r);
        END IF;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT SELECT ON public.%I TO service_role', t);
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

COMMIT;

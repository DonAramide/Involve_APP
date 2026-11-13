-- Disposable integrity checks for DO_NOT_APPLY_hw_invify_catalogue.sql.
-- Run only against a throwaway postgres after stub + proposal SQL.
-- Not a live migration.

INSERT INTO public.users (id) VALUES
  ('11111111-1111-4111-8111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO public.hw_providers (id) VALUES
  ('22222222-2222-4222-8222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO public.hw_plans (id, provider_id) VALUES
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222'),
  ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO public.hw_plan_versions (id, plan_id) VALUES
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333'),
  ('66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444')
ON CONFLICT DO NOTHING;

INSERT INTO public.hw_facilities (id, provider_id, is_active) VALUES
  ('77777777-7777-4777-8777-777777777777', '22222222-2222-4222-8222-222222222222', true),
  ('88888888-8888-4888-8888-888888888888', '22222222-2222-4222-8222-222222222222', false)
ON CONFLICT DO NOTHING;

-- Ownership CHECK: invify_master cannot carry a provider.
DO $$
BEGIN
  INSERT INTO public.hw_catalogue_offerings (code, name, ownership_scope, owner_provider_id)
  VALUES ('BAD-OWNER', 'Bad', 'invify_master', '22222222-2222-4222-8222-222222222222');
  RAISE EXCEPTION 'expected invify_master ownership check to fail';
EXCEPTION
  WHEN check_violation THEN NULL;
END $$;

-- Composite plan/version FK rejects mismatched pairs.
DO $$
DECLARE
  sid uuid;
BEGIN
  INSERT INTO public.hw_catalogue_offerings (code, name)
  VALUES ('FK-OFFER', 'FK Offer')
  RETURNING id INTO sid;
  INSERT INTO public.hw_catalogue_services (offering_id, code, name)
  VALUES (sid, 'FK-SVC', 'FK Service')
  RETURNING id INTO sid;
  INSERT INTO public.hw_catalogue_products (
    service_id, code, name, plan_id, plan_version_id
  ) VALUES (
    sid,
    'FK-PROD',
    'FK Product',
    '33333333-3333-4333-8333-333333333333',
    '66666666-6666-4666-8666-666666666666'
  );
  RAISE EXCEPTION 'expected mismatched plan/version FK to fail';
EXCEPTION
  WHEN foreign_key_violation THEN NULL;
END $$;

-- Atomic RPC: event CHECK failure rolls back the offering insert.
ALTER TABLE public.hw_catalogue_events
  ADD CONSTRAINT hw_catalogue_events_fail_created
  CHECK (action <> 'catalogue.offering.created');

DO $$
DECLARE
  n int;
BEGIN
  BEGIN
    PERFORM public.hw_catalogue_apply_mutation(
      'create_offering',
      jsonb_build_object('code', 'ATOMIC1', 'name', 'Atomic Offering'),
      '11111111-1111-4111-8111-111111111111',
      'atomic rollback proof'
    );
    RAISE EXCEPTION 'expected audit CHECK to abort the RPC';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
  SELECT COUNT(*) INTO n FROM public.hw_catalogue_offerings WHERE code = 'ATOMIC1';
  IF n <> 0 THEN
    RAISE EXCEPTION 'catalogue mutation survived a failed audit event';
  END IF;
END $$;

ALTER TABLE public.hw_catalogue_events
  DROP CONSTRAINT hw_catalogue_events_fail_created;

-- Success path writes offering and event together.
DO $$
DECLARE
  rec jsonb;
  n_off int;
  n_ev int;
BEGIN
  rec := public.hw_catalogue_apply_mutation(
    'create_offering',
    jsonb_build_object('code', 'OK-OFFER', 'name', 'Ok Offering'),
    '11111111-1111-4111-8111-111111111111',
    'create master offering'
  );
  SELECT COUNT(*) INTO n_off FROM public.hw_catalogue_offerings WHERE code = 'OK-OFFER';
  SELECT COUNT(*) INTO n_ev FROM public.hw_catalogue_events
   WHERE resource_id = rec->>'id' AND action = 'catalogue.offering.created';
  IF n_off <> 1 OR n_ev <> 1 THEN
    RAISE EXCEPTION 'expected one offering and one event, got % / %', n_off, n_ev;
  END IF;
END $$;

-- Inactive facility rejected by RPC after product exists.
DO $$
DECLARE
  oid uuid;
  sid uuid;
  pid uuid;
BEGIN
  SELECT id INTO oid FROM public.hw_catalogue_offerings WHERE code = 'OK-OFFER';
  sid := (
    public.hw_catalogue_apply_mutation(
      'add_service',
      jsonb_build_object('offering_id', oid, 'code', 'OK-SVC', 'name', 'Ok Service'),
      '11111111-1111-4111-8111-111111111111',
      'add outpatient service'
    )->>'id'
  )::uuid;
  pid := (
    public.hw_catalogue_apply_mutation(
      'add_product',
      jsonb_build_object('service_id', sid, 'code', 'OK-PROD', 'name', 'Ok Product'),
      '11111111-1111-4111-8111-111111111111',
      'add outpatient product'
    )->>'id'
  )::uuid;
  BEGIN
    PERFORM public.hw_catalogue_apply_mutation(
      'assign_facility',
      jsonb_build_object(
        'product_id', pid,
        'facility_id', '88888888-8888-4888-8888-888888888888'
      ),
      '11111111-1111-4111-8111-111111111111',
      'assign inactive facility'
    );
    RAISE EXCEPTION 'expected inactive facility assign to fail';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM NOT ILIKE '%inactive facilit%' THEN
        RAISE;
      END IF;
  END;
END $$;

-- Direct RPC cannot skip the publication graph (draft → suspended).
DO $$
DECLARE
  oid uuid;
  before_status text;
  n_ev int;
BEGIN
  SELECT id, status INTO oid, before_status
    FROM public.hw_catalogue_offerings WHERE code = 'OK-OFFER';
  IF before_status <> 'draft' THEN
    RAISE EXCEPTION 'expected OK-OFFER to still be draft, got %', before_status;
  END IF;
  BEGIN
    PERFORM public.hw_catalogue_apply_mutation(
      'set_offering_status',
      jsonb_build_object('offering_id', oid, 'status', 'suspended'),
      '11111111-1111-4111-8111-111111111111',
      'illegal draft to suspended'
    );
    RAISE EXCEPTION 'expected draft→suspended RPC to fail';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM NOT ILIKE '%Cannot change catalogue status%' THEN
        RAISE;
      END IF;
  END;
  SELECT status INTO before_status FROM public.hw_catalogue_offerings WHERE id = oid;
  SELECT COUNT(*) INTO n_ev FROM public.hw_catalogue_events
   WHERE resource_id = oid::text AND action = 'catalogue.offering.suspended';
  IF before_status <> 'draft' OR n_ev <> 0 THEN
    RAISE EXCEPTION 'invalid transition left partial catalogue or audit rows';
  END IF;
END $$;

DO $$
BEGIN
  PERFORM 1 FROM public.hw_catalogue_offerings LIMIT 1;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM 1 FROM public.hw_catalogue_offerings LIMIT 1;
    RAISE EXCEPTION 'anon must not select catalogue offerings';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM 1 FROM public.hw_catalogue_offerings LIMIT 1;
    RAISE EXCEPTION 'authenticated must not select catalogue offerings';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  SET LOCAL ROLE service_role;
  PERFORM 1 FROM public.hw_catalogue_offerings LIMIT 1;
  BEGIN
    INSERT INTO public.hw_catalogue_offerings (code, name)
    VALUES ('BYPASS-DML', 'Should not persist');
    RAISE EXCEPTION 'service_role must not INSERT catalogue rows directly';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.hw_catalogue_events (
      actor_user_id, actor_role, action, resource_type, resource_id, changes, platform_reason
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      'platform_admin',
      'catalogue.forged',
      'hw_catalogue_offerings',
      '00000000-0000-0000-0000-000000000000',
      '{}'::jsonb,
      'forged audit event'
    );
    RAISE EXCEPTION 'service_role must not INSERT catalogue events directly';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM public.hw_catalogue_apply_mutation(
    'create_offering',
    jsonb_build_object('code', 'SVC-ROLE-OK', 'name', 'Service Role Rpc'),
    '11111111-1111-4111-8111-111111111111',
    'service_role execute still writes via definer'
  );
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public.hw_catalogue_offerings WHERE code = 'SVC-ROLE-OK') THEN
    RAISE EXCEPTION 'service_role RPC execute should still mutate via SECURITY DEFINER';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.hw_catalogue_events
     WHERE action = 'catalogue.offering.created'
       AND changes->>'code' = 'SVC-ROLE-OK'
  ) THEN
    RAISE EXCEPTION 'service_role RPC execute must write the audit event';
  END IF;
END $$;

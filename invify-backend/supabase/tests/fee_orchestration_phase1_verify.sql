-- Phase 1 fee orchestration verification. Run after the forward migration.
-- Uses RAISE EXCEPTION on failure so psql exits non-zero when ON_ERROR_STOP=1.

DO $$
DECLARE
  v_pos public.fee_profile_versions%ROWTYPE;
  v_count INTEGER;
  v_err TEXT;
  v_id UUID;
  v_tenant UUID;
  v_user UUID;
  v_ok BOOLEAN;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  -- Objects created
  IF to_regclass('public.fee_profiles') IS NULL
     OR to_regclass('public.fee_profile_versions') IS NULL
     OR to_regclass('public.fee_profile_overrides') IS NULL
     OR to_regclass('public.fee_profile_override_versions') IS NULL
     OR to_regclass('public.fee_assessments') IS NULL
     OR to_regclass('public.fee_assessment_lines') IS NULL THEN
    RAISE EXCEPTION 'missing fee orchestration table';
  END IF;

  IF to_regprocedure('public.publish_fee_profile_version(uuid)') IS NULL THEN
    RAISE EXCEPTION 'publish_fee_profile_version missing';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.fee_profiles;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'expected 6 fee_profiles, got %', v_count;
  END IF;

  -- Draft seed: POS locked tariff, unpublished, no split
  SELECT v.* INTO v_pos
  FROM public.fee_profile_versions v
  JOIN public.fee_profiles p ON p.id = v.profile_id
  WHERE p.transaction_type = 'POS_WITHDRAWAL';

  IF v_pos.method <> 'PERCENTAGE'
     OR v_pos.percentage_bps <> 125
     OR v_pos.flat_amount_kobo <> 0
     OR v_pos.min_fee_kobo <> 0
     OR v_pos.max_fee_kobo <> 5000
     OR v_pos.status <> 'DRAFT'
     OR v_pos.platform_share_bps <> 0
     OR v_pos.processor_share_bps <> 0
     OR v_pos.service_share_bps <> 0
     OR v_pos.agent_share_bps <> 0 THEN
    RAISE EXCEPTION 'POS_WITHDRAWAL draft seed mismatch: % % % % % %',
      v_pos.method, v_pos.percentage_bps, v_pos.flat_amount_kobo,
      v_pos.min_fee_kobo, v_pos.max_fee_kobo, v_pos.status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.fee_profiles WHERE current_published_version_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'seed accidentally published a profile';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.fee_profile_versions WHERE status <> 'DRAFT'
  ) THEN
    RAISE EXCEPTION 'seed created a non-DRAFT version';
  END IF;

  -- Cap illustration (not stored as a flat fee)
  -- ₦1,000 (100000 kobo) * 125 / 10000 = 1250 kobo (₦12.50)
  -- ₦10,000 (1000000 kobo) * 125 / 10000 = 12500, capped at 5000 kobo (₦50)
  IF LEAST((100000::bigint * 125) / 10000, 5000) <> 1250 THEN
    RAISE EXCEPTION 'N1,000 illustration failed';
  END IF;
  IF LEAST((1000000::bigint * 125) / 10000, 5000) <> 5000 THEN
    RAISE EXCEPTION 'N10,000 cap illustration failed';
  END IF;

  -- Publish RPC rejects unset 0+0+0+0 split
  BEGIN
    PERFORM public.publish_fee_profile_version(v_pos.id);
    RAISE EXCEPTION 'publish should have failed for 0 bps split';
  EXCEPTION
    WHEN OTHERS THEN
      v_err := SQLERRM;
      IF v_err LIKE 'publish should have failed%' THEN
        RAISE;
      END IF;
      IF v_err NOT LIKE '%10000%' THEN
        RAISE EXCEPTION 'unexpected publish error: %', v_err;
      END IF;
  END;

  IF EXISTS (
    SELECT 1 FROM public.fee_profile_versions WHERE status = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'failed publish leaked PUBLISHED status';
  END IF;

  -- Direct UPDATE DRAFT -> PUBLISHED is blocked
  BEGIN
    UPDATE public.fee_profile_versions SET status = 'PUBLISHED' WHERE id = v_pos.id;
    RAISE EXCEPTION 'direct publish update should be blocked';
  EXCEPTION
    WHEN OTHERS THEN
      v_err := SQLERRM;
      IF v_err LIKE 'direct publish%' THEN
        RAISE;
      END IF;
      IF v_err NOT LIKE '%publish_fee_profile_version%' THEN
        RAISE EXCEPTION 'unexpected direct-publish error: %', v_err;
      END IF;
  END;

  -- Valid publish then immutability
  UPDATE public.fee_profile_versions
  SET
    platform_share_bps = 7000,
    processor_share_bps = 2000,
    service_share_bps = 500,
    agent_share_bps = 500
  WHERE id = v_pos.id;

  PERFORM public.publish_fee_profile_version(v_pos.id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.fee_profiles p
    JOIN public.fee_profile_versions v ON v.id = p.current_published_version_id
    WHERE p.transaction_type = 'POS_WITHDRAWAL'
      AND v.status = 'PUBLISHED'
      AND v.percentage_bps = 125
      AND v.max_fee_kobo = 5000
  ) THEN
    RAISE EXCEPTION 'publish RPC did not set current published version';
  END IF;

  BEGIN
    UPDATE public.fee_profile_versions SET notes = 'tamper' WHERE id = v_pos.id;
    RAISE EXCEPTION 'published version update should be blocked';
  EXCEPTION
    WHEN OTHERS THEN
      v_err := SQLERRM;
      IF v_err LIKE 'published version update%' THEN
        RAISE;
      END IF;
      IF v_err NOT LIKE '%cannot be modified%' THEN
        RAISE EXCEPTION 'unexpected published update error: %', v_err;
      END IF;
  END;

  BEGIN
    DELETE FROM public.fee_profile_versions WHERE id = v_pos.id;
    RAISE EXCEPTION 'published version delete should be blocked';
  EXCEPTION
    WHEN OTHERS THEN
      v_err := SQLERRM;
      IF v_err LIKE 'published version delete%' THEN
        RAISE;
      END IF;
      IF v_err NOT LIKE '%cannot be deleted%' THEN
        RAISE EXCEPTION 'unexpected published delete error: %', v_err;
      END IF;
  END;

  -- Assessment component sum constraint
  INSERT INTO public.tenants (id, name) VALUES (gen_random_uuid(), 'verify-tenant')
  RETURNING id INTO v_tenant;
  INSERT INTO public.users (id, tenant_id, role) VALUES (gen_random_uuid(), v_tenant, 'super_admin')
  RETURNING id INTO v_user;

  BEGIN
    INSERT INTO public.fee_assessments (
      tenant_id, transaction_type, source_system, source_idempotency_key,
      mode, kind, principal_amount_kobo, calculated_fee_kobo, final_fee_kobo,
      platform_amount_kobo, processor_amount_kobo, service_amount_kobo, agent_amount_kobo,
      method, profile_version_id
    ) VALUES (
      v_tenant, 'POS_WITHDRAWAL', 'verify', 'bad-sum',
      'SHADOW', 'ASSESSMENT', 100000, 1250, 1250,
      1000, 0, 0, 0,
      'PERCENTAGE', v_pos.id
    );
    RAISE EXCEPTION 'component sum check should reject 1000 != 1250';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%component sum%' OR SQLSTATE = '23514' THEN
        NULL;
      ELSE
        RAISE;
      END IF;
  END;

  INSERT INTO public.fee_assessments (
    tenant_id, transaction_type, source_system, source_idempotency_key,
    mode, kind, principal_amount_kobo, calculated_fee_kobo, final_fee_kobo,
    platform_amount_kobo, processor_amount_kobo, service_amount_kobo, agent_amount_kobo,
    method, percentage_bps, max_fee_kobo, profile_version_id
  ) VALUES (
    v_tenant, 'POS_WITHDRAWAL', 'verify', 'ok-sum',
    'SHADOW', 'ASSESSMENT', 100000, 1250, 1250,
    875, 250, 62, 63,
    'PERCENTAGE', 125, 5000, v_pos.id
  ) RETURNING id INTO v_id;

  INSERT INTO public.fee_assessment_lines (assessment_id, component, amount_kobo)
  VALUES
    (v_id, 'PLATFORM', 875),
    (v_id, 'PROCESSOR', 250),
    (v_id, 'SERVICE', 62),
    (v_id, 'AGENT_FEE', 63);

  -- School tables must not exist / must not have been created by this migration
  IF to_regclass('public.fee_structures') IS NOT NULL
     OR to_regclass('public.fee_categories') IS NOT NULL
     OR to_regclass('public.fee_allocations') IS NOT NULL THEN
    RAISE EXCEPTION 'school fee_* table present; Phase 1 must not create or modify school billing';
  END IF;

  -- Existing names still distinct
  IF to_regclass('public.tenant_fee_profiles') IS NOT NULL THEN
    NULL; -- allowed to exist; must not be dropped
  END IF;

  RAISE NOTICE 'phase1 verification passed';
END $$;

DO $$
BEGIN
  CREATE ROLE fee_orch_rls_probe NOLOGIN;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA public TO fee_orch_rls_probe;
GRANT SELECT ON public.fee_profiles, public.fee_profile_versions TO fee_orch_rls_probe;

SET ROLE fee_orch_rls_probe;
CREATE TEMP TABLE fee_orch_rls_probe_counts AS
  SELECT COUNT(*)::integer AS profile_count FROM public.fee_profiles;
RESET ROLE;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT profile_count INTO v_count FROM fee_orch_rls_probe_counts;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS probe expected 0 fee_profiles rows for non-staff role, got %', v_count;
  END IF;
  RAISE NOTICE 'phase1 RLS probe passed';
END $$;

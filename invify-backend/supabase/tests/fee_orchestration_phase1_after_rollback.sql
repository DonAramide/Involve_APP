-- Assert rollback removed Phase 1 objects and left stub/core tables intact.
DO $$
BEGIN
  IF to_regclass('public.fee_profiles') IS NOT NULL
     OR to_regclass('public.fee_profile_versions') IS NOT NULL
     OR to_regclass('public.fee_assessments') IS NOT NULL
     OR to_regtype('public.fee_transaction_type') IS NOT NULL
     OR to_regprocedure('public.publish_fee_profile_version(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'rollback incomplete: fee orchestration objects still present';
  END IF;
  IF to_regclass('public.tenants') IS NULL
     OR to_regclass('public.users') IS NULL
     OR to_regclass('public.ledger_entries') IS NULL THEN
    RAISE EXCEPTION 'rollback removed core FK targets it must not touch';
  END IF;
  RAISE NOTICE 'phase1 rollback verification passed';
END $$;

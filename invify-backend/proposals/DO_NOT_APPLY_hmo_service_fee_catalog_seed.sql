-- STEP 2 of 2. Run only after DO_NOT_APPLY_hmo_service_fee_catalog.sql
-- has committed in a previous query.
--
-- Seeds a GLOBAL unpublished HMO_SERVICE DRAFT. Idempotent.
-- Does not change POS, treasury, SMS, or AI rows.
-- Does not publish the fee and does not post wallet debits.

INSERT INTO public.fee_profiles (
  id,
  transaction_type,
  display_name,
  description,
  scope,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-a000-0000000000f1',
  'HMO_SERVICE',
  'HMO Service Fee',
  'Invify HMO service charge, separate from insurer premium. Unpublished until a checker publishes a version whose 10_000 bps split is valid.',
  'GLOBAL',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.fee_profiles
  WHERE transaction_type = 'HMO_SERVICE'
    AND COALESCE(scope, 'GLOBAL') = 'GLOBAL'
    AND agent_id IS NULL
);

INSERT INTO public.fee_profile_versions (
  profile_id,
  version_number,
  status,
  method,
  percentage_bps,
  flat_amount_kobo,
  min_fee_kobo,
  max_fee_kobo,
  platform_share_bps,
  processor_share_bps,
  service_share_bps,
  agent_share_bps,
  notes,
  created_at,
  updated_at
)
SELECT
  p.id,
  1,
  'DRAFT',
  'PERCENTAGE',
  500,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  'Seed draft. Split must total 10000 bps before publish. HMO fee ownership is unresolved; do not post.',
  NOW(),
  NOW()
FROM public.fee_profiles p
WHERE p.transaction_type = 'HMO_SERVICE'
  AND COALESCE(p.scope, 'GLOBAL') = 'GLOBAL'
  AND p.agent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.fee_profile_versions v WHERE v.profile_id = p.id
  );

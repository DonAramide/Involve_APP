BEGIN;

DROP INDEX IF EXISTS public.fee_stakeholder_payables_agent_idx;
ALTER TABLE public.fee_stakeholder_payables DROP COLUMN IF EXISTS agent_id;

DROP INDEX IF EXISTS public.fee_assessments_agent_created_idx;
ALTER TABLE public.fee_assessments DROP CONSTRAINT IF EXISTS fee_assessments_resolved_source_chk;
ALTER TABLE public.fee_assessments DROP COLUMN IF EXISTS resolved_source;
ALTER TABLE public.fee_assessments DROP COLUMN IF EXISTS fee_profile_id;
ALTER TABLE public.fee_assessments DROP COLUMN IF EXISTS agent_id;

DROP TABLE IF EXISTS public.agent_fee_profiles;

DROP INDEX IF EXISTS public.fee_profiles_agent_type_uidx;
DROP INDEX IF EXISTS public.fee_profiles_global_type_uidx;

ALTER TABLE public.fee_profiles DROP CONSTRAINT IF EXISTS fee_profiles_agent_scope_chk;
ALTER TABLE public.fee_profiles DROP CONSTRAINT IF EXISTS fee_profiles_scope_chk;
ALTER TABLE public.fee_profiles DROP COLUMN IF EXISTS agent_id;
ALTER TABLE public.fee_profiles DROP COLUMN IF EXISTS scope;

ALTER TABLE public.fee_profiles
  DROP CONSTRAINT IF EXISTS fee_profiles_transaction_type_key;
ALTER TABLE public.fee_profiles
  ADD CONSTRAINT fee_profiles_transaction_type_key UNIQUE (transaction_type);

COMMIT;

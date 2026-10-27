/*
Rollback for 20260926163000_fee_orchestration_phase1.sql

Drops Phase 1 fee orchestration objects only.
Does not touch tenant_fee_profiles, fee_transactions, school fee_* tables,
ledgers, or application code.
*/

BEGIN;

DROP TRIGGER IF EXISTS trg_prevent_fee_assessment_line_mutation ON public.fee_assessment_lines;
DROP TRIGGER IF EXISTS trg_prevent_fee_assessment_mutation ON public.fee_assessments;
DROP TRIGGER IF EXISTS trg_prevent_fee_override_published_pointer ON public.fee_profile_overrides;
DROP TRIGGER IF EXISTS trg_prevent_fee_profile_published_pointer ON public.fee_profiles;
DROP TRIGGER IF EXISTS trg_prevent_fee_profile_override_version_mutation ON public.fee_profile_override_versions;
DROP TRIGGER IF EXISTS trg_prevent_fee_profile_version_mutation ON public.fee_profile_versions;

DROP FUNCTION IF EXISTS public.publish_fee_profile_override_version(UUID);
DROP FUNCTION IF EXISTS public.publish_fee_profile_version(UUID);
DROP FUNCTION IF EXISTS public.fee_orchestration_can_publish();
DROP FUNCTION IF EXISTS public.prevent_fee_assessment_mutation();
DROP FUNCTION IF EXISTS public.prevent_fee_profile_published_pointer_mutation();
DROP FUNCTION IF EXISTS public.prevent_fee_profile_override_version_mutation();
DROP FUNCTION IF EXISTS public.prevent_fee_profile_version_mutation();
DROP FUNCTION IF EXISTS public.fee_orchestration_guc_enabled(text);

DROP TABLE IF EXISTS public.fee_assessment_lines CASCADE;
DROP TABLE IF EXISTS public.fee_assessments CASCADE;
DROP TABLE IF EXISTS public.fee_profile_override_versions CASCADE;
DROP TABLE IF EXISTS public.fee_profile_overrides CASCADE;
DROP TABLE IF EXISTS public.fee_profile_versions CASCADE;
DROP TABLE IF EXISTS public.fee_profiles CASCADE;

DROP TYPE IF EXISTS public.fee_assessment_kind;
DROP TYPE IF EXISTS public.fee_assessment_mode;
DROP TYPE IF EXISTS public.fee_component;
DROP TYPE IF EXISTS public.fee_version_status;
DROP TYPE IF EXISTS public.fee_calc_method;
DROP TYPE IF EXISTS public.fee_transaction_type;

COMMIT;

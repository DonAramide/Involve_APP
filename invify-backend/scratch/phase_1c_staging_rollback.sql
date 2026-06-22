-- ============================================================================
-- Phase 1C Rollback Package: Revert Treasury & Consistency Engine
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.financial_consistency_audits CASCADE;
DROP TABLE IF EXISTS public.quasar_verification_records CASCADE;
DROP TABLE IF EXISTS public.provider_settlements CASCADE;
DROP TABLE IF EXISTS public.financial_freezes CASCADE;
DROP TABLE IF EXISTS public.reserved_funds CASCADE;
DROP TABLE IF EXISTS public.treasury_journal_entries CASCADE;
DROP TABLE IF EXISTS public.treasury_movements CASCADE;
DROP TABLE IF EXISTS public.treasury_accounts CASCADE;
DROP TABLE IF EXISTS public.financial_event_state_history CASCADE;
DROP TABLE IF EXISTS public.financial_events CASCADE;
DROP TABLE IF EXISTS public.financial_execution_locks CASCADE;

DROP TYPE IF EXISTS public.treasury_account_type CASCADE;
DROP TYPE IF EXISTS public.owner_type_enum CASCADE;
DROP TYPE IF EXISTS public.treasury_status_enum CASCADE;
DROP TYPE IF EXISTS public.audit_severity CASCADE;
DROP TYPE IF EXISTS public.reserve_status CASCADE;
DROP TYPE IF EXISTS public.freeze_scope_enum CASCADE;
DROP TYPE IF EXISTS public.freeze_type_enum CASCADE;
DROP TYPE IF EXISTS public.financial_event_type_enum CASCADE;
DROP TYPE IF EXISTS public.financial_event_state_enum CASCADE;
DROP TYPE IF EXISTS public.settlement_state_enum CASCADE;
DROP TYPE IF EXISTS public.verification_status_enum CASCADE;

COMMIT;

-- Rollback for 20260927190000_fee_distribution_stakeholders.sql
-- Additive tables only. Does not touch fee_assessments or published profiles.

BEGIN;
DROP TABLE IF EXISTS public.fee_distribution_events;
ALTER TABLE public.fee_stakeholder_payables DROP CONSTRAINT IF EXISTS fee_stakeholder_payables_settlement_id_fkey;
DROP TABLE IF EXISTS public.fee_withdrawal_requests;
DROP TABLE IF EXISTS public.fee_stakeholder_payables;
DROP TABLE IF EXISTS public.fee_settlements;
DROP TABLE IF EXISTS public.fee_stakeholders;
DROP TYPE IF EXISTS public.fee_withdrawal_status;
DROP TYPE IF EXISTS public.fee_settlement_status;
DROP TYPE IF EXISTS public.fee_payable_status;
DROP TYPE IF EXISTS public.fee_stakeholder_status;
DROP TYPE IF EXISTS public.fee_stakeholder_type;
COMMIT;

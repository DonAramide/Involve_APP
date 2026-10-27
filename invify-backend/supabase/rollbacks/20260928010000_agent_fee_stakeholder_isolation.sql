-- Rollback: agent_fee_stakeholder_isolation
-- Restores AGENT_FEE payables that still have tenant.agent_code evidence onto the
-- system AGENT stakeholder, then drops mapping table and reservation function.
-- Does not drop fee_stakeholders rows that may be referenced by payables/withdrawals
-- until those rows are reassigned.

BEGIN;

UPDATE public.fee_stakeholder_payables p
SET stakeholder_id = s.id
FROM public.fee_stakeholders s
WHERE s.stakeholder_type = 'AGENT'
  AND COALESCE(s.metadata->>'system', 'false') = 'true'
  AND p.component = 'AGENT_FEE'
  AND p.stakeholder_id IN (SELECT stakeholder_id FROM public.agent_fee_stakeholders);

DROP FUNCTION IF EXISTS public.fee_reserve_withdrawal(UUID, BIGINT, TEXT, UUID);
DROP TABLE IF EXISTS public.agent_fee_stakeholders;

COMMIT;

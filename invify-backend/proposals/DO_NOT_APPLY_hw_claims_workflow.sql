-- DO NOT APPLY without explicit approval.
-- Additive claim status history for HMO claim lifecycle.
-- Does not alter financial payout tables. Settlement status ≠ administrative.

BEGIN;

CREATE TABLE IF NOT EXISTS public.hw_claim_status_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        uuid NOT NULL REFERENCES public.hw_claim_status_records(id) ON DELETE CASCADE,
  from_status     text,
  to_status       text NOT NULL CHECK (to_status IN ('submitted', 'pending', 'approved', 'rejected', 'settled')),
  actor_user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes           text,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_hw_claim_status_events_claim_time
  ON public.hw_claim_status_events (claim_id, occurred_at DESC);

ALTER TABLE public.hw_claim_status_events ENABLE ROW LEVEL SECURITY;

-- Append-only: no update/delete policies for authenticated clients.
-- Platform Nest uses service role.

-- Expand tenant permission grants CHECK to allow health.claims.manage
-- (mutations). Route guards already require health.claims.manage for
-- submit/approve/reject/settle. Tenant owner/tenant_admin continue to
-- auto-receive it via the permission guard without a DB row.
DO $$
DECLARE
  cons_name text;
BEGIN
  SELECT c.conname INTO cons_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'hw_permission_grants'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%permission%';

  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.hw_permission_grants DROP CONSTRAINT %I', cons_name);
  END IF;

  ALTER TABLE public.hw_permission_grants
    ADD CONSTRAINT hw_permission_grants_permission_check
    CHECK (permission IN (
      'health.settings.manage',
      'health.plans.manage',
      'health.members.read',
      'health.members.manage',
      'health.students.access',
      'health.staff.access',
      'health.hr_admin',
      'health.enrolments.manage',
      'health.enrolments.verify',
      'health.guardians.manage',
      'health.billing.read',
      'health.billing.manage',
      'health.reports.read',
      'health.exports.run',
      'health.audit.read',
      'health.claims.read',
      'health.claims.manage'
    ));
END $$;

COMMIT;

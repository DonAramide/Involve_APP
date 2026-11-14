-- DO NOT APPLY without separate database authorization.
-- Branch: remediate/student-balance-rpc-c7e336ea
-- Purpose: replace the unscoped 0-arg validate_student_balances() contract
-- with a tenant-scoped SECURITY INVOKER function.
--
-- The 0-arg function is NOT in supabase/migrations; it exists only in
-- backend/database/student_balance_sync.sql (non-canonical). This file
-- does not DROP the 0-arg function (destructive without inventory).
-- Application code on remediate/authz-tenant-jwt-c7e336ea no longer calls it.

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_student_balances(p_tenant_id uuid)
RETURNS TABLE (
    student_id uuid,
    cached_balance numeric(15, 2),
    actual_balance numeric(15, 2),
    mismatch numeric(15, 2)
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  RETURN QUERY
  WITH ledger_sums AS (
    SELECT l.student_id, SUM(l.amount) AS total_amount
    FROM ledgers l
    WHERE l.school_id = p_tenant_id
       OR l.tenant_id = p_tenant_id
    GROUP BY l.student_id
  )
  SELECT
    s.id,
    s.running_balance,
    COALESCE(ls.total_amount, 0),
    s.running_balance - COALESCE(ls.total_amount, 0)
  FROM students s
  LEFT JOIN ledger_sums ls ON s.id = ls.student_id
  WHERE (s.school_id = p_tenant_id OR s.tenant_id = p_tenant_id)
    AND s.running_balance IS DISTINCT FROM COALESCE(ls.total_amount, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_student_balances(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_student_balances(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.validate_student_balances(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.validate_student_balances(uuid) TO service_role;

COMMIT;

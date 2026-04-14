-- 1. Add Audit Fields to Ledgers
ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS recorded_by UUID;
ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS note TEXT;

-- 2. Finance Summary RPC
-- Returns atomic aggregation for the school dashboard
CREATE OR REPLACE FUNCTION get_school_financial_summary(p_school_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalRevenue', (SELECT COALESCE(SUM(amount), 0) FROM ledgers WHERE school_id = p_school_id AND amount > 0),
    'outstandingFees', (SELECT COALESCE(ABS(SUM(running_balance)), 0) FROM students WHERE school_id = p_school_id AND running_balance < 0),
    'paidStudentsCount', (SELECT COUNT(*) FROM students WHERE school_id = p_school_id AND running_balance >= 0),
    'owingStudentsCount', (SELECT COUNT(*) FROM students WHERE school_id = p_school_id AND running_balance < 0),
    'totalStudents', (SELECT COUNT(*) FROM students WHERE school_id = p_school_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Daily Revenue Aggregator RPC
-- Groups revenue credits by day for the chart
CREATE OR REPLACE FUNCTION get_daily_revenue_agg(p_school_id UUID, p_days INTEGER)
RETURNS TABLE (date TEXT, revenue NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, 'YYYY-MM-DD') as date,
    SUM(amount)::NUMERIC as revenue
  FROM ledgers
  WHERE school_id = p_school_id 
    AND amount > 0 
    AND created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$ LANGUAGE plpgsql;

-- 4. Student Financial Summary RPC
-- Returns individual summary including total paid and historical billed fees
CREATE OR REPLACE FUNCTION get_student_financial_summary(p_student_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_paid DECIMAL(15, 2);
  v_outstanding DECIMAL(15, 2);
  v_total_fees DECIMAL(15, 2);
  result JSON;
BEGIN
  -- 1. Get total paid (Credits)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
  FROM ledgers 
  WHERE student_id = p_student_id AND amount > 0;

  -- 2. Get current running balance (Outstanding)
  SELECT running_balance INTO v_outstanding 
  FROM students WHERE id = p_student_id;

  -- 3. Calculate Total Fees expected (Historical + Current)
  -- Billed = Paid - Balance (since negative balance means more billed than paid)
  v_total_fees := v_total_paid - v_outstanding;

  SELECT json_build_object(
    'totalPaid', v_total_paid,
    'outstandingBalance', CASE WHEN v_outstanding < 0 THEN ABS(v_outstanding) ELSE 0 END,
    'totalFees', v_total_fees,
    'currentBalance', v_outstanding
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;


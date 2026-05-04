-- Create these in Supabase SQL Editor for the Admin Dashboard
-- 1. Aggregated Metrics
CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalRevenue', COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND amount > 0), 0),
    'totalTransactions', COUNT(*),
    'successfulTransactions', COUNT(*) FILTER (WHERE status = 'completed'),
    'failedTransactions', COUNT(*) FILTER (WHERE status = 'failed')
  ) INTO result
  FROM ledger_entries;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Time-Series Data (Last 30 days)
CREATE OR REPLACE FUNCTION get_admin_dashboard_timeseries()
RETURNS TABLE (
  display_date DATE,
  revenue NUMERIC,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('day', created_at)::DATE as display_date,
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND amount > 0), 0) as revenue,
    COUNT(*) as transaction_count
  FROM ledger_entries
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

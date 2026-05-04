-- Create this in Supabase SQL Editor
CREATE OR REPLACE FUNCTION handle_ledger_status_update(
  p_reference TEXT,
  p_new_status TEXT
) RETURNS VOID AS $$
BEGIN
  -- 1. Status can only move from 'pending' to 'completed' or 'failed'
  -- This ensures immutability once a final state is reached.
  UPDATE ledger_entries 
  SET status = p_new_status,
      updated_at = NOW()
  WHERE reference = p_reference 
    AND status = 'pending'
    AND p_new_status IN ('completed', 'failed');

  -- 2. If it was a success, the 'tr_update_wallet_on_ledger' trigger (already exists)
  -- will handle the balance increment automatically when status changes or row is inserted.
  -- Optimization: If you want to ONLY update wallet on 'completed', 
  -- you can adjust the trigger in invify_saas_schema.sql.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

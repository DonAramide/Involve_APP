-- 1. Create the sync function
CREATE OR REPLACE FUNCTION sync_student_running_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update for 'completed' or 'successful' entries if status exists,
    -- or always if it's a direct ledger write.
    -- Assuming ledgers table has a student_id and amount column.
    UPDATE students 
    SET running_balance = running_balance + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.student_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_sync_student_balance ON ledgers;
CREATE TRIGGER tr_sync_student_balance
AFTER INSERT ON ledgers
FOR EACH ROW
EXECUTE FUNCTION sync_student_running_balance();

-- 3. Integrity Check Function
-- This function can be called to verify that the cache matches the ledger sum.
CREATE OR REPLACE FUNCTION validate_student_balances()
RETURNS TABLE (
    student_id UUID,
    cached_balance DECIMAL(15, 2),
    actual_balance DECIMAL(15, 2),
    mismatch DECIMAL(15, 2)
) AS $$
BEGIN
    RETURN QUERY
    WITH ledger_sums AS (
        SELECT l.student_id, SUM(l.amount) as total_amount
        FROM ledgers l
        GROUP BY l.student_id
    )
    SELECT 
        s.id, 
        s.running_balance, 
        COALESCE(ls.total_amount, 0),
        s.running_balance - COALESCE(ls.total_amount, 0)
    FROM students s
    LEFT JOIN ledger_sums ls ON s.id = ls.student_id
    WHERE s.running_balance != COALESCE(ls.total_amount, 0);
END;
$$ LANGUAGE plpgsql;

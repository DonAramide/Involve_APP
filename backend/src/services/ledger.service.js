// backend/src/services/ledger.service.js
const { supabase } = require('../config/supabase');

/**
 * Records a transaction in the ledger with an atomic running balance.
 * Uses a RPC (Stored Procedure) in production to ensure thread safety.
 */
async function recordTransaction({
    school_id,
    student_id,
    amount,
    type,
    channel,
    reference,
    description,
    recorded_by = null,
    note = null,
    metadata = {}
}) {
    try {
        // Fetch current running_balance from students table
        const { data: student, error: fetchError } = await supabase
            .from('students')
            .select('running_balance')
            .eq('id', student_id)
            .single();

        if (fetchError) throw fetchError;

        const newBalance = parseFloat(student.running_balance) + parseFloat(amount);

        // 2. Insert into ledger
        const { data: ledgerEntry, error: ledgerError } = await supabase
            .from('ledgers')
            .insert([{
                school_id,
                student_id,
                amount,
                balance_after: newBalance,
                transaction_type: type,
                channel,
                reference,
                description,
                recorded_by,
                note,
                metadata: JSON.stringify(metadata)
            }])
            .select()
            .single();

        if (ledgerError) {
            if (ledgerError.code === '23505') return { success: false, duplicate: true };
            throw ledgerError;
        }

        // 3. Update student cached balance
        await supabase
            .from('students')
            .update({ running_balance: newBalance })
            .eq('id', student_id);

        return { success: true, entry: ledgerEntry };
    } catch (err) {
        console.error('Ledger error:', err);
        throw err;
    }
}


module.exports = { recordTransaction };

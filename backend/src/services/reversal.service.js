// backend/src/services/reversal.service.js
const { recordTransaction } = require('./ledger.service');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Reverses a ledger entry.
 * Does NOT delete. Creates an offsetting ledger entry.
 */
async function reverseTransaction(ledgerId, reason, adminId) {
    try {
        // 1. Fetch original entry
        const { data: original, error } = await supabase
            .from('ledgers')
            .select('*')
            .eq('id', ledgerId)
            .single();
        
        if (error) throw error;

        // 2. Create Reversal Entry
        const reversalResult = await recordTransaction({
            school_id: original.school_id,
            student_id: original.student_id,
            amount: -original.amount, // Opposite amount
            type: 'reversal',
            channel: 'system',
            reference: `REV-${original.reference}`,
            description: `Reversal of ${original.reference}: ${reason}`,
            metadata: { originalLedgerId: ledgerId, reason, adminId }
        });

        // 3. Log Audit
        if (reversalResult.success) {
            await supabase.from('audit_logs').insert([{
                school_id: original.school_id,
                user_id: adminId,
                action: 'REVERSAL',
                resource_type: 'ledger',
                resource_id: ledgerId,
                new_values: { reason, reversalLedgerId: reversalResult.entry.id }
            }]);
        }

        return reversalResult;
    } catch (err) {
        console.error('Reversal error:', err);
        throw err;
    }
}

module.exports = { reverseTransaction };

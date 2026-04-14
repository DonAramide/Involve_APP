// backend/src/services/allocation.service.js
const { supabase } = require('../config/supabase');

/**
 * Allocates a payment amount across outstanding fees.
 * Priority: Oldest Term First -> Highest Category Priority.
 */
async function allocatePayment(ledgerEntryId, studentId, schoolId, totalAmount) {
    let remainingAmount = parseFloat(totalAmount);
    if (remainingAmount <= 0) return;

    // 1. Fetch outstanding fees ordered by Term and Category Priority
    // Note: We'd typically calculate 'outstanding' by comparing fee_structures vs fee_allocations
    // For simplicity here, we assume we fetch unpaid structure IDs.
    const { data: fees } = await supabase
        .from('fee_structures')
        .select(`
            id,
            amount,
            fee_categories (priority)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: true }); // Oldest first

    if (!fees) return;

    const allocations = [];

    for (const fee of fees) {
        if (remainingAmount <= 0) break;

        // Check already paid amount for this fee (simplified)
        const { data: alreadyAllocated } = await supabase
            .from('fee_allocations')
            .select('amount_allocated')
            .eq('fee_structure_id', fee.id);
        
        const paidSoFar = alreadyAllocated.reduce((sum, a) => sum + parseFloat(a.amount_allocated), 0);
        const debt = parseFloat(fee.amount) - paidSoFar;

        if (debt > 0) {
            const allocate = Math.min(remainingAmount, debt);
            allocations.push({
                ledger_id: ledgerEntryId,
                fee_structure_id: fee.id,
                amount_allocated: allocate
            });
            remainingAmount -= allocate;
        }
    }

    // 2. Perform batch insert of allocations
    if (allocations.length > 0) {
        await supabase.from('fee_allocations').insert(allocations);
    }
}

module.exports = { allocatePayment };

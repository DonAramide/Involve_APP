"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrityController = void 0;
const supabase_1 = require("../db/supabase");
class IntegrityController {
    /**
     * GET /api/finance/integrity/student-balances
     * Validates running_balance cache against raw ledger sums.
     */
    static async validateStudentBalances(req, res) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        try {
            // 1. Call the RPC function we created
            const { data, error } = await supabase_1.supabase.rpc('validate_student_balances');
            if (error)
                throw error;
            const mismatches = data;
            if (mismatches.length > 0) {
                console.error(`[Integrity Error] Found ${mismatches.length} student balance mismatches!`);
                return res.status(400).json({
                    status: 'CORRUPTED',
                    message: 'Integrity mismatch detected between running_balance and ledger sums.',
                    mismatches
                });
            }
            return res.status(200).json({
                status: 'VALID',
                message: 'All student running balances are in sync with the ledger.',
                count: 0
            });
        }
        catch (error) {
            console.error('[IntegrityController] Error:', error.message);
            return res.status(500).json({ error: 'Failed to perform integrity check' });
        }
    }
    /**
     * POST /api/finance/integrity/recompute
     * Forced recomputation of all running_balances from raw ledgers.
     */
    static async recomputeBalances(req, res) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        try {
            // 1. Fetch all student ledger sums
            const { data: ledgerSums, error: ledgerError } = await supabase_1.supabase
                .from('ledgers')
                .select('student_id, amount')
                .eq('school_id', tenantId);
            if (ledgerError)
                throw ledgerError;
            // Group by student
            const balances = {};
            ledgerSums.forEach(l => {
                balances[l.student_id] = (balances[l.student_id] || 0) + Number(l.amount);
            });
            // 2. Batch update students (One by one for now, or use a complex RPC)
            for (const [studentId, amount] of Object.entries(balances)) {
                await supabase_1.supabase
                    .from('students')
                    .update({ running_balance: amount })
                    .eq('id', studentId);
            }
            return res.status(200).json({ success: true, message: 'Recomputation completed.' });
        }
        catch (error) {
            console.error('[IntegrityController] Recompute Error:', error.message);
            return res.status(500).json({ error: 'Recomputation failed' });
        }
    }
}
exports.IntegrityController = IntegrityController;
//# sourceMappingURL=integrity.controller.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveFinanceController = void 0;
const supabase_1 = require("../db/supabase");
class ExecutiveFinanceController {
    /**
     * GET /api/finance/executive-summary
     * Returns a high-level financial overview for school executives.
     */
    static async getSummary(req, res) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
        const { startDate, endDate } = req.query;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        try {
            // 1. Fetch Wallet Balance
            const { data: wallet } = await supabase_1.supabase
                .from('wallets')
                .select('balance')
                .eq('tenant_id', tenantId)
                .single();
            // 2. Aggregate Revenue (Total Collected All Time)
            const { data: allTimeRevenue } = await supabase_1.supabase
                .from('ledger_entries')
                .select('amount')
                .eq('tenant_id', tenantId)
                .eq('status', 'completed')
                .gt('amount', 0);
            const totalCollected = allTimeRevenue?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
            // 3. Aggregate Revenue in Range
            let rangeQuery = supabase_1.supabase
                .from('ledger_entries')
                .select('amount')
                .eq('tenant_id', tenantId)
                .eq('status', 'completed')
                .gt('amount', 0);
            if (startDate)
                rangeQuery = rangeQuery.gte('created_at', startDate);
            if (endDate)
                rangeQuery = rangeQuery.lte('created_at', endDate);
            const { data: rangeRevenue } = await rangeQuery;
            const totalRevenueInRange = rangeRevenue?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
            // 4. Student Metrics (Paid vs Owing)
            // This usually comes from a view or business logic service. 
            // For now, we simulate from the students table.
            const { count: totalStudents } = await supabase_1.supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', tenantId);
            // 5. Reconciliation Alerts
            const { data: unmatched } = await supabase_1.supabase
                .from('transactions_log')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('status', 'PENDING')
                .is('metadata->studentId', null);
            const { data: failedPayouts } = await supabase_1.supabase
                .from('transactions_log')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('status', 'FAILED')
                .eq('type', 'payout');
            return res.status(200).json({
                walletBalance: wallet?.balance || 0,
                totalCollected,
                revenueInRange: totalRevenueInRange,
                studentMetrics: {
                    total: totalStudents || 0,
                    paid: 0, // Mocked for now, needs fee_structure integration
                    owing: 0
                },
                alerts: {
                    unmatchedCount: unmatched?.length || 0,
                    failedPayoutsCount: failedPayouts?.length || 0
                }
            });
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] Error:', error.message);
            return res.status(500).json({ error: 'Failed to generate executive summary' });
        }
    }
    /**
     * GET /api/finance/payouts/stats
     * Returns global system aggregates for payouts/settlements
     */
    static async getPayoutStats(req, res) {
        try {
            // 1. Pending Settlement: SUM of agent_withdrawal_requests where status IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED')
            const { data: pendingData, error: pendingErr } = await supabase_1.supabase
                .from('agent_withdrawal_requests')
                .select('amount')
                .in('status', ['REQUESTED', 'UNDER_REVIEW', 'APPROVED']);
            // 2. Cleared Today: SUM of agent_withdrawal_requests where status = 'PAID' and updated_at >= today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { data: clearedData, error: clearedErr } = await supabase_1.supabase
                .from('agent_withdrawal_requests')
                .select('amount')
                .eq('status', 'PAID')
                .gte('updated_at', today.toISOString());
            // 3. Held Funds: SUM of agent_wallets pending_balance
            const { data: heldData, error: heldErr } = await supabase_1.supabase
                .from('agent_wallets')
                .select('pending_balance');
            // 4. Failed Transfers: COUNT of agent_withdrawal_requests where status = 'REJECTED' and updated_at >= today
            const { data: failedData, error: failedErr } = await supabase_1.supabase
                .from('agent_withdrawal_requests')
                .select('id')
                .eq('status', 'REJECTED')
                .gte('updated_at', today.toISOString());
            if (pendingErr)
                console.error('Error fetching pending settlement:', pendingErr);
            if (clearedErr)
                console.error('Error fetching cleared today:', clearedErr);
            if (heldErr)
                console.error('Error fetching held funds:', heldErr);
            if (failedErr)
                console.error('Error fetching failed transfers:', failedErr);
            const pendingSettlement = pendingData?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
            const clearedToday = clearedData?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
            const heldFunds = heldData?.reduce((acc, curr) => acc + Number(curr.pending_balance || 0), 0) || 0;
            const failedTransfers = failedData?.length || 0;
            return res.status(200).json({
                pendingSettlement,
                clearedToday,
                heldFunds,
                failedTransfers
            });
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getPayoutStats Error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch payout stats' });
        }
    }
    /**
     * GET /api/v1/finance/settlement-phases
     * Returns a chronological timeline of settlement events derived from actual ledger/settlement records.
     */
    static async getSettlementPhases(req, res) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID required' });
        try {
            // Fetch distinct settlement operations from the ledger for this tenant
            const { data, error } = await supabase_1.supabase
                .from('ledger_entries')
                .select('id, entry_type, amount, status, created_at, metadata, reference')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(100);
            if (error)
                throw error;
            const phasesMap = new Map();
            data?.forEach(entry => {
                // derive operational phase from metadata, reference prefix, or type
                let phaseCode = 'SYSTEM';
                if (entry.metadata && entry.metadata.source)
                    phaseCode = entry.metadata.source;
                else if (entry.reference && entry.reference.startsWith('QS-TX'))
                    phaseCode = 'QUASAR_POS';
                else if (entry.reference && entry.reference.startsWith('QS-PO'))
                    phaseCode = 'TREASURY_PAYOUT';
                else
                    phaseCode = entry.entry_type || 'UNKNOWN';
                if (!phasesMap.has(phaseCode)) {
                    phasesMap.set(phaseCode, {
                        title: phaseCode.toUpperCase().replace(/_/g, ' ') + ' BATCHING',
                        desc: `Aggregating ${phaseCode} events. Last amount: N${entry.amount}`,
                        active: entry.status === 'completed',
                        timestamp: entry.created_at
                    });
                }
            });
            const phases = Array.from(phasesMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            return res.status(200).json(phases);
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getSettlementPhases Error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch settlement phases' });
        }
    }
}
exports.ExecutiveFinanceController = ExecutiveFinanceController;
//# sourceMappingURL=finance.controller.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateRepairService = void 0;
const supabase_1 = require("../../db/supabase");
const RecoveryRegistry_1 = require("./RecoveryRegistry");
class StateRepairService {
    static useMock = true; // Use mock database updates since staging schema write has limits
    // Local storage fallback for tests
    static localWallets = {};
    static localLedgerSum = {};
    static clearMockData() {
        this.localWallets = {};
        this.localLedgerSum = {};
    }
    static seedMockState(tenantId, walletBalance, ledgerSum) {
        this.localWallets[tenantId] = {
            id: 'mock-w-' + tenantId,
            tenant_id: tenantId,
            balance: walletBalance,
        };
        this.localLedgerSum[tenantId] = ledgerSum;
    }
    static getMockWallet(tenantId) {
        return this.localWallets[tenantId];
    }
    /**
     * Reconciles wallet balance against cumulative ledger sum.
     * If they differ, performs State Repair.
     */
    static async reconcileAndRepair(tenantId, operator = 'system') {
        let walletBalance = 0;
        let ledgerSum = 0;
        if (this.useMock) {
            const w = this.localWallets[tenantId];
            if (!w)
                return { reconciled: true, difference: 0 };
            walletBalance = w.balance;
            ledgerSum = this.localLedgerSum[tenantId] || 0;
        }
        else {
            try {
                // Query wallet balance
                const { data: wallet } = await supabase_1.supabaseAdmin
                    .from('wallets')
                    .select('balance')
                    .eq('tenant_id', tenantId)
                    .maybeSingle();
                walletBalance = wallet ? Number(wallet.balance) : 0;
                // Query sum of ledger entries
                const { data: ledgerEntries } = await supabase_1.supabaseAdmin
                    .from('ledger_entries')
                    .select('amount')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'completed');
                ledgerSum = (ledgerEntries || []).reduce((acc, entry) => acc + Number(entry.amount), 0);
            }
            catch {
                const w = this.localWallets[tenantId];
                if (!w)
                    return { reconciled: true, difference: 0 };
                walletBalance = w.balance;
                ledgerSum = this.localLedgerSum[tenantId] || 0;
            }
        }
        const difference = ledgerSum - walletBalance;
        if (difference !== 0) {
            const desc = `Discrepancy detected for tenant ${tenantId}. Wallet Balance: ${walletBalance}, Ledger Cumulative Sum: ${ledgerSum}. Difference: ${difference}. Performing automatic repair.`;
            console.warn(`[StateRepair] ${desc}`);
            // Perform Repair
            if (this.useMock) {
                this.localWallets[tenantId].balance = ledgerSum;
            }
            else {
                try {
                    await supabase_1.supabaseAdmin
                        .from('wallets')
                        .update({ balance: ledgerSum })
                        .eq('tenant_id', tenantId);
                }
                catch {
                    this.localWallets[tenantId].balance = ledgerSum;
                }
            }
            // Log incident
            await RecoveryRegistry_1.RecoveryRegistry.insertIncident({
                component: 'STATE_REPAIR',
                description: desc,
                resolution_action: 'RECONCILED',
                status: 'RESOLVED',
            });
            return { reconciled: false, difference };
        }
        return { reconciled: true, difference: 0 };
    }
}
exports.StateRepairService = StateRepairService;
//# sourceMappingURL=StateRepairService.js.map
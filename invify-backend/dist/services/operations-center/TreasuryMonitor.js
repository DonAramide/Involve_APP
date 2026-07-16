"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryMonitor = void 0;
class TreasuryMonitor {
    /**
     * Internal mock ledger tracking for test/ops observation.
     * Production would query the wallets table directly.
     */
    static mockTreasuryEntries = [];
    static clearMockData() {
        this.mockTreasuryEntries = [];
    }
    /**
     * Seed a treasury entry for operations monitoring.
     */
    static seedEntry(tenantId, balance, discrepant = false) {
        const existing = this.mockTreasuryEntries.findIndex((e) => e.tenantId === tenantId);
        if (existing !== -1) {
            this.mockTreasuryEntries[existing] = { tenantId, balance, discrepant };
        }
        else {
            this.mockTreasuryEntries.push({ tenantId, balance, discrepant });
        }
    }
    /**
     * Returns a real-time treasury snapshot.
     */
    static getSnapshot() {
        const entries = this.mockTreasuryEntries;
        const totalFloat = entries.reduce((acc, e) => acc + e.balance, 0);
        const walletCount = entries.length;
        const averageBalance = walletCount > 0 ? totalFloat / walletCount : 0;
        const discrepancyCount = entries.filter((e) => e.discrepant).length;
        return {
            totalFloat,
            walletCount,
            averageBalance,
            discrepancyCount,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.TreasuryMonitor = TreasuryMonitor;
//# sourceMappingURL=TreasuryMonitor.js.map
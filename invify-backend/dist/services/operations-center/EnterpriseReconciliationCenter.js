"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseReconciliationCenter = void 0;
class EnterpriseReconciliationCenter {
    static discrepancies = new Map();
    static reconHistory = [];
    static seq = 0;
    static clearState() {
        this.discrepancies.clear();
        this.reconHistory = [];
        this.seq = 0;
    }
    static async autoReconcile(providerTx, quasarEvent, ledgerEntry) {
        // 1. Check Missing Event or Settlement
        if (!quasarEvent) {
            this.raiseDiscrepancy({
                type: 'MISSING_SETTLEMENT',
                severity: 'CRITICAL',
                description: `Quasar Event missing for Provider Ref: ${providerTx.providerRef}`,
                providerRef: providerTx.providerRef
            });
            return 'DISCREPANCY';
        }
        // 2. Check Timeout
        if (providerTx.status === 'PENDING' || quasarEvent.state === 'INITIALIZED') {
            this.raiseDiscrepancy({
                type: 'TIMEOUT',
                severity: 'WARNING',
                description: `Transaction pending timeout limit reached: ${providerTx.providerRef}`,
                providerRef: providerTx.providerRef,
                eventId: quasarEvent.eventId
            });
            return 'DISCREPANCY';
        }
        // 3. Check Mismatch State
        if (providerTx.status === 'SUCCESS' && quasarEvent.state === 'FAILED') {
            this.raiseDiscrepancy({
                type: 'MISMATCH',
                severity: 'CRITICAL',
                description: `Status mismatch: Provider=SUCCESS, Quasar=FAILED`,
                providerRef: providerTx.providerRef,
                eventId: quasarEvent.eventId
            });
            return 'DISCREPANCY';
        }
        // 4. Check Amount discrepancies
        if (providerTx.amount !== quasarEvent.amount) {
            const isUnder = providerTx.amount < quasarEvent.amount;
            this.raiseDiscrepancy({
                type: isUnder ? 'PARTIAL_PAYMENT' : 'WRONG_AMOUNT',
                severity: 'CRITICAL',
                description: `Amount mismatch: Provider=${providerTx.amount}, Quasar=${quasarEvent.amount}`,
                providerRef: providerTx.providerRef,
                eventId: quasarEvent.eventId
            });
            return 'DISCREPANCY';
        }
        // 5. Check Currency Mismatch
        if (providerTx.currency !== quasarEvent.currency) {
            this.raiseDiscrepancy({
                type: 'CURRENCY_MISMATCH',
                severity: 'CRITICAL',
                description: `Currency mismatch: Provider=${providerTx.currency}, Quasar=${quasarEvent.currency}`,
                providerRef: providerTx.providerRef,
                eventId: quasarEvent.eventId
            });
            return 'DISCREPANCY';
        }
        // 6. Check Ledger mismatch
        if (ledgerEntry) {
            const unsignedLedgerAmount = Math.abs(ledgerEntry.amount);
            if (unsignedLedgerAmount !== providerTx.amount) {
                this.raiseDiscrepancy({
                    type: 'WRONG_AMOUNT',
                    severity: 'CRITICAL',
                    description: `Ledger amount mismatch: Ledger=${unsignedLedgerAmount}, Provider=${providerTx.amount}`,
                    providerRef: providerTx.providerRef,
                    eventId: quasarEvent.eventId
                });
                return 'DISCREPANCY';
            }
        }
        // Reconciled successfully
        this.reconHistory.push({
            providerRef: providerTx.providerRef,
            eventId: quasarEvent.eventId,
            status: 'RECONCILED'
        });
        return 'RECONCILED';
    }
    static raiseDiscrepancy(params) {
        const id = `REC-DIS-${++this.seq}-${Date.now()}`;
        const discrepancy = {
            id,
            status: 'OPEN',
            ...params
        };
        this.discrepancies.set(id, discrepancy);
        return discrepancy;
    }
    static reconcileManually(discrepancyId, operator) {
        const disc = this.discrepancies.get(discrepancyId);
        if (!disc)
            return false;
        disc.status = 'RESOLVED';
        disc.resolvedBy = operator;
        disc.resolvedAt = new Date().toISOString();
        if (disc.providerRef && disc.eventId) {
            this.reconHistory.push({
                providerRef: disc.providerRef,
                eventId: disc.eventId,
                status: 'MANUAL'
            });
        }
        return true;
    }
    static escalate(discrepancyId) {
        const disc = this.discrepancies.get(discrepancyId);
        if (!disc)
            return false;
        disc.status = 'ESCALATED';
        return true;
    }
    static getDiscrepancies() {
        return Array.from(this.discrepancies.values());
    }
    static getReconciliationHistory() {
        return this.reconHistory;
    }
}
exports.EnterpriseReconciliationCenter = EnterpriseReconciliationCenter;
//# sourceMappingURL=EnterpriseReconciliationCenter.js.map
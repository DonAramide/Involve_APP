"use strict";
// src/services/financial-verification/modules/reconciliation/ReconciliationVerificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationVerificationService = void 0;
class ReconciliationVerificationService {
    moduleId = 'reconciliation_verification';
    domain = 'Reconciliation';
    priority = 60;
    mandatory = true;
    version = '1.0.0';
    capabilities = ['reconciliation.amount'];
    async verify(context) {
        // If webhook/inbound metadata contains discrepancies, flag them
        const providerAmount = context.metadata?.providerAmount ?? context.amount;
        const internalAmount = context.amount;
        if (providerAmount !== internalAmount) {
            return {
                passed: false,
                error: `Reconciliation discrepancy: provider amount (₦${providerAmount}) does not match internal expected amount (₦${internalAmount}).`,
            };
        }
        return {
            passed: true
        };
    }
}
exports.ReconciliationVerificationService = ReconciliationVerificationService;
//# sourceMappingURL=ReconciliationVerificationService.js.map
"use strict";
// src/services/financial-verification/modules/settlement/SettlementVerificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementVerificationService = void 0;
class SettlementVerificationService {
    moduleId = 'settlement_verification';
    domain = 'Settlement';
    priority = 70;
    mandatory = true;
    version = '1.0.0';
    capabilities = ['settlement.account', 'settlement.eligibility'];
    async verify(context) {
        // Check settlement currency
        if (context.currency !== 'NGN' && context.currency !== 'USD') {
            return {
                passed: false,
                error: `Settlement currency ${context.currency} is not eligible. Only NGN or USD allowed.`,
            };
        }
        if (context.metadata?.test_settlement_window_closed === true) {
            return {
                passed: false,
                error: `Settlement window is closed.`,
            };
        }
        return {
            passed: true
        };
    }
}
exports.SettlementVerificationService = SettlementVerificationService;
//# sourceMappingURL=SettlementVerificationService.js.map
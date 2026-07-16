"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundPolicy = void 0;
exports.RefundPolicy = {
    policyName: 'REFUND',
    domain: 'Banking',
    requiredCapabilities: [
        'event.exists',
        'settlement.eligibility',
        'wallet.exists',
        'risk.aml'
    ],
    failFast: true
};
//# sourceMappingURL=refund.policy.js.map
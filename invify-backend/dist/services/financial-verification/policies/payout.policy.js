"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutPolicy = void 0;
exports.PayoutPolicy = {
    policyName: 'PAYOUT',
    domain: 'Banking',
    requiredCapabilities: [
        'treasury.exists',
        'liquidity.limits',
        'risk.aml',
        'settlement.eligibility'
    ],
    failFast: true
};
//# sourceMappingURL=payout.policy.js.map
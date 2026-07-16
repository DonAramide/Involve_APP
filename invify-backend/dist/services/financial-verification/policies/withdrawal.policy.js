"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalPolicy = void 0;
exports.WithdrawalPolicy = {
    policyName: 'WITHDRAWAL',
    domain: 'Banking',
    requiredCapabilities: [
        'treasury.exists',
        'treasury.active',
        'wallet.exists',
        'wallet.active',
        'liquidity.limits',
        'risk.aml',
        'settlement.eligibility',
        'registry.nonce'
    ],
    failFast: true
};
//# sourceMappingURL=withdrawal.policy.js.map
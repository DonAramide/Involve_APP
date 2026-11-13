"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundPolicy = void 0;
exports.InboundPolicy = {
    policyName: 'INBOUND',
    domain: 'Banking',
    requiredCapabilities: [
        'provider.response',
        'provider.signature',
        'event.exists',
        'treasury.exists',
        'settlement.eligibility',
        'reconciliation.amount'
    ],
    failFast: true
};
//# sourceMappingURL=inbound.policy.js.map
"use strict";
// src/services/financial-verification/registry/VerificationPolicyRegistry.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationPolicyRegistry = void 0;
class VerificationPolicyRegistry {
    static instance;
    policies = new Map(); // domain -> policyName -> PolicyConfig
    constructor() {
        // Register standard policies
        this.registerPolicy({
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
        });
        this.registerPolicy({
            policyName: 'PAYOUT',
            domain: 'Banking',
            requiredCapabilities: [
                'treasury.exists',
                'liquidity.limits',
                'risk.aml',
                'settlement.eligibility'
            ],
            failFast: true
        });
        this.registerPolicy({
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
        });
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new VerificationPolicyRegistry();
        }
        return this.instance;
    }
    registerPolicy(config) {
        if (!this.policies.has(config.domain)) {
            this.policies.set(config.domain, new Map());
        }
        this.policies.get(config.domain).set(config.policyName, config);
    }
    getPolicy(domain, policyName) {
        return this.policies.get(domain)?.get(policyName);
    }
    clear() {
        this.policies.clear();
        // Restore default policies
        this.registerPolicy({
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
        });
        this.registerPolicy({
            policyName: 'PAYOUT',
            domain: 'Banking',
            requiredCapabilities: [
                'treasury.exists',
                'liquidity.limits',
                'risk.aml',
                'settlement.eligibility'
            ],
            failFast: true
        });
        this.registerPolicy({
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
        });
    }
}
exports.VerificationPolicyRegistry = VerificationPolicyRegistry;
//# sourceMappingURL=VerificationPolicyRegistry.js.map
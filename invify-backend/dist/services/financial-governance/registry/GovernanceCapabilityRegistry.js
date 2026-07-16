"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceCapabilityRegistry = void 0;
const DEFAULT_CAPABILITIES = [
    // Treasury
    ['treasury.float', 'TREASURY'],
    ['treasury.limit', 'TREASURY'],
    ['treasury.reserve', 'TREASURY'],
    ['treasury.window', 'TREASURY'],
    // Liquidity
    ['liquidity.minimum', 'LIQUIDITY'],
    ['liquidity.reserve', 'LIQUIDITY'],
    ['liquidity.coverage', 'LIQUIDITY'],
    // Settlement
    ['settlement.window', 'SETTLEMENT'],
    ['settlement.currency', 'SETTLEMENT'],
    ['settlement.account', 'SETTLEMENT'],
    ['settlement.schedule', 'SETTLEMENT'],
    // Routing
    ['routing.priority', 'ROUTING'],
    ['routing.failover', 'ROUTING'],
    ['routing.cost', 'ROUTING'],
    ['routing.health', 'ROUTING'],
    // Verification
    ['verification.pipeline', 'VERIFICATION'],
    ['verification.timeout', 'VERIFICATION'],
    ['verification.failfast', 'VERIFICATION'],
    // Risk
    ['risk.threshold', 'RISK'],
    ['risk.manualReview', 'RISK'],
    ['risk.country', 'RISK'],
    ['risk.velocity', 'RISK'],
    // AML
    ['aml.rules', 'AML'],
    ['aml.blacklist', 'AML'],
    ['aml.watchlist', 'AML'],
    ['aml.threshold', 'AML'],
    // Wallet
    ['wallet.currency', 'WALLET'],
    ['wallet.balance', 'WALLET'],
    ['wallet.status', 'WALLET'],
    // Provider
    ['provider.priority', 'PROVIDER'],
    ['provider.enable', 'PROVIDER'],
    ['provider.disable', 'PROVIDER'],
    ['provider.weight', 'PROVIDER'],
    // Certificate
    ['certificate.rotation', 'CERTIFICATE'],
    ['certificate.expiry', 'CERTIFICATE'],
    ['certificate.minimumTls', 'CERTIFICATE'],
    // Secret Rotation
    ['secret.rotation', 'SECRET_ROTATION'],
    ['secret.expiry', 'SECRET_ROTATION'],
    ['secret.version', 'SECRET_ROTATION'],
    // Feature Flags
    ['feature.enable', 'FEATURE_FLAG'],
    ['feature.disable', 'FEATURE_FLAG'],
    ['feature.rollout', 'FEATURE_FLAG'],
];
class GovernanceCapabilityRegistry {
    /** capability → policyType */
    static capToPolicy = new Map(DEFAULT_CAPABILITIES);
    /** policyType → capability[] */
    static policyToCaps = new Map();
    static {
        this.rebuild();
    }
    static rebuild() {
        this.policyToCaps.clear();
        for (const [cap, type] of this.capToPolicy.entries()) {
            const list = this.policyToCaps.get(type) ?? [];
            list.push(cap);
            this.policyToCaps.set(type, list);
        }
    }
    static clearMockData() {
        this.capToPolicy = new Map(DEFAULT_CAPABILITIES);
        this.rebuild();
    }
    static register(capability, policyType) {
        this.capToPolicy.set(capability, policyType);
        const list = this.policyToCaps.get(policyType) ?? [];
        if (!list.includes(capability))
            list.push(capability);
        this.policyToCaps.set(policyType, list);
    }
    /** Resolve which PolicyType governs a given capability string. */
    static resolve(capability) {
        return this.capToPolicy.get(capability) ?? null;
    }
    /** All capabilities owned by a policy type. */
    static getCapabilitiesFor(policyType) {
        return this.policyToCaps.get(policyType) ?? [];
    }
    static getAllCapabilities() {
        return Array.from(this.capToPolicy.keys());
    }
    static getAllMappings() {
        return Array.from(this.capToPolicy.entries()).map(([capability, policyType]) => ({
            capability,
            policyType,
        }));
    }
}
exports.GovernanceCapabilityRegistry = GovernanceCapabilityRegistry;
//# sourceMappingURL=GovernanceCapabilityRegistry.js.map
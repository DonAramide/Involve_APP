"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    flags: {
        INSTANT_SETTLEMENT: true,
        VIRTUAL_ACCOUNTS: true,
        CRYPTO_PAYMENTS: false,
        MULTI_CURRENCY: false,
        SAVINGS_PRODUCTS: false,
    },
    rolloutPercentages: {
        INSTANT_SETTLEMENT: 100,
        VIRTUAL_ACCOUNTS: 100,
    },
    deprecatedFeatures: [],
};
class FeatureFlagPolicyService {
    static defaultData() { return JSON.parse(JSON.stringify(DEFAULTS)); }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'FEATURE_FLAG', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('FEATURE_FLAG'); }
    static isEnabled(flag) {
        const policy = this.getActive();
        const flags = (policy?.data ?? DEFAULTS).flags;
        return flags[flag] ?? false;
    }
}
exports.FeatureFlagPolicyService = FeatureFlagPolicyService;
//# sourceMappingURL=FeatureFlagPolicyService.js.map
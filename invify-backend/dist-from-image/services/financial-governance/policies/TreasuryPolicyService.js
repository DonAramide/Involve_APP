"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    dailyFloatLimit: 50_000_000,
    minimumReserve: 5_000_000,
    settlementWindowHours: 24,
    maxTransactionAmount: 5_000_000,
};
class TreasuryPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'TREASURY', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) {
        return (0, PolicyServiceFactory_1.activatePolicy)(policyId);
    }
    static getActive() {
        return PolicyRegistry_1.PolicyRegistry.getActive('TREASURY');
    }
    static resolve(key) {
        const policy = this.getActive();
        return policy ? policy.data[key] : DEFAULTS[key];
    }
}
exports.TreasuryPolicyService = TreasuryPolicyService;
//# sourceMappingURL=TreasuryPolicyService.js.map
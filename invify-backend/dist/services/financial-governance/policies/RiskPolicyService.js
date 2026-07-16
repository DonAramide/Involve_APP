"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    riskScoreThreshold: 70,
    autoBlockThreshold: 90,
    blockedCountries: [],
    maxVelocityPerHour: 10,
    manualReviewEnabled: true,
};
class RiskPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'RISK', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('RISK'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.RiskPolicyService = RiskPolicyService;
//# sourceMappingURL=RiskPolicyService.js.map
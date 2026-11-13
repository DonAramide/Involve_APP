"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMLPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    screeningEnabled: true,
    blacklistedEntities: [],
    watchlistEntities: [],
    transactionThresholdNGN: 5_000_000,
    reportingThresholdNGN: 10_000_000,
    sanctionsListVersion: 'OFAC-2024-Q4',
};
class AMLPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'AML', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('AML'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.AMLPolicyService = AMLPolicyService;
//# sourceMappingURL=AMLPolicyService.js.map
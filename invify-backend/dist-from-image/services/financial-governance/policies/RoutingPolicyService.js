"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    providerPriority: ['PAYSTACK', 'FLUTTERWAVE', 'WEMA', 'PROVIDUS'],
    failoverEnabled: true,
    costOptimisationEnabled: false,
    healthCheckIntervalMs: 30_000,
    maxRoutingAttempts: 3,
};
class RoutingPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'ROUTING', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('ROUTING'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.RoutingPolicyService = RoutingPolicyService;
//# sourceMappingURL=RoutingPolicyService.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    pipeline: ['IDEMPOTENCY', 'LIMIT_CHECK', 'BALANCE_CHECK', 'RISK_CHECK', 'AML_CHECK'],
    timeoutMs: 10_000,
    failFast: true,
    maxRetries: 2,
};
class VerificationPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'VERIFICATION', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('VERIFICATION'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.VerificationPolicyService = VerificationPolicyService;
//# sourceMappingURL=VerificationPolicyService.js.map
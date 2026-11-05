"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    priorityOrder: ['PAYSTACK', 'FLUTTERWAVE', 'WEMA', 'PROVIDUS'],
    enabledProviders: ['PAYSTACK', 'FLUTTERWAVE', 'WEMA', 'PROVIDUS'],
    disabledProviders: [],
    providerWeights: { PAYSTACK: 40, FLUTTERWAVE: 30, WEMA: 20, PROVIDUS: 10 },
    maxFailuresBeforeDisable: 3,
};
class ProviderPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'PROVIDER', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('PROVIDER'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.ProviderPolicyService = ProviderPolicyService;
//# sourceMappingURL=ProviderPolicyService.js.map
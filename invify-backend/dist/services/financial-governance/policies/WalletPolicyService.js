"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    supportedCurrencies: ['NGN'],
    maxBalanceNGN: 500_000_000,
    minBalanceNGN: 0,
    allowedStatuses: ['ACTIVE', 'SUSPENDED', 'FROZEN'],
    autoFreezeOnSuspicion: true,
};
class WalletPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'WALLET', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('WALLET'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.WalletPolicyService = WalletPolicyService;
//# sourceMappingURL=WalletPolicyService.js.map
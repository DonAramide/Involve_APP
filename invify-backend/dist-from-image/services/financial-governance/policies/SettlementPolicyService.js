"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    settlementWindowHours: 24,
    supportedCurrencies: ['NGN', 'USD'],
    settlementAccount: 'SETTLEMENT_MAIN',
    scheduleType: 'BATCH_DAILY',
    maxBatchSizeNGN: 100_000_000,
};
class SettlementPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'SETTLEMENT', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('SETTLEMENT'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.SettlementPolicyService = SettlementPolicyService;
//# sourceMappingURL=SettlementPolicyService.js.map
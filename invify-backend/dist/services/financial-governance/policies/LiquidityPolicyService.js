"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidityPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    minimumLiquidityNGN: 2_000_000,
    reserveRatio: 0.15,
    coverageRatioTarget: 1.5,
    lowLiquidityAlertThresholdNGN: 3_000_000,
};
class LiquidityPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'LIQUIDITY', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('LIQUIDITY'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.LiquidityPolicyService = LiquidityPolicyService;
//# sourceMappingURL=LiquidityPolicyService.js.map
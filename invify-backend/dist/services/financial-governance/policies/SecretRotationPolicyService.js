"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretRotationPolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    rotationIntervalDays: 90,
    expiryGracePeriodDays: 7,
    currentVersion: 'v1',
    autoRotateEnabled: true,
    notifyBeforeDays: 14,
};
class SecretRotationPolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'SECRET_ROTATION', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('SECRET_ROTATION'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.SecretRotationPolicyService = SecretRotationPolicyService;
//# sourceMappingURL=SecretRotationPolicyService.js.map
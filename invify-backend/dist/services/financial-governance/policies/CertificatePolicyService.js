"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificatePolicyService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyServiceFactory_1 = require("./PolicyServiceFactory");
const DEFAULTS = {
    rotationIntervalDays: 90,
    expiryWarningDays: 30,
    minimumTlsVersion: 'TLS1.2',
    autoRenewEnabled: true,
    pinnedCertificates: [],
};
class CertificatePolicyService {
    static defaultData() { return { ...DEFAULTS }; }
    static create(data, createdBy, changeReason, opts) {
        return (0, PolicyServiceFactory_1.createPolicy)({ type: 'CERTIFICATE', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
    }
    static activate(policyId) { return (0, PolicyServiceFactory_1.activatePolicy)(policyId); }
    static getActive() { return PolicyRegistry_1.PolicyRegistry.getActive('CERTIFICATE'); }
    static resolve(key) {
        const d = this.getActive()?.data ?? DEFAULTS;
        return d[key];
    }
}
exports.CertificatePolicyService = CertificatePolicyService;
//# sourceMappingURL=CertificatePolicyService.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionManager = void 0;
const PolicyVersionRegistry_1 = require("../registry/PolicyVersionRegistry");
class VersionManager {
    static getHistory(type) {
        const chain = PolicyVersionRegistry_1.PolicyVersionRegistry.getChain(type);
        const active = chain.find((e) => e.status === 'ACTIVE');
        return {
            policyType: type,
            versions: chain.map((e) => ({
                version: e.version,
                policyId: e.policyId,
                status: e.status,
                activatedAt: e.activatedAt,
                supersededById: e.supersededById,
            })),
            totalVersions: chain.length,
            currentVersion: active?.version ?? null,
        };
    }
    static getAllHistories() {
        return PolicyVersionRegistry_1.PolicyVersionRegistry.getAllTypes().map((t) => this.getHistory(t));
    }
    static getLatestVersion(type) {
        return PolicyVersionRegistry_1.PolicyVersionRegistry.peekVersion(type);
    }
}
exports.VersionManager = VersionManager;
//# sourceMappingURL=VersionManager.js.map
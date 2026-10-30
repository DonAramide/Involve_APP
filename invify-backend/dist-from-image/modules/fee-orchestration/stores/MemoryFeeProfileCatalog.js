"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryFeeProfileCatalog = void 0;
class MemoryFeeProfileCatalog {
    versions;
    constructor(versions = []) {
        this.versions = versions;
    }
    seed(version) {
        this.versions.push(version);
    }
    async listCandidateVersions(transactionType, tenantId, agentId) {
        return this.versions.filter((v) => {
            if (v.transaction_type !== transactionType)
                return false;
            if (v.source === 'AGENT_PROFILE') {
                return Boolean(agentId) && v.agent_id === agentId;
            }
            if (v.source === 'TENANT_OVERRIDE') {
                return false;
            }
            return v.source === 'GLOBAL_PROFILE';
        });
    }
}
exports.MemoryFeeProfileCatalog = MemoryFeeProfileCatalog;
//# sourceMappingURL=MemoryFeeProfileCatalog.js.map
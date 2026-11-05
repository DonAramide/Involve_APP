"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeResolver = void 0;
const types_1 = require("./types");
function isEffective(version, eventTime) {
    if (version.effective_from.getTime() > eventTime.getTime())
        return false;
    if (version.effective_to && eventTime.getTime() >= version.effective_to.getTime())
        return false;
    return true;
}
function splitIsComplete(version) {
    return (version.platform_bps +
        version.processor_bps +
        version.service_bps +
        version.agent_bps ===
        types_1.REQUIRED_SPLIT_BPS);
}
/**
 * Agent published profile, else global published profile, in the effective window.
 * Tenant overrides remain stored but are out of scope for Phase 7.3 resolution.
 * Drafts, superseded rows, incomplete splits, and missing profiles yield NO_PROFILE.
 */
class FeeResolver {
    catalog;
    constructor(catalog) {
        this.catalog = catalog;
    }
    async resolve(transactionType, tenantId, eventTime, agentId) {
        const candidates = await this.catalog.listCandidateVersions(transactionType, tenantId, agentId);
        const usable = candidates.filter((v) => v.status === 'PUBLISHED' &&
            v.transaction_type === transactionType &&
            splitIsComplete(v) &&
            isEffective(v, eventTime));
        const agentHits = usable
            .filter((v) => v.source === 'AGENT_PROFILE' && (!agentId || v.agent_id === agentId))
            .sort((a, b) => b.effective_from.getTime() - a.effective_from.getTime());
        if (agentHits.length > 0) {
            return { status: 'RESOLVED', version: agentHits[0] };
        }
        const globalHits = usable
            .filter((v) => v.source === 'GLOBAL_PROFILE')
            .sort((a, b) => b.effective_from.getTime() - a.effective_from.getTime());
        if (globalHits.length > 0) {
            return { status: 'RESOLVED', version: globalHits[0] };
        }
        return { status: 'NO_PROFILE' };
    }
}
exports.FeeResolver = FeeResolver;
//# sourceMappingURL=FeeResolver.js.map
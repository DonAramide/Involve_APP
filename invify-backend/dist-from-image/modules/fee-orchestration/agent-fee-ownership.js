"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOwnershipError = void 0;
exports.pickOwningAgent = pickOwningAgent;
exports.assertTenantBelongsToAgent = assertTenantBelongsToAgent;
class AgentOwnershipError extends Error {
    code;
    status;
    constructor(message, code, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = 'AgentOwnershipError';
    }
}
exports.AgentOwnershipError = AgentOwnershipError;
function pickOwningAgent(input) {
    const tid = String(input.tenantId || '');
    const fromLink = input.agentTenants.find((row) => String(row.tenant_id) === tid);
    const fromCode = (input.tenantsByCode || []).find((row) => String(row.id) === tid && row.agent_code);
    const codeAgent = fromCode
        ? (input.agentsByCode || []).find((a) => a.agent_code === fromCode.agent_code)
        : undefined;
    const linkId = fromLink ? String(fromLink.agent_id) : '';
    const codeId = fromCode?.agent_id ? String(fromCode.agent_id) : codeAgent ? String(codeAgent.id) : '';
    if (linkId && codeId && linkId !== codeId) {
        throw new AgentOwnershipError('Tenant Agent ownership is ambiguous between agent_tenants and tenants.agent_code', 'OWNERSHIP_AMBIGUOUS', 409);
    }
    if (linkId) {
        return {
            agent_id: linkId,
            agent_code: String(fromLink?.agent_code || codeAgent?.agent_code || ''),
        };
    }
    if (codeId) {
        return {
            agent_id: codeId,
            agent_code: String(fromCode?.agent_code || ''),
        };
    }
    return null;
}
function assertTenantBelongsToAgent(owner, agentId) {
    if (!agentId)
        return owner;
    if (!owner || owner.agent_id !== String(agentId)) {
        throw new AgentOwnershipError('Tenant does not belong to the requested Agent', 'TENANT_AGENT_MISMATCH', 403);
    }
    return owner;
}
//# sourceMappingURL=agent-fee-ownership.js.map
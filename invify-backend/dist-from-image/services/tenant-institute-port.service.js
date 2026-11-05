"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantInstitutePortService = exports.TenantInstitutePortService = exports.PLATFORM_DEFAULT_TARGET = void 0;
exports.samePortActor = samePortActor;
exports.normalizePortTargetId = normalizePortTargetId;
exports.instituteRefsEqual = instituteRefsEqual;
exports.readPortProposal = readPortProposal;
const crypto_1 = require("crypto");
const supabase_1 = require("../db/supabase");
const agent_fee_ownership_1 = require("../modules/fee-orchestration/agent-fee-ownership");
const agent_code_1 = require("../utils/agent-code");
exports.PLATFORM_DEFAULT_TARGET = 'default';
function httpError(message, status, extra) {
    const err = new Error(message);
    err.status = status;
    if (extra)
        Object.assign(err, extra);
    return err;
}
function parseSettings(raw) {
    if (!raw)
        return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    return typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {};
}
function agentDisplayName(row) {
    const name = `${row?.first_name || ''} ${row?.last_name || ''}`.trim();
    return name || String(row?.agent_code || 'Institute');
}
function samePortActor(proposal, actor) {
    const makerEmail = String(proposal.makerEmail || '').trim().toLowerCase();
    const actorEmail = String(actor.email || '').trim().toLowerCase();
    const sameEmail = !!actorEmail && makerEmail === actorEmail;
    const sameId = !!actor.id && !!proposal.makerId && String(proposal.makerId) === String(actor.id);
    return sameEmail || sameId;
}
function normalizePortTargetId(raw) {
    const value = String(raw ?? '').trim();
    if (!value || value.toLowerCase() === exports.PLATFORM_DEFAULT_TARGET || value === '__default__' || (0, agent_code_1.isInvifyDefaultAgentCode)(value)) {
        return exports.PLATFORM_DEFAULT_TARGET;
    }
    return value;
}
function instituteRefsEqual(a, b) {
    const aId = a.id || '';
    const bId = b.id || '';
    if (aId && bId)
        return aId === bId;
    if (a.isDefault && b.isDefault)
        return true;
    return String(a.agent_code || '').toUpperCase() === String(b.agent_code || '').toUpperCase()
        && Boolean(a.agent_code) === Boolean(b.agent_code);
}
function defaultInstituteRef(agent) {
    return {
        id: agent?.id ? String(agent.id) : null,
        agent_code: String(agent?.agent_code || agent_code_1.INVIFY_DEFAULT_AGENT_CODE),
        name: agent ? agentDisplayName(agent) : 'Platform default',
        email: agent?.email || null,
        status: agent?.status || 'ACTIVE',
        isDefault: true,
    };
}
function instituteFromAgent(row) {
    const code = String(row?.agent_code || '');
    return {
        id: row?.id ? String(row.id) : null,
        agent_code: code || null,
        name: agentDisplayName(row),
        email: row?.email || null,
        status: row?.status || null,
        isDefault: (0, agent_code_1.isInvifyDefaultAgentCode)(code),
    };
}
function unassignedRef() {
    return {
        id: null,
        agent_code: null,
        name: 'Unassigned (platform default)',
        isDefault: true,
    };
}
function readPortProposal(settings) {
    const raw = settings?.institute_port?.proposal;
    if (!raw || typeof raw !== 'object')
        return null;
    if (!['pending', 'approved', 'rejected'].includes(String(raw.status)))
        return null;
    return raw;
}
class TenantInstitutePortService {
    db;
    constructor(db = supabase_1.supabaseAdmin) {
        this.db = db;
    }
    async getSnapshot(tenantId) {
        const tenant = await this.requireTenant(tenantId);
        const [current, institutes] = await Promise.all([
            this.resolveCurrent(tenant),
            this.listInstitutes(),
        ]);
        const settings = parseSettings(tenant.settings);
        return {
            tenantId: String(tenant.id),
            tenantName: String(tenant.name || ''),
            current,
            proposal: readPortProposal(settings),
            institutes,
            defaultCode: agent_code_1.INVIFY_DEFAULT_AGENT_CODE,
        };
    }
    async propose(opts) {
        const tenant = await this.requireTenant(opts.tenantId);
        const settings = parseSettings(tenant.settings);
        const existing = readPortProposal(settings);
        if (existing?.status === 'pending') {
            throw httpError('A pending Institute port request already exists. Reject or approve it first.', 409);
        }
        const current = await this.resolveCurrent(tenant);
        const target = await this.resolveTarget(opts.toAgentId);
        if (instituteRefsEqual(current, target)) {
            throw httpError('Tenant is already assigned to that Institute.', 400);
        }
        const proposal = {
            id: (0, crypto_1.randomUUID)(),
            makerId: String(opts.actorId || ''),
            makerEmail: String(opts.actorEmail || ''),
            status: 'pending',
            createdAt: new Date().toISOString(),
            from: current,
            to: target,
            reason: String(opts.reason || '').trim() || undefined,
        };
        settings.institute_port = { ...(settings.institute_port || {}), proposal };
        await this.saveTenantSettings(opts.tenantId, settings);
        return this.getSnapshot(opts.tenantId);
    }
    async reject(opts) {
        const tenant = await this.requireTenant(opts.tenantId);
        const settings = parseSettings(tenant.settings);
        const proposal = readPortProposal(settings);
        this.assertChecker(proposal, opts);
        proposal.status = 'rejected';
        proposal.checkerId = String(opts.actorId || '');
        proposal.checkerEmail = String(opts.actorEmail || '');
        proposal.decidedAt = new Date().toISOString();
        if (opts.reason)
            proposal.reason = String(opts.reason).trim();
        settings.institute_port = { ...(settings.institute_port || {}), proposal };
        await this.saveTenantSettings(opts.tenantId, settings);
        return this.getSnapshot(opts.tenantId);
    }
    async approve(opts) {
        const tenant = await this.requireTenant(opts.tenantId);
        const settings = parseSettings(tenant.settings);
        const proposal = readPortProposal(settings);
        this.assertChecker(proposal, opts);
        const approved = proposal;
        await this.applyOwnership(tenant, approved.to);
        await this.setTenantAgentCode(opts.tenantId, approved.to.agent_code);
        approved.status = 'approved';
        approved.checkerId = String(opts.actorId || '');
        approved.checkerEmail = String(opts.actorEmail || '');
        approved.decidedAt = new Date().toISOString();
        const history = Array.isArray(settings.institute_port?.history) ? settings.institute_port.history : [];
        history.unshift(approved);
        settings.institute_port = {
            proposal: approved,
            history: history.slice(0, 20),
        };
        await this.saveTenantSettings(opts.tenantId, settings);
        return this.getSnapshot(opts.tenantId);
    }
    async ownershipMap(tenantIds) {
        const map = new Map();
        const ids = [...new Set(tenantIds.filter(Boolean))];
        if (!ids.length)
            return map;
        const [{ data: tenants }, { data: links }, { data: agents }] = await Promise.all([
            this.db.from('tenants').select('id, agent_code').in('id', ids),
            this.db.from('agent_tenants').select('tenant_id, agent_id, deleted_at').in('tenant_id', ids),
            this.db.from('agents').select('id, agent_code, first_name, last_name, email, status').is('deleted_at', null),
        ]);
        const agentById = new Map((agents || []).map((row) => [String(row.id), row]));
        const agentByCode = new Map((agents || []).map((row) => [String(row.agent_code || '').toUpperCase(), row]));
        const liveLinks = (links || []).filter((row) => !row.deleted_at);
        for (const tenant of tenants || []) {
            const tid = String(tenant.id);
            try {
                const owner = (0, agent_fee_ownership_1.pickOwningAgent)({
                    tenantId: tid,
                    agentTenants: liveLinks.map((row) => ({
                        tenant_id: String(row.tenant_id),
                        agent_id: String(row.agent_id),
                        agent_code: agentById.get(String(row.agent_id))?.agent_code,
                    })),
                    tenantsByCode: [{ id: tid, agent_code: tenant.agent_code }],
                    agentsByCode: (agents || []).map((row) => ({ id: String(row.id), agent_code: row.agent_code })),
                });
                if (!owner) {
                    map.set(tid, unassignedRef());
                    continue;
                }
                const row = agentById.get(owner.agent_id) || agentByCode.get(String(owner.agent_code || '').toUpperCase());
                map.set(tid, row ? instituteFromAgent(row) : {
                    id: owner.agent_id,
                    agent_code: owner.agent_code || null,
                    name: owner.agent_code || 'Institute',
                    isDefault: (0, agent_code_1.isInvifyDefaultAgentCode)(owner.agent_code),
                });
            }
            catch {
                map.set(tid, {
                    id: null,
                    agent_code: tenant.agent_code || null,
                    name: 'Ownership conflict — resolve before porting',
                    isDefault: (0, agent_code_1.isInvifyDefaultAgentCode)(tenant.agent_code),
                });
            }
        }
        return map;
    }
    assertChecker(proposal, actor) {
        if (!proposal || proposal.status !== 'pending') {
            throw httpError('No pending Institute port request for a checker to decide.', 400);
        }
        if (samePortActor(proposal, { id: actor.actorId, email: actor.actorEmail })) {
            throw httpError('Maker cannot approve or reject their own Institute port. Sign in as a different admin.', 403);
        }
    }
    async requireTenant(tenantId) {
        const { data, error } = await this.db.from('tenants').select('id, name, agent_code, settings').eq('id', tenantId).maybeSingle();
        if (error)
            throw httpError(error.message, 500);
        if (!data)
            throw httpError('Tenant not found', 404);
        return data;
    }
    async listInstitutes() {
        const { data, error } = await this.db
            .from('agents')
            .select('id, agent_code, first_name, last_name, email, status')
            .is('deleted_at', null)
            .order('agent_code');
        if (error)
            throw httpError(error.message, 500);
        const rows = (data || []).map(instituteFromAgent);
        if (!rows.some((row) => row.isDefault)) {
            rows.unshift(defaultInstituteRef());
        }
        return rows;
    }
    async resolveCurrent(tenant) {
        const map = await this.ownershipMap([String(tenant.id)]);
        return map.get(String(tenant.id)) || unassignedRef();
    }
    async resolveTarget(raw) {
        const normalized = normalizePortTargetId(raw);
        if (normalized === exports.PLATFORM_DEFAULT_TARGET) {
            const { data } = await this.db
                .from('agents')
                .select('id, agent_code, first_name, last_name, email, status')
                .eq('agent_code', agent_code_1.INVIFY_DEFAULT_AGENT_CODE)
                .is('deleted_at', null)
                .maybeSingle();
            return defaultInstituteRef(data);
        }
        const { data, error } = await this.db
            .from('agents')
            .select('id, agent_code, first_name, last_name, email, status, deleted_at')
            .eq('id', normalized)
            .maybeSingle();
        if (error)
            throw httpError(error.message, 500);
        if (!data || data.deleted_at)
            throw httpError('Target Institute not found', 404);
        const status = String(data.status || '').toUpperCase();
        if (status === 'SUSPENDED' || status === 'TERMINATED') {
            throw httpError('Target Institute is not active', 400);
        }
        return instituteFromAgent(data);
    }
    async applyOwnership(tenant, target) {
        const tenantId = String(tenant.id);
        const { data: links, error: linkErr } = await this.db
            .from('agent_tenants')
            .select('id, tenant_id, agent_id, deleted_at')
            .eq('tenant_id', tenantId);
        if (linkErr)
            throw httpError(linkErr.message, 500);
        const existing = (links || [])[0];
        if (target.id) {
            if (existing) {
                const { error } = await this.db
                    .from('agent_tenants')
                    .update({
                    agent_id: target.id,
                    deleted_at: null,
                    business_name: tenant.name || existing.business_name || tenantId,
                    updated_at: new Date().toISOString(),
                })
                    .eq('id', existing.id);
                if (error)
                    throw httpError(error.message, 500);
            }
            else {
                const { error } = await this.db.from('agent_tenants').insert({
                    agent_id: target.id,
                    tenant_id: tenantId,
                    business_name: tenant.name || 'Tenant',
                    onboarding_date: new Date().toISOString().slice(0, 10),
                    status: 'ONBOARDING',
                });
                if (error)
                    throw httpError(error.message, 500);
            }
        }
        else if (existing) {
            const { error } = await this.db
                .from('agent_tenants')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error)
                throw httpError(error.message, 500);
        }
    }
    async setTenantAgentCode(tenantId, agentCode) {
        const { error } = await this.db.rpc('set_tenant_institute_agent_code', {
            p_tenant_id: tenantId,
            p_agent_code: agentCode || null,
        });
        if (error)
            throw httpError(error.message, 500);
    }
    async saveTenantSettings(tenantId, settings) {
        const { error } = await this.db
            .from('tenants')
            .update({ settings, updated_at: new Date().toISOString() })
            .eq('id', tenantId);
        if (error)
            throw httpError(error.message, 500);
    }
}
exports.TenantInstitutePortService = TenantInstitutePortService;
exports.tenantInstitutePortService = new TenantInstitutePortService();
//# sourceMappingURL=tenant-institute-port.service.js.map
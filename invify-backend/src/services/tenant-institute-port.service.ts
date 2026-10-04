import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../db/supabase';
import { pickOwningAgent } from '../modules/fee-orchestration/agent-fee-ownership';
import { INVIFY_DEFAULT_AGENT_CODE, isInvifyDefaultAgentCode } from '../utils/agent-code';

export const PLATFORM_DEFAULT_TARGET = 'default';

export type InstituteRef = {
  id: string | null;
  agent_code: string | null;
  name: string;
  email?: string | null;
  status?: string | null;
  isDefault: boolean;
};

export type InstitutePortProposal = {
  id: string;
  makerId: string;
  makerEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  from: InstituteRef;
  to: InstituteRef;
  reason?: string;
  checkerId?: string;
  checkerEmail?: string;
  decidedAt?: string;
};

export type InstitutePortSnapshot = {
  tenantId: string;
  tenantName: string;
  current: InstituteRef;
  proposal: InstitutePortProposal | null;
  institutes: InstituteRef[];
  defaultCode: string;
};

function httpError(message: string, status: number, extra?: Record<string, unknown>) {
  const err: any = new Error(message);
  err.status = status;
  if (extra) Object.assign(err, extra);
  return err;
}

function parseSettings(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {};
}

function agentDisplayName(row: any): string {
  const name = `${row?.first_name || ''} ${row?.last_name || ''}`.trim();
  return name || String(row?.agent_code || 'Institute');
}

export function samePortActor(proposal: { makerId?: string; makerEmail?: string }, actor: { id?: string; email?: string }) {
  const makerEmail = String(proposal.makerEmail || '').trim().toLowerCase();
  const actorEmail = String(actor.email || '').trim().toLowerCase();
  const sameEmail = !!actorEmail && makerEmail === actorEmail;
  const sameId = !!actor.id && !!proposal.makerId && String(proposal.makerId) === String(actor.id);
  return sameEmail || sameId;
}

export function normalizePortTargetId(raw: unknown): string | typeof PLATFORM_DEFAULT_TARGET {
  const value = String(raw ?? '').trim();
  if (!value || value.toLowerCase() === PLATFORM_DEFAULT_TARGET || value === '__default__' || isInvifyDefaultAgentCode(value)) {
    return PLATFORM_DEFAULT_TARGET;
  }
  return value;
}

export function instituteRefsEqual(a: InstituteRef, b: InstituteRef) {
  const aId = a.id || '';
  const bId = b.id || '';
  if (aId && bId) return aId === bId;
  if (a.isDefault && b.isDefault) return true;
  return String(a.agent_code || '').toUpperCase() === String(b.agent_code || '').toUpperCase()
    && Boolean(a.agent_code) === Boolean(b.agent_code);
}

function defaultInstituteRef(agent?: any | null): InstituteRef {
  return {
    id: agent?.id ? String(agent.id) : null,
    agent_code: String(agent?.agent_code || INVIFY_DEFAULT_AGENT_CODE),
    name: agent ? agentDisplayName(agent) : 'Platform default',
    email: agent?.email || null,
    status: agent?.status || 'ACTIVE',
    isDefault: true,
  };
}

function instituteFromAgent(row: any): InstituteRef {
  const code = String(row?.agent_code || '');
  return {
    id: row?.id ? String(row.id) : null,
    agent_code: code || null,
    name: agentDisplayName(row),
    email: row?.email || null,
    status: row?.status || null,
    isDefault: isInvifyDefaultAgentCode(code),
  };
}

function unassignedRef(): InstituteRef {
  return {
    id: null,
    agent_code: null,
    name: 'Unassigned (platform default)',
    isDefault: true,
  };
}

export function readPortProposal(settings: Record<string, any>): InstitutePortProposal | null {
  const raw = settings?.institute_port?.proposal;
  if (!raw || typeof raw !== 'object') return null;
  if (!['pending', 'approved', 'rejected'].includes(String(raw.status))) return null;
  return raw as InstitutePortProposal;
}

export class TenantInstitutePortService {
  constructor(private readonly db: any = supabaseAdmin) {}

  async getSnapshot(tenantId: string): Promise<InstitutePortSnapshot> {
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
      defaultCode: INVIFY_DEFAULT_AGENT_CODE,
    };
  }

  async propose(opts: {
    tenantId: string;
    actorId: string;
    actorEmail: string;
    toAgentId?: unknown;
    reason?: string;
  }): Promise<InstitutePortSnapshot> {
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

    const proposal: InstitutePortProposal = {
      id: randomUUID(),
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

  async reject(opts: {
    tenantId: string;
    actorId: string;
    actorEmail: string;
    reason?: string;
  }): Promise<InstitutePortSnapshot> {
    const tenant = await this.requireTenant(opts.tenantId);
    const settings = parseSettings(tenant.settings);
    const proposal = readPortProposal(settings);
    this.assertChecker(proposal, opts);
    proposal!.status = 'rejected';
    proposal!.checkerId = String(opts.actorId || '');
    proposal!.checkerEmail = String(opts.actorEmail || '');
    proposal!.decidedAt = new Date().toISOString();
    if (opts.reason) proposal!.reason = String(opts.reason).trim();
    settings.institute_port = { ...(settings.institute_port || {}), proposal };
    await this.saveTenantSettings(opts.tenantId, settings);
    return this.getSnapshot(opts.tenantId);
  }

  async approve(opts: {
    tenantId: string;
    actorId: string;
    actorEmail: string;
  }): Promise<InstitutePortSnapshot> {
    const tenant = await this.requireTenant(opts.tenantId);
    const settings = parseSettings(tenant.settings);
    const proposal = readPortProposal(settings);
    this.assertChecker(proposal, opts);
    const approved = proposal as InstitutePortProposal;
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

  async ownershipMap(tenantIds: string[]): Promise<Map<string, InstituteRef>> {
    const map = new Map<string, InstituteRef>();
    const ids = [...new Set(tenantIds.filter(Boolean))];
    if (!ids.length) return map;

    const [{ data: tenants }, { data: links }, { data: agents }] = await Promise.all([
      this.db.from('tenants').select('id, agent_code').in('id', ids),
      this.db.from('agent_tenants').select('tenant_id, agent_id, deleted_at').in('tenant_id', ids),
      this.db.from('agents').select('id, agent_code, first_name, last_name, email, status').is('deleted_at', null),
    ]);

    const agentById = new Map<string, any>((agents || []).map((row: any) => [String(row.id), row]));
    const agentByCode = new Map<string, any>((agents || []).map((row: any) => [String(row.agent_code || '').toUpperCase(), row]));
    const liveLinks = (links || []).filter((row: any) => !row.deleted_at);

    for (const tenant of tenants || []) {
      const tid = String(tenant.id);
      try {
        const owner = pickOwningAgent({
          tenantId: tid,
          agentTenants: liveLinks.map((row: any) => ({
            tenant_id: String(row.tenant_id),
            agent_id: String(row.agent_id),
            agent_code: agentById.get(String(row.agent_id))?.agent_code,
          })),
          tenantsByCode: [{ id: tid, agent_code: tenant.agent_code }],
          agentsByCode: (agents || []).map((row: any) => ({ id: String(row.id), agent_code: row.agent_code })),
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
          isDefault: isInvifyDefaultAgentCode(owner.agent_code),
        });
      } catch {
        map.set(tid, {
          id: null,
          agent_code: tenant.agent_code || null,
          name: 'Ownership conflict — resolve before porting',
          isDefault: isInvifyDefaultAgentCode(tenant.agent_code),
        });
      }
    }
    return map;
  }

  private assertChecker(proposal: InstitutePortProposal | null, actor: { actorId: string; actorEmail: string }) {
    if (!proposal || proposal.status !== 'pending') {
      throw httpError('No pending Institute port request for a checker to decide.', 400);
    }
    if (samePortActor(proposal, { id: actor.actorId, email: actor.actorEmail })) {
      throw httpError('Maker cannot approve or reject their own Institute port. Sign in as a different admin.', 403);
    }
  }

  private async requireTenant(tenantId: string) {
    const { data, error } = await this.db.from('tenants').select('id, name, agent_code, settings').eq('id', tenantId).maybeSingle();
    if (error) throw httpError(error.message, 500);
    if (!data) throw httpError('Tenant not found', 404);
    return data;
  }

  private async listInstitutes(): Promise<InstituteRef[]> {
    const { data, error } = await this.db
      .from('agents')
      .select('id, agent_code, first_name, last_name, email, status')
      .is('deleted_at', null)
      .order('agent_code');
    if (error) throw httpError(error.message, 500);
    const rows = (data || []).map(instituteFromAgent);
    if (!rows.some((row: InstituteRef) => row.isDefault)) {
      rows.unshift(defaultInstituteRef());
    }
    return rows;
  }

  private async resolveCurrent(tenant: any): Promise<InstituteRef> {
    const map = await this.ownershipMap([String(tenant.id)]);
    return map.get(String(tenant.id)) || unassignedRef();
  }

  private async resolveTarget(raw: unknown): Promise<InstituteRef> {
    const normalized = normalizePortTargetId(raw);
    if (normalized === PLATFORM_DEFAULT_TARGET) {
      const { data } = await this.db
        .from('agents')
        .select('id, agent_code, first_name, last_name, email, status')
        .eq('agent_code', INVIFY_DEFAULT_AGENT_CODE)
        .is('deleted_at', null)
        .maybeSingle();
      return defaultInstituteRef(data);
    }

    const { data, error } = await this.db
      .from('agents')
      .select('id, agent_code, first_name, last_name, email, status, deleted_at')
      .eq('id', normalized)
      .maybeSingle();
    if (error) throw httpError(error.message, 500);
    if (!data || data.deleted_at) throw httpError('Target Institute not found', 404);
    const status = String(data.status || '').toUpperCase();
    if (status === 'SUSPENDED' || status === 'TERMINATED') {
      throw httpError('Target Institute is not active', 400);
    }
    return instituteFromAgent(data);
  }

  private async applyOwnership(tenant: any, target: InstituteRef) {
    const tenantId = String(tenant.id);
    const { data: links, error: linkErr } = await this.db
      .from('agent_tenants')
      .select('id, tenant_id, agent_id, deleted_at')
      .eq('tenant_id', tenantId);
    if (linkErr) throw httpError(linkErr.message, 500);

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
        if (error) throw httpError(error.message, 500);
      } else {
        const { error } = await this.db.from('agent_tenants').insert({
          agent_id: target.id,
          tenant_id: tenantId,
          business_name: tenant.name || 'Tenant',
          onboarding_date: new Date().toISOString().slice(0, 10),
          status: 'ONBOARDING',
        });
        if (error) throw httpError(error.message, 500);
      }
    } else if (existing) {
      const { error } = await this.db
        .from('agent_tenants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw httpError(error.message, 500);
    }
  }

  private async setTenantAgentCode(tenantId: string, agentCode: string | null | undefined) {
    const { error } = await this.db.rpc('set_tenant_institute_agent_code', {
      p_tenant_id: tenantId,
      p_agent_code: agentCode || null,
    });
    if (error) throw httpError(error.message, 500);
  }

  private async saveTenantSettings(tenantId: string, settings: Record<string, any>) {
    const { error } = await this.db
      .from('tenants')
      .update({ settings, updated_at: new Date().toISOString() })
      .eq('id', tenantId);
    if (error) throw httpError(error.message, 500);
  }
}

export const tenantInstitutePortService = new TenantInstitutePortService();

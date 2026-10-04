import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../db/supabase';
import { FeeCalculator } from '../modules/fee-orchestration/FeeCalculator';
import { FeeSplitter } from '../modules/fee-orchestration/FeeSplitter';
import { GovAuditService } from './gov-audit.service';
import {
  FeeCalcMethod,
  FeeTransactionType,
  REQUIRED_SPLIT_BPS,
} from '../modules/fee-orchestration/types';

export const PLATFORM_FEE_TRANSACTION_TYPES: FeeTransactionType[] = [
  'POS_WITHDRAWAL',
  'VIRTUAL_ACCOUNT_INWARD_TRANSFER',
  'TREASURY_WITHDRAWAL',
  'TREASURY_TRANSFER',
  'SMS',
  'AI_TASK',
];

export const POS_WITHDRAWAL_DEFAULTS = {
  method: 'PERCENTAGE' as const,
  percentage_bps: 125,
  flat_amount_kobo: 0,
  min_fee_kobo: 0,
  max_fee_kobo: 5000,
};

const METHODS: FeeCalcMethod[] = ['FLAT', 'PERCENTAGE', 'HYBRID'];

export type DraftFeeFields = {
  method: FeeCalcMethod;
  percentage_bps: number;
  flat_amount_kobo: number;
  min_fee_kobo: number;
  max_fee_kobo: number;
  platform_share_bps: number;
  processor_share_bps: number;
  service_share_bps: number;
  agent_share_bps: number;
  notes?: string | null;
};

type DbClient = Pick<typeof supabaseAdmin, 'from' | 'rpc'>;

function isNonNegInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function asType(raw: string): FeeTransactionType | null {
  return PLATFORM_FEE_TRANSACTION_TYPES.includes(raw as FeeTransactionType)
    ? (raw as FeeTransactionType)
    : null;
}

function shareTotal(fields: Pick<DraftFeeFields, 'platform_share_bps' | 'processor_share_bps' | 'service_share_bps' | 'agent_share_bps'>): number {
  return (
    fields.platform_share_bps +
    fields.processor_share_bps +
    fields.service_share_bps +
    fields.agent_share_bps
  );
}

const MC_PREFIX = '__FEE_MC__:';

export type FeePublishActor = { id: string; email: string };

export type FeePublishProposal = {
  status: 'pending';
  makerId: string;
  makerEmail: string;
  proposedAt: string;
  versionId: string;
};

export type FeePublishedGovernance = {
  status: 'published';
  makerId: string;
  makerEmail: string;
  proposedAt: string;
  versionId: string;
  checkerId: string;
  checkerEmail: string;
  approvedAt: string;
};

export function parseMcNotes(notes: string | null | undefined): {
  proposal: FeePublishProposal | null;
  published: FeePublishedGovernance | null;
  operatorNotes: string | null;
} {
  if (!notes) return { proposal: null, published: null, operatorNotes: null };
  if (!notes.startsWith(MC_PREFIX)) return { proposal: null, published: null, operatorNotes: notes };
  try {
    const parsed = JSON.parse(notes.slice(MC_PREFIX.length));
    const operatorNotes = parsed.operatorNotes ?? null;
    if (parsed.status === 'published' && parsed.makerId && parsed.versionId) {
      return {
        proposal: null,
        published: {
          status: 'published',
          makerId: String(parsed.makerId),
          makerEmail: String(parsed.makerEmail || ''),
          proposedAt: String(parsed.proposedAt || ''),
          versionId: String(parsed.versionId),
          checkerId: String(parsed.checkerId || ''),
          checkerEmail: String(parsed.checkerEmail || ''),
          approvedAt: String(parsed.approvedAt || ''),
        },
        operatorNotes,
      };
    }
    if (parsed.status === 'pending' && parsed.makerId && parsed.versionId) {
      return {
        proposal: {
          status: 'pending',
          makerId: String(parsed.makerId),
          makerEmail: String(parsed.makerEmail || ''),
          proposedAt: String(parsed.proposedAt || ''),
          versionId: String(parsed.versionId),
        },
        published: null,
        operatorNotes,
      };
    }
  } catch {
    /* ignore */
  }
  return { proposal: null, published: null, operatorNotes: notes };
}

function writeMcNotes(proposal: FeePublishProposal | null, operatorNotes: string | null): string | null {
  if (!proposal) return operatorNotes;
  return MC_PREFIX + JSON.stringify({ ...proposal, operatorNotes: operatorNotes || null });
}

function writePublishedMcNotes(published: FeePublishedGovernance, operatorNotes: string | null): string {
  return MC_PREFIX + JSON.stringify({ ...published, operatorNotes: operatorNotes || null });
}

function requireActor(actor?: FeePublishActor | null): FeePublishActor {
  const id = String(actor?.id || '').trim();
  const email = String(actor?.email || '').trim();
  if (!id && !email) {
    throw Object.assign(new Error('Authenticated operator required for maker-checker'), { status: 401 });
  }
  return { id, email };
}

function sameOperator(a: { id?: string; email?: string }, b: { id?: string; email?: string }): boolean {
  const idA = String(a.id || '').trim();
  const idB = String(b.id || '').trim();
  if (idA && idB && idA === idB) return true;
  const eA = String(a.email || '').trim().toLowerCase();
  const eB = String(b.email || '').trim().toLowerCase();
  return Boolean(eA && eB && eA === eB);
}

export function publishBlockers(_transactionType: FeeTransactionType, fields: DraftFeeFields): string[] {
  const reasons: string[] = [];
  if (!METHODS.includes(fields.method)) reasons.push('Calculation method is invalid.');
  if (!isNonNegInt(fields.percentage_bps) || !isNonNegInt(fields.flat_amount_kobo)
    || !isNonNegInt(fields.min_fee_kobo) || !isNonNegInt(fields.max_fee_kobo)) {
    reasons.push('Fee amounts must be non-negative integers (kobo / bps).');
  }
  if (!isNonNegInt(fields.platform_share_bps) || !isNonNegInt(fields.processor_share_bps)
    || !isNonNegInt(fields.service_share_bps) || !isNonNegInt(fields.agent_share_bps)) {
    reasons.push('Distribution values must be non-negative integer basis points.');
  }
  const split = shareTotal(fields);
  if (split !== REQUIRED_SPLIT_BPS) {
    reasons.push('Distribution must total exactly 100%.');
  }
  if (fields.method === 'FLAT' && (fields.flat_amount_kobo <= 0 || fields.percentage_bps !== 0)) {
    reasons.push('FLAT requires a positive flat amount and 0% percentage.');
  }
  if (fields.method === 'PERCENTAGE' && fields.percentage_bps <= 0) {
    reasons.push('PERCENTAGE requires percentage_bps > 0.');
  }
  if (fields.method === 'HYBRID' && (fields.flat_amount_kobo <= 0 || fields.percentage_bps <= 0)) {
    reasons.push('HYBRID requires both a positive flat amount and percentage.');
  }
  if (fields.max_fee_kobo > 0 && fields.max_fee_kobo < fields.min_fee_kobo) {
    reasons.push('Maximum fee must be zero or greater than or equal to the minimum fee.');
  }
  return reasons;
}

export function mapVersion(row: any) {
  const status = String(row.status || 'DRAFT');
  const effective_from = row.published_at || row.created_at || null;
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    version_number: Number(row.version_number),
    status,
    method: row.method,
    percentage_bps: Number(row.percentage_bps || 0),
    flat_amount_kobo: Number(row.flat_amount_kobo || 0),
    min_fee_kobo: Number(row.min_fee_kobo || 0),
    max_fee_kobo: Number(row.max_fee_kobo || 0),
    platform_share_bps: Number(row.platform_share_bps || 0),
    processor_share_bps: Number(row.processor_share_bps || 0),
    service_share_bps: Number(row.service_share_bps || 0),
    agent_share_bps: Number(row.agent_share_bps || 0),
    notes: row.notes ? parseMcNotes(row.notes).operatorNotes : null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    published_at: row.published_at || null,
    published_by: row.published_by || null,
    effective_from,
    effective_to: null as string | null,
    editable: status === 'DRAFT',
  };
}

function fieldsFromVersion(row: any): DraftFeeFields {
  return {
    method: (row?.method || 'PERCENTAGE') as FeeCalcMethod,
    percentage_bps: Number(row?.percentage_bps || 0),
    flat_amount_kobo: Number(row?.flat_amount_kobo || 0),
    min_fee_kobo: Number(row?.min_fee_kobo || 0),
    max_fee_kobo: Number(row?.max_fee_kobo || 0),
    platform_share_bps: Number(row?.platform_share_bps || 0),
    processor_share_bps: Number(row?.processor_share_bps || 0),
    service_share_bps: Number(row?.service_share_bps || 0),
    agent_share_bps: Number(row?.agent_share_bps || 0),
    notes: parseMcNotes(row?.notes).operatorNotes,
  };
}

export function computePreview(input: {
  transactionType: FeeTransactionType;
  transactionAmountKobo: number;
  fields: DraftFeeFields;
}) {
  const fields = input.fields;
  if (!Number.isInteger(input.transactionAmountKobo) || input.transactionAmountKobo <= 0) {
    throw Object.assign(new Error('transaction amount must be a positive integer kobo amount'), { status: 400 });
  }
  const breakdown = FeeCalculator.calculate({
    method: fields.method,
    transactionAmountKobo: input.transactionAmountKobo,
    percentageBps: fields.percentage_bps,
    flatAmountKobo: fields.flat_amount_kobo,
    minFeeKobo: fields.min_fee_kobo,
    maxFeeKobo: fields.max_fee_kobo,
  });
  const splitOk = shareTotal(fields) === REQUIRED_SPLIT_BPS;
  const distribution = splitOk
    ? FeeSplitter.split(breakdown.final_fee_kobo, {
        platform_bps: fields.platform_share_bps,
        processor_bps: fields.processor_share_bps,
        service_bps: fields.service_share_bps,
        agent_bps: fields.agent_share_bps,
      })
    : null;
  return {
    persisted: false,
    created_assessment: false,
    created_ledger_entry: false,
    transaction_amount_kobo: input.transactionAmountKobo,
    method: fields.method,
    percentage_bps: fields.percentage_bps,
    flat_amount_kobo: fields.flat_amount_kobo,
    min_fee_kobo: fields.min_fee_kobo,
    max_fee_kobo: fields.max_fee_kobo,
    calculated_fee_kobo: breakdown.calculated_fee_kobo,
    min_applied_kobo: breakdown.min_applied_kobo,
    cap_applied_kobo: breakdown.cap_applied_kobo,
    final_fee_kobo: breakdown.final_fee_kobo,
    distribution_valid: splitOk,
    distribution_total_bps: shareTotal(fields),
    distribution,
  };
}

export class PlatformFeeProfilesService {
  constructor(private readonly db: DbClient = supabaseAdmin) {}

  async listProfiles() {
    const { data: profiles, error } = await this.db
      .from('fee_profiles')
      .select('*')
      .order('transaction_type');
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    const { data: versions, error: vErr } = await this.db
      .from('fee_profile_versions')
      .select('*')
      .order('version_number', { ascending: false });
    if (vErr) throw Object.assign(new Error(vErr.message), { status: 500 });

    const byProfile = new Map<string, any[]>();
    for (const row of versions || []) {
      const id = String(row.profile_id);
      if (!byProfile.has(id)) byProfile.set(id, []);
      byProfile.get(id)!.push(row);
    }

    const foundTypes = new Set(
      (profiles || [])
        .filter((p: any) => !p.agent_id && p.scope !== 'AGENT')
        .map((p: any) => p.transaction_type),
    );
    return PLATFORM_FEE_TRANSACTION_TYPES.map((transaction_type) => {
      const profile = (profiles || []).find(
        (p: any) => p.transaction_type === transaction_type && !p.agent_id && p.scope !== 'AGENT',
      ) || null;
      const rows = profile ? byProfile.get(String(profile.id)) || [] : [];
      const published = rows.find((r) => r.status === 'PUBLISHED') || null;
      const draft = rows.find((r) => r.status === 'DRAFT') || null;
      const pending = parseMcNotes(draft?.notes).proposal;
      const current = draft || published || rows[0] || null;
      const mapped = current ? mapVersion(current) : null;
      let current_status = 'NO_VERSION';
      if (published) current_status = 'PUBLISHED';
      else if (pending) current_status = 'PENDING_CHECKER';
      else if (draft) current_status = 'DRAFT';
      return {
        transaction_type,
        display_name: profile?.display_name || transaction_type.replace(/_/g, ' '),
        description: profile?.description || null,
        profile_id: profile ? String(profile.id) : null,
        exists: Boolean(profile),
        current_status,
        current_published_version: published ? Number(published.version_number) : null,
        calculation_method: mapped?.method || null,
        percentage_bps: published ? Number(published.percentage_bps || 0) : (mapped?.percentage_bps ?? null),
        max_fee_kobo: published ? Number(published.max_fee_kobo || 0) : (mapped?.max_fee_kobo ?? null),
        platform_share_bps: published ? Number(published.platform_share_bps || 0) : null,
        processor_share_bps: published ? Number(published.processor_share_bps || 0) : null,
        service_share_bps: published ? Number(published.service_share_bps || 0) : null,
        agent_share_bps: published ? Number(published.agent_share_bps || 0) : null,
        fee_source_label: 'Global configuration',
        effective_from: published ? (published.published_at || published.created_at) : (mapped?.effective_from || null),
        last_updated: profile?.updated_at || mapped?.updated_at || null,
        seed_present: foundTypes.has(transaction_type),
      };
    });
  }

  async listAgents() {
    const { data, error } = await this.db
      .from('agents')
      .select('id, agent_code, first_name, last_name, email, status')
      .is('deleted_at', null)
      .order('agent_code');
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    return (data || []).map((row: any) => ({
      id: String(row.id),
      agent_code: row.agent_code,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.agent_code,
      email: row.email,
      status: row.status,
    }));
  }

  private async requireAgent(agentId: string) {
    const { data, error } = await this.db
      .from('agents')
      .select('id, agent_code, first_name, last_name, status')
      .eq('id', agentId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    if (!data) throw Object.assign(new Error('Agent not found'), { status: 404 });
    return data;
  }

  private async loadGlobalProfileRow(transactionType: FeeTransactionType) {
    let query = this.db.from('fee_profiles').select('*').eq('transaction_type', transactionType);
    const scoped = await query.eq('scope', 'GLOBAL').maybeSingle();
    if (!scoped.error && scoped.data) return scoped.data;
    const fallback = await this.db.from('fee_profiles').select('*').eq('transaction_type', transactionType).maybeSingle();
    if (fallback.error) throw Object.assign(new Error(fallback.error.message), { status: 500 });
    return fallback.data;
  }

  private async loadAgentProfileRow(transactionType: FeeTransactionType, agentId: string) {
    const { data: link } = await this.db
      .from('agent_fee_profiles')
      .select('fee_profile_id')
      .eq('agent_id', agentId)
      .eq('transaction_type', transactionType)
      .maybeSingle();
    if (!link?.fee_profile_id) return null;
    const { data } = await this.db.from('fee_profiles').select('*').eq('id', link.fee_profile_id).maybeSingle();
    return data || null;
  }

  async getProfile(transactionTypeRaw: string, agentId?: string | null) {
    const transactionType = asType(String(transactionTypeRaw || '').toUpperCase());
    if (!transactionType) throw Object.assign(new Error('Unknown fee transaction type'), { status: 400 });

    let agent = null;
    if (agentId) agent = await this.requireAgent(String(agentId));

    const globalProfile = await this.loadGlobalProfileRow(transactionType);
    const agentProfile = agent ? await this.loadAgentProfileRow(transactionType, String(agent.id)) : null;
    const profile = agentProfile || globalProfile;
    const feeSource = agentProfile ? 'AGENT_PROFILE' : 'GLOBAL_FALLBACK';
    if (!profile) throw Object.assign(new Error('Fee profile not found'), { status: 404 });

    const { data: versions, error: vErr } = await this.db
      .from('fee_profile_versions')
      .select('*')
      .eq('profile_id', profile.id)
      .order('version_number', { ascending: false });
    if (vErr) throw Object.assign(new Error(vErr.message), { status: 500 });

    const mappedVersions = (versions || []).map(mapVersion);
    const draft = mappedVersions.find((v) => v.status === 'DRAFT') || null;
    const published = mappedVersions.find((v) => v.status === 'PUBLISHED') || null;
    const working = draft || published;
    const fields = fieldsFromVersion(working);
    const blockers = working?.status === 'DRAFT' ? publishBlockers(transactionType, fields) : ['No DRAFT version is eligible for publication.'];
    const rawDraft = (versions || []).find((v: any) => v.status === 'DRAFT') || null;
    const parsedMc = parseMcNotes(rawDraft?.notes);
    return {
      profile: {
        id: String(profile.id),
        transaction_type: transactionType,
        display_name: profile.display_name,
        description: profile.description,
        current_published_version_id: profile.current_published_version_id,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        scope: agentProfile ? 'AGENT' : 'GLOBAL',
        agent_id: agent ? String(agent.id) : null,
      },
      agent: agent
        ? { id: String(agent.id), agent_code: agent.agent_code, name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() }
        : null,
      fee_source: agent ? feeSource : 'GLOBAL',
      fee_source_label: agent
        ? (agentProfile ? `Agent ${agent.agent_code} configuration` : 'GLOBAL FALLBACK')
        : 'Global configuration',
      draft,
      published,
      working_version: working,
      fields,
      proposal: parsedMc.proposal,
      pos_locked: false,
      pos_tariff_locked: transactionType === 'POS_WITHDRAWAL' && Boolean(agent),
      publish_ready: blockers.length === 0 && !parsedMc.proposal,
      publish_blockers: blockers,
      versions: mappedVersions,
    };
  }

  async saveDraft(transactionTypeRaw: string, body: any) {
    const transactionType = asType(String(transactionTypeRaw || '').toUpperCase());
    if (!transactionType) throw Object.assign(new Error('Unknown fee transaction type'), { status: 400 });
    const agentId = body?.agentId || body?.agent_id || null;
    if (agentId) await this.ensureAgentProfile(transactionType, String(agentId));

    const raw: DraftFeeFields = {
      method: body?.method,
      percentage_bps: body?.percentage_bps,
      flat_amount_kobo: body?.flat_amount_kobo,
      min_fee_kobo: body?.min_fee_kobo,
      max_fee_kobo: body?.max_fee_kobo,
      platform_share_bps: body?.platform_share_bps,
      processor_share_bps: body?.processor_share_bps,
      service_share_bps: body?.service_share_bps,
      agent_share_bps: body?.agent_share_bps,
      notes: body?.notes ?? null,
    };

    for (const key of [
      'percentage_bps',
      'flat_amount_kobo',
      'min_fee_kobo',
      'max_fee_kobo',
      'platform_share_bps',
      'processor_share_bps',
      'service_share_bps',
      'agent_share_bps',
    ] as const) {
      if (!isNonNegInt(raw[key])) {
        throw Object.assign(new Error('Negative fee values are not allowed. Amounts must be non-negative integers.'), { status: 400 });
      }
    }

    const incoming: DraftFeeFields = raw;
    if (transactionType === 'POS_WITHDRAWAL' && agentId) {
      incoming.method = POS_WITHDRAWAL_DEFAULTS.method;
      incoming.percentage_bps = POS_WITHDRAWAL_DEFAULTS.percentage_bps;
      incoming.flat_amount_kobo = POS_WITHDRAWAL_DEFAULTS.flat_amount_kobo;
      incoming.min_fee_kobo = POS_WITHDRAWAL_DEFAULTS.min_fee_kobo;
      incoming.max_fee_kobo = POS_WITHDRAWAL_DEFAULTS.max_fee_kobo;
    }

    if (!METHODS.includes(incoming.method)) {
      throw Object.assign(new Error('Calculation method is invalid'), { status: 400 });
    }
    if (incoming.max_fee_kobo > 0 && incoming.max_fee_kobo < incoming.min_fee_kobo) {
      throw Object.assign(new Error('Maximum fee must be zero or greater than or equal to the minimum fee'), { status: 400 });
    }

    const detail = await this.getProfile(transactionType, agentId);
    const versions = detail.versions;
    const existingDraft = versions.find((v) => v.status === 'DRAFT');
    const payload = {
      method: incoming.method,
      percentage_bps: incoming.percentage_bps,
      flat_amount_kobo: incoming.flat_amount_kobo,
      min_fee_kobo: incoming.min_fee_kobo,
      max_fee_kobo: incoming.max_fee_kobo,
      platform_share_bps: incoming.platform_share_bps,
      processor_share_bps: incoming.processor_share_bps,
      service_share_bps: incoming.service_share_bps,
      agent_share_bps: incoming.agent_share_bps,
      notes: incoming.notes,
      status: 'DRAFT',
    };

    if (existingDraft) {
      const { error } = await this.db
        .from('fee_profile_versions')
        .update(payload)
        .eq('id', existingDraft.id);
      if (error) throw Object.assign(new Error(error.message), { status: 400 });
      await this.auditFeeChange(agentId, transactionType, 'DRAFT_UPDATED', {
        previous_version: existingDraft.id,
        new_version: existingDraft.id,
      });
      return this.getProfile(transactionType, agentId);
    }

    const maxVersion = versions.reduce((m, v) => Math.max(m, v.version_number), 0);
    const { error } = await this.db
      .from('fee_profile_versions')
      .insert({
        profile_id: detail.profile.id,
        version_number: maxVersion + 1,
        ...payload,
      });
    if (error) throw Object.assign(new Error(error.message), { status: 400 });
    await this.auditFeeChange(agentId, transactionType, 'DRAFT_CREATED', {
      previous_version: detail.published?.id || null,
      new_version: null,
    });
    return this.getProfile(transactionType, agentId);
  }

  async ensureAgentProfile(transactionType: FeeTransactionType, agentId: string) {
    const agent = await this.requireAgent(agentId);
    const existing = await this.loadAgentProfileRow(transactionType, agentId);
    if (existing) return existing;
    const globalProfile = await this.loadGlobalProfileRow(transactionType);
    if (!globalProfile) throw Object.assign(new Error('Global fee profile not found'), { status: 404 });
    const now = new Date().toISOString();
    const profileId = randomUUID();
    const { error: pErr } = await this.db.from('fee_profiles').insert({
      id: profileId,
      transaction_type: transactionType,
      display_name: `${globalProfile.display_name} (${agent.agent_code})`,
      description: globalProfile.description,
      scope: 'AGENT',
      agent_id: agentId,
      created_at: now,
      updated_at: now,
    });
    if (pErr && !String(pErr.message || '').toLowerCase().includes('duplicate')) {
      throw Object.assign(new Error(pErr.message), { status: 500 });
    }
    const { error: lErr } = await this.db.from('agent_fee_profiles').insert({
      agent_id: agentId,
      transaction_type: transactionType,
      fee_profile_id: profileId,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    });
    if (lErr && !String(lErr.message || '').toLowerCase().includes('duplicate')) {
      throw Object.assign(new Error(lErr.message), { status: 500 });
    }
    const { data: published } = await this.db
      .from('fee_profile_versions')
      .select('*')
      .eq('profile_id', globalProfile.id)
      .eq('status', 'PUBLISHED')
      .maybeSingle();
    const seed = published || {};
    await this.db.from('fee_profile_versions').insert({
      profile_id: profileId,
      version_number: 1,
      status: 'DRAFT',
      method: transactionType === 'POS_WITHDRAWAL' ? POS_WITHDRAWAL_DEFAULTS.method : (seed.method || 'PERCENTAGE'),
      percentage_bps: transactionType === 'POS_WITHDRAWAL' ? POS_WITHDRAWAL_DEFAULTS.percentage_bps : Number(seed.percentage_bps || 0),
      flat_amount_kobo: transactionType === 'POS_WITHDRAWAL' ? POS_WITHDRAWAL_DEFAULTS.flat_amount_kobo : Number(seed.flat_amount_kobo || 0),
      min_fee_kobo: transactionType === 'POS_WITHDRAWAL' ? POS_WITHDRAWAL_DEFAULTS.min_fee_kobo : Number(seed.min_fee_kobo || 0),
      max_fee_kobo: transactionType === 'POS_WITHDRAWAL' ? POS_WITHDRAWAL_DEFAULTS.max_fee_kobo : Number(seed.max_fee_kobo || 0),
      platform_share_bps: Number(seed.platform_share_bps || 0),
      processor_share_bps: Number(seed.processor_share_bps || 0),
      service_share_bps: Number(seed.service_share_bps || 0),
      agent_share_bps: Number(seed.agent_share_bps || 0),
    });
    return this.loadAgentProfileRow(transactionType, agentId);
  }

  async proposePublish(transactionTypeRaw: string, actorInput: FeePublishActor, agentId?: string | null, body?: any) {
    const actor = requireActor(actorInput);
    if (body?.method) {
      await this.saveDraft(transactionTypeRaw, { ...body, agentId: agentId || body.agentId || body.agent_id || null });
    }
    const detail = await this.getProfile(transactionTypeRaw, agentId);
    const draft = detail.draft;
    if (!draft) {
      throw Object.assign(new Error('Cannot propose: no DRAFT version exists'), { status: 400 });
    }
    const blockers = publishBlockers(detail.profile.transaction_type, detail.fields);
    if (blockers.length) {
      throw Object.assign(new Error(blockers[0]), { status: 400, blockers });
    }
    if (detail.proposal) {
      throw Object.assign(new Error('A publish proposal is already pending checker approval'), { status: 400 });
    }
    const proposal: FeePublishProposal = {
      status: 'pending',
      makerId: actor.id,
      makerEmail: actor.email,
      proposedAt: new Date().toISOString(),
      versionId: draft.id,
    };
    const { error } = await this.db
      .from('fee_profile_versions')
      .update({ notes: writeMcNotes(proposal, draft.notes) })
      .eq('id', draft.id);
    if (error) throw Object.assign(new Error(error.message), { status: 400 });
    await this.auditFeeChange(agentId, transactionTypeRaw, 'DRAFT_UPDATED', { previous_version: draft.id, new_version: draft.id, action_detail: 'PROPOSE' });
    return this.getProfile(transactionTypeRaw, agentId);
  }

  async rejectPublish(transactionTypeRaw: string, actorInput: FeePublishActor, agentId?: string | null) {
    requireActor(actorInput);
    const detail = await this.getProfile(transactionTypeRaw, agentId);
    if (!detail.proposal || !detail.draft) {
      throw Object.assign(new Error('No pending publish proposal to reject'), { status: 400 });
    }
    const { error } = await this.db
      .from('fee_profile_versions')
      .update({ notes: writeMcNotes(null, detail.draft.notes) })
      .eq('id', detail.draft.id);
    if (error) throw Object.assign(new Error(error.message), { status: 400 });
    return this.getProfile(transactionTypeRaw, agentId);
  }

  async publish(transactionTypeRaw: string, actorInput?: FeePublishActor, agentId?: string | null, requestedVersionId?: string | null) {
    const actor = requireActor(actorInput || null);
    const detail = await this.getProfile(transactionTypeRaw, agentId);
    const draft = detail.draft;
    if (!draft) {
      const published = detail.published;
      if (published) {
        const { data: row } = await this.db
          .from('fee_profile_versions')
          .select('id, notes, status')
          .eq('id', published.id)
          .maybeSingle();
        const pending = parseMcNotes(row?.notes).proposal;
        if (row?.status === 'PUBLISHED' && pending) {
          if (sameOperator(actor, { id: pending.makerId, email: pending.makerEmail })) {
            throw Object.assign(new Error('Checker cannot be the same operator as the maker'), { status: 403 });
          }
          const { error: govErr } = await this.db
            .from('fee_profile_versions')
            .update({
              notes: writePublishedMcNotes(
                {
                  status: 'published',
                  makerId: pending.makerId,
                  makerEmail: pending.makerEmail,
                  proposedAt: pending.proposedAt,
                  versionId: published.id,
                  checkerId: actor.id,
                  checkerEmail: actor.email,
                  approvedAt: new Date().toISOString(),
                },
                parseMcNotes(row.notes).operatorNotes,
              ),
            })
            .eq('id', published.id);
          if (govErr) throw Object.assign(new Error(govErr.message), { status: 400 });
          const refreshed = await this.getProfile(transactionTypeRaw, agentId);
          return { published_version_id: published.id, already_published: true, ...refreshed };
        }
      }
      throw Object.assign(new Error('Cannot publish: no DRAFT version exists'), { status: 400 });
    }
    const blockers = publishBlockers(detail.profile.transaction_type, detail.fields);
    if (blockers.length) {
      throw Object.assign(new Error(blockers[0]), { status: 400, blockers });
    }
    if (!detail.proposal || detail.proposal.status !== 'pending') {
      throw Object.assign(new Error('Maker-checker required. A maker must propose publish, then a different checker must approve.'), { status: 400 });
    }
    if (sameOperator(actor, { id: detail.proposal.makerId, email: detail.proposal.makerEmail })) {
      throw Object.assign(new Error('Checker cannot be the same operator as the maker'), { status: 403 });
    }
    if (detail.proposal.versionId !== draft.id) {
      throw Object.assign(new Error('Pending proposal does not match the current draft'), { status: 400 });
    }
    if (requestedVersionId && String(requestedVersionId) !== String(draft.id)) {
      throw Object.assign(new Error('Cannot publish another Agent or a stale draft version'), { status: 403 });
    }

    const { data, error } = await this.db.rpc('publish_fee_profile_version', {
      p_version_id: draft.id,
    });
    if (error) throw Object.assign(new Error(error.message), { status: 400 });
    const { error: govErr } = await this.db
      .from('fee_profile_versions')
      .update({
        notes: writePublishedMcNotes(
          {
            status: 'published',
            makerId: detail.proposal.makerId,
            makerEmail: detail.proposal.makerEmail,
            proposedAt: detail.proposal.proposedAt,
            versionId: draft.id,
            checkerId: actor.id,
            checkerEmail: actor.email,
            approvedAt: new Date().toISOString(),
          },
          parseMcNotes(draft.notes).operatorNotes,
        ),
      })
      .eq('id', draft.id);
    if (govErr) throw Object.assign(new Error(govErr.message), { status: 400 });
    await this.auditFeeChange(agentId, transactionTypeRaw, 'PUBLISHED', {
      previous_version: detail.published?.id || null,
      new_version: draft.id,
    });
    const refreshed = await this.getProfile(transactionTypeRaw, agentId);
    return { published_version_id: data || draft.id, ...refreshed };
  }

  async preview(transactionTypeRaw: string, body: any) {
    const transactionType = asType(String(transactionTypeRaw || '').toUpperCase());
    if (!transactionType) throw Object.assign(new Error('Unknown fee transaction type'), { status: 400 });
    const agentId = body?.agentId || body?.agent_id || null;
    let fields = {
      method: body?.method,
      percentage_bps: Number(body?.percentage_bps || 0),
      flat_amount_kobo: Number(body?.flat_amount_kobo || 0),
      min_fee_kobo: Number(body?.min_fee_kobo || 0),
      max_fee_kobo: Number(body?.max_fee_kobo || 0),
      platform_share_bps: Number(body?.platform_share_bps || 0),
      processor_share_bps: Number(body?.processor_share_bps || 0),
      service_share_bps: Number(body?.service_share_bps || 0),
      agent_share_bps: Number(body?.agent_share_bps || 0),
    };
    let source = 'REQUEST_BODY';
    let version: any = null;
    if (agentId || body?.use_resolved_profile) {
      const agentDetail = agentId ? await this.getProfile(transactionType, agentId) : null;
      const globalDetail = await this.getProfile(transactionType, null);
      const published = agentDetail?.published || globalDetail.published;
      if (published) {
        fields = fieldsFromVersion(published);
        source = agentDetail?.published ? String(agentDetail.fee_source) : 'GLOBAL_FALLBACK';
        version = published;
      }
    }
    const calc = computePreview({
      transactionType,
      transactionAmountKobo: Number(body?.transaction_amount_kobo ?? body?.amountKobo),
      fields,
    });
    return {
      ...calc,
      agent_id: agentId || null,
      tenant_id: body?.tenantId || body?.tenant_id || null,
      transaction_type: transactionType,
      fee_profile_id: version?.profile_id || null,
      fee_profile_version_id: version?.id || null,
      fee_source: source,
      agent_share_kobo: calc.distribution ? calc.distribution.agent_amount_kobo : 0,
    };
  }

  private async auditFeeChange(
    agentId: string | null | undefined,
    transactionType: string,
    action: string,
    extra: Record<string, unknown>,
  ) {
    if (process.env.JEST_WORKER_ID) return;
    try {
      await GovAuditService.logAction({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        module: 'FINANCIAL',
        action,
        user_email: 'platform-fees',
        user_name: 'platform-fees',
        ip_address: '',
        status: 'success',
        target: String(transactionType),
        metadata: { agent_id: agentId || null, transaction_type: transactionType, ...extra },
      });
    } catch {
      /* audit must never block fee configuration */
    }
  }
}

export const platformFeeProfilesService = new PlatformFeeProfilesService();

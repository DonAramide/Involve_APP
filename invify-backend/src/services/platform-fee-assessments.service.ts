import { supabaseAdmin } from '../db/supabase';
import { parseMcNotes } from './platform-fee-profiles.service';

const COMPONENT_LABEL: Record<string, string> = {
  PLATFORM: 'PLATFORM_FEE',
  PROCESSOR: 'PROCESSOR_FEE',
  SERVICE: 'SERVICE_FEE',
  AGENT_FEE: 'AGENT_FEE',
};

export type AssessmentListFilters = {
  transactionType?: string;
  mode?: string;
  kind?: string;
  sourceSystem?: string;
  sourceIdempotencyKey?: string;
  reference?: string;
  from?: string;
  to?: string;
  limit?: number;
  agentId?: string;
  tenantId?: string;
};

function num(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function componentLabel(component: string): string {
  return COMPONENT_LABEL[component] || component;
}

function mapAssessment(row: any) {
  const calculated = num(row.calculated_fee_kobo);
  const finalFee = num(row.final_fee_kobo);
  const minApplied = num(row.min_applied_kobo);
  const capApplied = num(row.cap_applied_kobo);
  const platform = num(row.platform_amount_kobo);
  const processor = num(row.processor_amount_kobo);
  const service = num(row.service_amount_kobo);
  const agent = num(row.agent_amount_kobo);
  const totalDistributed = platform + processor + service + agent;
  return {
    id: String(row.id),
    tenant_id: row.tenant_id ? String(row.tenant_id) : null,
    agent_id: row.agent_id ? String(row.agent_id) : null,
    fee_profile_id: row.fee_profile_id ? String(row.fee_profile_id) : null,
    resolved_source: row.resolved_source || null,
    transaction_type: row.transaction_type,
    mode: row.mode,
    kind: row.kind,
    source_system: row.source_system,
    source_idempotency_key: row.source_idempotency_key,
    source_id: row.source_idempotency_key,
    event_time: row.created_at,
    created_at: row.created_at,
    transaction_amount_kobo: num(row.principal_amount_kobo),
    calculated_fee_kobo: calculated,
    min_applied_kobo: minApplied,
    cap_applied_kobo: capApplied,
    min_fee_kobo: num(row.min_fee_kobo),
    max_fee_kobo: num(row.max_fee_kobo),
    final_fee_kobo: finalFee,
    profile_version_id: row.profile_version_id ? String(row.profile_version_id) : null,
    override_version_id: row.override_version_id ? String(row.override_version_id) : null,
    method: row.method,
    calculation_snapshot: {
      method: row.method,
      percentage_bps: num(row.percentage_bps),
      flat_amount_kobo: num(row.flat_amount_kobo),
      min_fee_kobo: num(row.min_fee_kobo),
      max_fee_kobo: num(row.max_fee_kobo),
      calculated_fee_kobo: calculated,
      min_applied_kobo: minApplied,
      cap_applied_kobo: capApplied,
      final_fee_kobo: finalFee,
    },
    config_snapshot: {
      profile_version_id: row.profile_version_id || null,
      override_version_id: row.override_version_id || null,
      platform_share_bps: num(row.platform_share_bps),
      processor_share_bps: num(row.processor_share_bps),
      service_share_bps: num(row.service_share_bps),
      agent_share_bps: num(row.agent_share_bps),
    },
    distribution_totals: {
      PLATFORM_FEE: platform,
      PROCESSOR_FEE: processor,
      SERVICE_FEE: service,
      AGENT_FEE: agent,
      total_distributed_kobo: totalDistributed,
      matches_final_fee: totalDistributed === finalFee,
    },
  };
}

function bpsPct(bps: number): string {
  return `${(num(bps) / 100).toFixed(2)}%`;
}

function formulaText(row: ReturnType<typeof mapAssessment>): string {
  const calc = row.calculation_snapshot;
  const method = String(calc.method || '').toUpperCase();
  let charge = method;
  if (method === 'PERCENTAGE') charge = `${bpsPct(calc.percentage_bps)} of principal`;
  else if (method === 'FLAT') charge = `${calc.flat_amount_kobo} kobo flat`;
  else if (method === 'HYBRID') charge = `${calc.flat_amount_kobo} kobo + ${bpsPct(calc.percentage_bps)} of principal`;
  const min = calc.min_fee_kobo > 0 ? `; min ${calc.min_fee_kobo} kobo` : '';
  const cap = calc.max_fee_kobo > 0 ? `; cap ${calc.max_fee_kobo} kobo` : '';
  const split = `split PLATFORM ${bpsPct(row.config_snapshot.platform_share_bps)} / PROCESSOR ${bpsPct(row.config_snapshot.processor_share_bps)} / SERVICE ${bpsPct(row.config_snapshot.service_share_bps)} / AGENT ${bpsPct(row.config_snapshot.agent_share_bps)}`;
  return `${charge}${min}${cap}; ${split}`;
}

function actorLabel(actor: { id?: string | null; email?: string | null; name?: string | null } | null): string | null {
  if (!actor) return null;
  const name = String(actor.name || '').trim();
  const email = String(actor.email || '').trim();
  if (name && email) return `${name} (${email})`;
  return name || email || (actor.id ? String(actor.id) : null);
}

function mapLine(row: any, assessment: ReturnType<typeof mapAssessment>) {
  const bpsByComponent: Record<string, number> = {
    PLATFORM: assessment.config_snapshot.platform_share_bps,
    PROCESSOR: assessment.config_snapshot.processor_share_bps,
    SERVICE: assessment.config_snapshot.service_share_bps,
    AGENT_FEE: assessment.config_snapshot.agent_share_bps,
  };
  return {
    id: row.id ? String(row.id) : null,
    component: row.component,
    component_label: componentLabel(String(row.component || '')),
    amount_kobo: num(row.amount_kobo),
    percent_bps: bpsByComponent[String(row.component)] || 0,
    ledger_entry_id: row.ledger_entry_id ? String(row.ledger_entry_id) : null,
  };
}

export class PlatformFeeAssessmentsService {
  constructor(private readonly db: Pick<typeof supabaseAdmin, 'from'> = supabaseAdmin) {}

  private async lookupUser(id: string | null | undefined) {
    const uid = String(id || '').trim();
    if (!uid) return null;
    const { data } = await this.db.from('users').select('id, email, name').eq('id', uid).maybeSingle();
    if (!data) return { id: uid, email: null, name: null };
    return {
      id: String(data.id || uid),
      email: data.email ? String(data.email) : null,
      name: data.name ? String(data.name) : null,
    };
  }

  private async lookupTenant(tenantId: string | null) {
    if (!tenantId) return { id: null, name: null };
    const { data } = await this.db.from('tenants').select('id, name').eq('id', tenantId).maybeSingle();
    return {
      id: tenantId,
      name: data?.name ? String(data.name) : tenantId,
    };
  }

  private async loadFormulaGovernance(assessment: ReturnType<typeof mapAssessment>) {
    const overrideId = assessment.override_version_id;
    const versionId = assessment.profile_version_id;
    const table = overrideId ? 'fee_profile_override_versions' : 'fee_profile_versions';
    const id = overrideId || versionId;
    if (!id) {
      return {
        source: null,
        version_id: null,
        version_number: null,
        status: null,
        formula_modified_at: null,
        formula_modified_by: null,
        formula_modified_by_label: null,
        formula_approved_at: null,
        formula_approved_by: null,
        formula_approved_by_label: null,
        recorded: false,
        missing_reason: 'Assessment has no profile version id. Formula shown is the immutable snapshot only.',
      };
    }

    const { data: version } = await this.db.from(table).select('*').eq('id', id).maybeSingle();
    if (!version) {
      return {
        source: overrideId ? 'override_version' : 'profile_version',
        version_id: id,
        version_number: null,
        status: null,
        formula_modified_at: null,
        formula_modified_by: null,
        formula_modified_by_label: null,
        formula_approved_at: null,
        formula_approved_by: null,
        formula_approved_by_label: null,
        recorded: false,
        missing_reason: 'Fee version row was not found. Snapshot still shows the formula used at assessment time.',
      };
    }

    const parsed = parseMcNotes(version.notes);
    const makerId = parsed.published?.makerId || parsed.proposal?.makerId || null;
    const checkerId = parsed.published?.checkerId || version.published_by || null;
    const makerFromNotes = parsed.published
      ? { id: parsed.published.makerId, email: parsed.published.makerEmail, name: null }
      : parsed.proposal
        ? { id: parsed.proposal.makerId, email: parsed.proposal.makerEmail, name: null }
        : null;
    const checkerFromNotes = parsed.published
      ? { id: parsed.published.checkerId, email: parsed.published.checkerEmail, name: null }
      : null;
    const maker = makerFromNotes || (makerId ? await this.lookupUser(makerId) : null);
    const checker = checkerFromNotes || (checkerId ? await this.lookupUser(String(checkerId)) : null);
    const modifiedLabel = actorLabel(maker);
    const approvedLabel = actorLabel(checker);
    const recorded = Boolean(modifiedLabel && approvedLabel);
    return {
      source: overrideId ? 'override_version' : 'profile_version',
      version_id: String(version.id),
      version_number: version.version_number != null ? Number(version.version_number) : null,
      status: version.status || null,
      formula_modified_at:
        parsed.published?.proposedAt || parsed.proposal?.proposedAt || version.updated_at || version.created_at || null,
      formula_modified_by: maker,
      formula_modified_by_label: modifiedLabel,
      formula_approved_at: parsed.published?.approvedAt || version.published_at || null,
      formula_approved_by: checker,
      formula_approved_by_label: approvedLabel,
      recorded,
      missing_reason: recorded
        ? null
        : 'Maker/checker were not stored on this version (service-role publish or pre-governance row). Snapshot still shows the formula used.',
    };
  }

  async list(filters: AssessmentListFilters = {}) {
    let query = this.db
      .from('fee_assessments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(Number(filters.limit) || 100, 1), 500));

    if (filters.transactionType) query = query.eq('transaction_type', filters.transactionType);
    if (filters.mode) query = query.eq('mode', filters.mode);
    if (filters.kind) query = query.eq('kind', filters.kind);
    if (filters.sourceSystem) query = query.eq('source_system', filters.sourceSystem);
    if (filters.sourceIdempotencyKey) query = query.eq('source_idempotency_key', filters.sourceIdempotencyKey);
    if (filters.reference) query = query.ilike('source_idempotency_key', `%${filters.reference}%`);
    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);
    if (filters.agentId) query = query.eq('agent_id', filters.agentId);
    if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);

    const { data, error } = await query;
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    return (data || []).map(mapAssessment);
  }

  async get(id: string) {
    const { data: row, error } = await this.db.from('fee_assessments').select('*').eq('id', id).maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    if (!row) throw Object.assign(new Error('Assessment not found'), { status: 404 });

    const assessment = mapAssessment(row);
    const { data: lineRows, error: lineErr } = await this.db
      .from('fee_assessment_lines')
      .select('*')
      .eq('assessment_id', id);
    if (lineErr) throw Object.assign(new Error(lineErr.message), { status: 500 });

    const lines = (lineRows || []).map((line) => mapLine(line, assessment));
    const lineTotal = lines.reduce((sum, line) => sum + line.amount_kobo, 0);
    const ledgerIds = lines.map((line) => line.ledger_entry_id).filter(Boolean);
    const tenant = await this.lookupTenant(assessment.tenant_id);
    const formula_governance = await this.loadFormulaGovernance(assessment);
    return {
      ...assessment,
      tenant,
      tenant_name: tenant.name,
      fee_assessed_kobo: assessment.final_fee_kobo,
      fee_collected: false,
      split_formula: {
        text: formulaText(assessment),
        method: assessment.method,
        percentage_bps: assessment.calculation_snapshot.percentage_bps,
        flat_amount_kobo: assessment.calculation_snapshot.flat_amount_kobo,
        min_fee_kobo: assessment.calculation_snapshot.min_fee_kobo,
        max_fee_kobo: assessment.calculation_snapshot.max_fee_kobo,
        platform_share_bps: assessment.config_snapshot.platform_share_bps,
        processor_share_bps: assessment.config_snapshot.processor_share_bps,
        service_share_bps: assessment.config_snapshot.service_share_bps,
        agent_share_bps: assessment.config_snapshot.agent_share_bps,
        platform_share_pct: bpsPct(assessment.config_snapshot.platform_share_bps),
        processor_share_pct: bpsPct(assessment.config_snapshot.processor_share_bps),
        service_share_pct: bpsPct(assessment.config_snapshot.service_share_bps),
        agent_share_pct: bpsPct(assessment.config_snapshot.agent_share_bps),
      },
      formula_governance,
      ledger_entry_id: ledgerIds[0] || null,
      lines,
      distribution: {
        PLATFORM_FEE: assessment.distribution_totals.PLATFORM_FEE,
        PROCESSOR_FEE: assessment.distribution_totals.PROCESSOR_FEE,
        SERVICE_FEE: assessment.distribution_totals.SERVICE_FEE,
        AGENT_FEE: assessment.distribution_totals.AGENT_FEE,
        total_distributed_kobo: lineTotal || assessment.distribution_totals.total_distributed_kobo,
        matches_final_fee:
          (lineTotal || assessment.distribution_totals.total_distributed_kobo) === assessment.final_fee_kobo,
      },
    };
  }

  async reconciliation(filters: AssessmentListFilters = {}) {
    const rows = await this.list({ ...filters, limit: 500 });
    const details = [];
    for (const row of rows) {
      try {
        details.push(await this.get(row.id));
      } catch {
        details.push({
          ...row,
          lines: [],
          ledger_entry_id: null,
          distribution: { ...row.distribution_totals, matches_final_fee: false },
        });
      }
    }

    const invalid = details.filter((row) => !row.distribution?.matches_final_fee);
    const missingLines = details.filter((row) => !row.lines || row.lines.length === 0);
    return {
      assessment_count: details.length,
      total_transaction_amount_kobo: details.reduce((s, r) => s + num(r.transaction_amount_kobo), 0),
      total_calculated_fee_kobo: details.reduce((s, r) => s + num(r.calculated_fee_kobo), 0),
      total_final_fee_kobo: details.reduce((s, r) => s + num(r.final_fee_kobo), 0),
      component_totals: {
        PLATFORM_FEE: details.reduce((s, r) => s + num(r.distribution_totals?.PLATFORM_FEE), 0),
        PROCESSOR_FEE: details.reduce((s, r) => s + num(r.distribution_totals?.PROCESSOR_FEE), 0),
        SERVICE_FEE: details.reduce((s, r) => s + num(r.distribution_totals?.SERVICE_FEE), 0),
        AGENT_FEE: details.reduce((s, r) => s + num(r.distribution_totals?.AGENT_FEE), 0),
      },
      errors: {
        invalid_distribution_count: invalid.length,
        missing_line_count: missingLines.length,
        invalid_assessment_ids: invalid.map((r) => r.id),
        missing_line_assessment_ids: missingLines.map((r) => r.id),
      },
      legacy_comparison: {
        read_only: true,
        note: 'Legacy tenant_fee_profiles / fee_transactions comparison is informational only and is not mutated here.',
      },
    };
  }
}

export const platformFeeAssessmentsService = new PlatformFeeAssessmentsService();

import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../db/supabase';
import { GovAuditService } from './gov-audit.service';
import {
  ActorContext,
  AssessmentLineRow,
  AssessmentRow,
  DistributionFilters,
  FeeDistributionError,
  FeeDistributionStore,
  FeePayableRecord,
  FeeSettlementRecord,
  FeeStakeholderRecord,
  FeeWithdrawalRecord,
  approveSettlement,
  approveWithdrawal,
  asKobo,
  cancelWithdrawal,
  completeSettlement,
  createStakeholder,
  emptyDistributionStore,
  failSettlement,
  markSettlementProcessing,
  materializeAllPayables,
  natureLabel,
  rejectWithdrawal,
  requestWithdrawal,
  stakeholderBalances,
  summarizeDistribution,
  updateStakeholder,
} from '../modules/fee-orchestration/FeeDistributionEngine';

function uuidOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function money(kobo: number) {
  const amount = asKobo(kobo);
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const naira = Math.trunc(abs / 100);
  const rem = abs % 100;
  return {
    amount_kobo: amount,
    display: `${sign}₦${naira}.${String(rem).padStart(2, '0')}`,
  };
}

function num(value: unknown): number {
  const n = Number(value || 0);
  return Number.isInteger(n) ? n : Math.trunc(n);
}

function mapStakeholder(row: any): FeeStakeholderRecord {
  return {
    id: String(row.id),
    stakeholder_type: row.stakeholder_type,
    display_name: row.display_name,
    status: row.status,
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPayable(row: any): FeePayableRecord {
  return {
    id: String(row.id),
    stakeholder_id: String(row.stakeholder_id),
    assessment_id: String(row.assessment_id),
    assessment_line_id: String(row.assessment_line_id),
    component: String(row.component),
    amount_kobo: num(row.amount_kobo),
    status: row.status,
    created_at: row.created_at,
    available_at: row.available_at || null,
    settled_at: row.settled_at || null,
    settlement_id: row.settlement_id ? String(row.settlement_id) : null,
  };
}

function mapWithdrawal(row: any): FeeWithdrawalRecord {
  return {
    id: String(row.id),
    stakeholder_id: String(row.stakeholder_id),
    amount_kobo: num(row.amount_kobo),
    status: row.status,
    client_request_id: String(row.client_request_id),
    available_balance_kobo_at_request: num(row.available_balance_kobo_at_request),
    settlement_id: row.settlement_id ? String(row.settlement_id) : null,
    requested_by: row.requested_by ? String(row.requested_by) : null,
    approved_by: row.approved_by ? String(row.approved_by) : null,
    created_at: row.created_at,
    approved_at: row.approved_at || null,
    completed_at: row.completed_at || null,
    failure_reason: row.failure_reason || null,
    metadata: row.metadata || {},
  };
}

function mapSettlement(row: any): FeeSettlementRecord {
  return {
    id: String(row.id),
    stakeholder_id: String(row.stakeholder_id),
    amount_kobo: num(row.amount_kobo),
    status: row.status,
    settlement_reference: row.settlement_reference || null,
    created_at: row.created_at,
    approved_at: row.approved_at || null,
    processed_at: row.processed_at || null,
    completed_at: row.completed_at || null,
    failure_reason: row.failure_reason || null,
    metadata: row.metadata || {},
  };
}

function mapAssessment(row: any): AssessmentRow {
  return {
    id: String(row.id),
    tenant_id: row.tenant_id ? String(row.tenant_id) : null,
    agent_id: row.agent_id ? String(row.agent_id) : null,
    transaction_type: row.transaction_type,
    mode: row.mode,
    kind: row.kind,
    created_at: row.created_at,
    calculated_fee_kobo: num(row.calculated_fee_kobo),
    final_fee_kobo: num(row.final_fee_kobo),
    platform_amount_kobo: num(row.platform_amount_kobo),
    processor_amount_kobo: num(row.processor_amount_kobo),
    service_amount_kobo: num(row.service_amount_kobo),
    agent_amount_kobo: num(row.agent_amount_kobo),
  };
}

function mapLine(row: any): AssessmentLineRow {
  return {
    id: String(row.id),
    assessment_id: String(row.assessment_id),
    component: String(row.component),
    amount_kobo: num(row.amount_kobo),
  };
}

async function audit(action: string, actor: ActorContext, target: string, metadata: Record<string, unknown>) {
  await GovAuditService.logAction({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    module: 'FINANCIAL',
    action,
    user_email: actor.email || 'system',
    user_name: actor.email || 'system',
    ip_address: '127.0.0.1',
    target,
    status: 'success',
    metadata: {
      control_plane_only: true,
      payout_execution_enabled: false,
      ...metadata,
    },
  });
}

export class PlatformFeeDistributionService {
  constructor(private readonly db: Pick<typeof supabaseAdmin, 'from'> = supabaseAdmin) {}

  private async loadStore(filters: DistributionFilters = {}): Promise<FeeDistributionStore> {
    const store = emptyDistributionStore();
    let assessmentQuery = this.db.from('fee_assessments').select('*').order('created_at', { ascending: false }).limit(1000);
    if (filters.transactionType) assessmentQuery = assessmentQuery.eq('transaction_type', filters.transactionType);
    if (filters.agentId) assessmentQuery = assessmentQuery.eq('agent_id', filters.agentId);
    if (filters.from) assessmentQuery = assessmentQuery.gte('created_at', filters.from);
    if (filters.to) assessmentQuery = assessmentQuery.lte('created_at', filters.to);
    const { data: assessments, error: aErr } = await assessmentQuery;
    if (aErr) throw Object.assign(new Error(aErr.message), { status: 500 });
    store.assessments = (assessments || []).map(mapAssessment);

    const { data: lines, error: lErr } = await this.db.from('fee_assessment_lines').select('*');
    if (lErr) throw Object.assign(new Error(lErr.message), { status: 500 });
    store.lines = (lines || []).map(mapLine);

    const { data: stakeholders, error: sErr } = await this.db.from('fee_stakeholders').select('*').order('created_at', { ascending: true });
    if (sErr) throw Object.assign(new Error(sErr.message), { status: 500 });
    store.stakeholders = (stakeholders || []).map(mapStakeholder);

    const { data: payables, error: pErr } = await this.db.from('fee_stakeholder_payables').select('*');
    if (pErr) throw Object.assign(new Error(pErr.message), { status: 500 });
    store.payables = (payables || []).map(mapPayable);

    const { data: withdrawals, error: wErr } = await this.db.from('fee_withdrawal_requests').select('*').order('created_at', { ascending: false });
    if (wErr) throw Object.assign(new Error(wErr.message), { status: 500 });
    store.withdrawals = (withdrawals || []).map(mapWithdrawal);

    const { data: settlements, error: stErr } = await this.db.from('fee_settlements').select('*').order('created_at', { ascending: false });
    if (stErr) throw Object.assign(new Error(stErr.message), { status: 500 });
    store.settlements = (settlements || []).map(mapSettlement);

    const { data: events } = await this.db.from('fee_distribution_events').select('*').order('created_at', { ascending: false }).limit(500);
    store.events = (events || []).map((row: any) => ({
      id: String(row.id),
      event_type: row.event_type,
      stakeholder_id: row.stakeholder_id,
      withdrawal_id: row.withdrawal_id,
      settlement_id: row.settlement_id,
      actor_id: row.actor_id,
      actor_email: row.actor_email,
      payload: row.payload || {},
      created_at: row.created_at,
    }));

    const { data: maps, error: mapErr } = await this.db.from('agent_fee_stakeholders').select('agent_id, stakeholder_id, agent_code');
    if (mapErr) {
      store.agentFeeStakeholders = [];
      store.tenantAgents = [];
      return store;
    }
    store.agentFeeStakeholders = (maps || []).map((row: any) => ({
      agent_id: String(row.agent_id),
      stakeholder_id: String(row.stakeholder_id),
      agent_code: String(row.agent_code || ''),
    }));

    const { data: tenantRows } = await this.db
      .from('tenants')
      .select('id, agent_code');
    const { data: agentTenantRows } = await this.db
      .from('agent_tenants')
      .select('tenant_id, agent_id');
    const idToAgent = new Map(store.agentFeeStakeholders.map((m) => [m.agent_id, m]));
    const codeToAgent = new Map(store.agentFeeStakeholders.map((m) => [m.agent_code, m]));
    const byTenant = new Map<string, { tenant_id: string; agent_id: string; agent_code: string }>();
    for (const row of agentTenantRows || []) {
      const link = idToAgent.get(String(row.agent_id));
      if (!link) continue;
      byTenant.set(String(row.tenant_id), { tenant_id: String(row.tenant_id), agent_id: link.agent_id, agent_code: link.agent_code });
    }
    for (const t of tenantRows || []) {
      if (t.agent_code && codeToAgent.has(String(t.agent_code)) && !byTenant.has(String(t.id))) {
        const link = codeToAgent.get(String(t.agent_code))!;
        byTenant.set(String(t.id), { tenant_id: String(t.id), agent_id: link.agent_id, agent_code: link.agent_code });
      }
    }
    store.tenantAgents = Array.from(byTenant.values());

    return store;
  }

  private async persistNewStakeholders(beforeIds: Set<string>, store: FeeDistributionStore) {
    const fresh = store.stakeholders.filter((s) => !beforeIds.has(s.id));
    for (const row of fresh) {
      const { error } = await this.db.from('fee_stakeholders').insert({
        id: row.id,
        stakeholder_type: row.stakeholder_type,
        display_name: row.display_name,
        status: row.status,
        metadata: row.metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
        throw Object.assign(new Error(error.message), { status: 500 });
      }
      const agentId = row.metadata?.agent_id ? String(row.metadata.agent_id) : '';
      if (agentId && row.stakeholder_type === 'AGENT' && row.metadata?.system !== true) {
        await this.db.from('agent_fee_stakeholders').upsert({
          agent_id: agentId,
          stakeholder_id: row.id,
          agent_code: String(row.metadata?.agent_code || ''),
          updated_at: row.updated_at,
        }, { onConflict: 'agent_id' });
      }
    }
  }

  private async persistNewPayables(beforeIds: Set<string>, store: FeeDistributionStore) {
    const fresh = store.payables.filter((p) => !beforeIds.has(p.id));
    for (const payable of fresh) {
      const { error } = await this.db.from('fee_stakeholder_payables').insert({
        id: payable.id,
        stakeholder_id: payable.stakeholder_id,
        assessment_id: payable.assessment_id,
        assessment_line_id: payable.assessment_line_id,
        component: payable.component,
        amount_kobo: payable.amount_kobo,
        status: payable.status,
        created_at: payable.created_at,
        available_at: payable.available_at,
        settled_at: payable.settled_at,
        settlement_id: payable.settlement_id,
        agent_id: payable.agent_id || null,
      });
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
        throw Object.assign(new Error(error.message), { status: 500 });
      }
      if (payable.component === 'AGENT_FEE') {
        try {
          const { enqueueCommissionEvent } = await import('../modules/agent-portal/services/agent-webhook.service');
          const assessment = store.assessments.find((a) => a.id === payable.assessment_id);
          const attributedAgentId = payable.agent_id || assessment?.agent_id || store.tenantAgents.find((t) => t.tenant_id === assessment?.tenant_id)?.agent_id;
          const tenantLink = store.tenantAgents.find((t) => t.agent_id === attributedAgentId) || store.tenantAgents.find((t) => t.tenant_id === assessment?.tenant_id);
          const map = store.agentFeeStakeholders.find((m) => m.agent_id === attributedAgentId);
          if (attributedAgentId && map) {
            await enqueueCommissionEvent({
              agentId: attributedAgentId,
              agentCode: map.agent_code,
              type: 'commission.assessed',
              tenantId: assessment?.tenant_id,
              assessmentId: payable.assessment_id,
              payload: {
                assessed_kobo: payable.amount_kobo,
                agent_share_kobo: payable.amount_kobo,
                available_kobo: 0,
                transaction_type: assessment?.transaction_type,
                fee_amount_kobo: assessment?.final_fee_kobo,
              },
            });
            const pendingType = payable.status === 'AVAILABLE' ? 'commission.available' : 'commission.pending';
            if (pendingType !== 'commission.available') {
              await enqueueCommissionEvent({
                agentId: attributedAgentId,
                agentCode: map.agent_code,
                type: 'commission.pending',
                tenantId: assessment?.tenant_id,
                assessmentId: payable.assessment_id,
                payload: {
                  assessed_kobo: payable.amount_kobo,
                  agent_share_kobo: payable.amount_kobo,
                  available_kobo: 0,
                  transaction_type: assessment?.transaction_type,
                  fee_amount_kobo: assessment?.final_fee_kobo,
                },
              });
            }
          }
        } catch {
          /* webhook outbox must never fail payable persistence */
        }
      }
    }
  }

  private async persistEvent(store: FeeDistributionStore, previousCount: number) {
    const extra = store.events.slice(previousCount);
    for (const event of extra) {
      await this.db.from('fee_distribution_events').insert({
        id: event.id,
        event_type: event.event_type,
        stakeholder_id: event.stakeholder_id,
        withdrawal_id: event.withdrawal_id,
        settlement_id: event.settlement_id,
        actor_id: event.actor_id,
        actor_email: event.actor_email,
        payload: event.payload,
        created_at: event.created_at,
      });
    }
  }

  async distribution(filters: DistributionFilters = {}) {
    const store = await this.loadStore(filters);
    const beforeStakeholders = new Set(store.stakeholders.map((s) => s.id));
    const before = new Set(store.payables.map((p) => p.id));
    materializeAllPayables(store);
    await this.persistNewStakeholders(beforeStakeholders, store);
    await this.persistNewPayables(before, store);
    const summary = summarizeDistribution(store, filters);
    return {
      ...summary,
      agent_id: filters.agentId || null,
      total_fee_calculated: money(summary.total_fee_calculated_kobo),
      total_final_customer_fee: money(summary.total_final_customer_fee_kobo),
      components: {
        PLATFORM: { ...summary.components.PLATFORM, ...money(summary.components.PLATFORM.allocation_kobo) },
        PROCESSOR: { ...summary.components.PROCESSOR, ...money(summary.components.PROCESSOR.allocation_kobo) },
        SERVICE: { ...summary.components.SERVICE, ...money(summary.components.SERVICE.allocation_kobo) },
        AGENT: { ...summary.components.AGENT, ...money(summary.components.AGENT.allocation_kobo) },
      },
      stakeholders: summary.stakeholders.map((row) => ({
        ...row,
        allocation: money(row.allocation_kobo),
        earned: money(row.earned_kobo),
        pending: money(row.pending_kobo),
        available: money(row.available_kobo),
        settled: money(row.settled_kobo),
      })),
      recent_activity: store.payables
        .slice()
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 25)
        .map((p) => ({
          ...p,
          amount: money(p.amount_kobo),
        })),
    };
  }

  async agentCommission(agentIdRaw: string) {
    const agentId = String(agentIdRaw || '').trim();
    if (!agentId) throw Object.assign(new Error('agentId is required'), { status: 400 });
    const { data: agent, error } = await this.db.from('agents').select('id, agent_code').eq('id', agentId).maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    if (!agent) throw Object.assign(new Error('Agent not found'), { status: 404 });
    const store = await this.loadStore({ agentId });
    materializeAllPayables(store);
    const assessments = store.assessments.filter((a) => String(a.agent_id || '') === agentId);
    const map = store.agentFeeStakeholders.find((m) => m.agent_id === agentId);
    const payables = map
      ? store.payables.filter((p) => p.component === 'AGENT_FEE' && (p.agent_id === agentId || p.stakeholder_id === map.stakeholder_id))
      : [];
    const assessed = assessments.reduce((s, a) => s + num(a.agent_amount_kobo), 0);
    return {
      agent_id: agentId,
      agent_code: agent.agent_code,
      assessed_kobo: assessed,
      pending_kobo: payables.filter((p) => p.status === 'PENDING').reduce((s, p) => s + p.amount_kobo, 0),
      available_kobo: 0,
      mode: 'SHADOW',
      payout_execution_enabled: false,
      assessments: assessments.slice(0, 100).map((a) => ({
        id: a.id,
        tenant_id: a.tenant_id,
        agent_id: a.agent_id,
        transaction_type: a.transaction_type,
        final_fee_kobo: a.final_fee_kobo,
        agent_share_kobo: a.agent_amount_kobo,
        mode: a.mode,
        status: 'PENDING',
        created_at: a.created_at,
      })),
    };
  }

  async listStakeholders(agentIdRaw?: string) {
    const agentId = String(agentIdRaw || '').trim();
    const store = await this.loadStore(agentId ? { agentId } : {});
    materializeAllPayables(store);
    return store.stakeholders
      .filter((row) => {
        if (!agentId) return true;
        const metaAgent = row.metadata?.agent_id ? String(row.metadata.agent_id) : '';
        if (row.stakeholder_type === 'AGENT' && row.metadata?.system === true) return false;
        if (row.stakeholder_type === 'AGENT') return metaAgent === agentId;
        return true;
      })
      .map((row) => {
      const balances = stakeholderBalances(store, row.id);
      return {
        ...row,
        agent_id: row.metadata?.agent_id || null,
        label: natureLabel(row.stakeholder_type),
        ...balances,
        earned: money(balances.earned_kobo),
        pending: money(balances.pending_kobo),
        available: money(balances.available_kobo),
        settled: money(balances.settled_kobo),
      };
    });
  }

  async getStakeholder(id: string) {
    const store = await this.loadStore();
    materializeAllPayables(store);
    const row = store.stakeholders.find((s) => s.id === id);
    if (!row) throw Object.assign(new Error('Stakeholder not found'), { status: 404 });
    const balances = stakeholderBalances(store, row.id);
    const payables = store.payables.filter((p) => p.stakeholder_id === id);
    const assessmentById = new Map(store.assessments.map((a) => [a.id, a]));
    const tenantIds = Array.from(
      new Set(
        payables
          .map((p) => assessmentById.get(p.assessment_id)?.tenant_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const tenantNameById = new Map<string, string>();
    if (tenantIds.length) {
      const { data: tenants, error: tErr } = await this.db.from('tenants').select('id, name').in('id', tenantIds);
      if (!tErr) {
        for (const tenant of tenants || []) {
          tenantNameById.set(String(tenant.id), String(tenant.name || '').trim() || String(tenant.id));
        }
      }
    }
    return {
      ...row,
      label: natureLabel(row.stakeholder_type),
      ...balances,
      earned: money(balances.earned_kobo),
      pending: money(balances.pending_kobo),
      available: money(balances.available_kobo),
      settled: money(balances.settled_kobo),
      history: payables.map((p) => {
        const assessment = assessmentById.get(p.assessment_id);
        const tenantId = assessment?.tenant_id || null;
        return {
          ...p,
          transaction_type: assessment?.transaction_type || null,
          tenant_id: tenantId,
          tenant_name: tenantId ? tenantNameById.get(tenantId) || tenantId : null,
          final_fee_kobo: assessment ? assessment.final_fee_kobo : null,
          amount: money(p.amount_kobo),
          settlement_id: p.settlement_id,
        };
      }),
    };
  }

  async listPayables(stakeholderId: string) {
    const detail = await this.getStakeholder(stakeholderId);
    return detail.history;
  }

  async listSettlements(stakeholderId: string) {
    const store = await this.loadStore();
    return store.settlements
      .filter((s) => s.stakeholder_id === stakeholderId)
      .map((s) => ({ ...s, amount: money(s.amount_kobo), payout_executed: false }));
  }

  async createStakeholder(input: any, actor: ActorContext) {
    const store = await this.loadStore();
    const previous = store.events.length;
    const row = createStakeholder(store, input, actor);
    const { error } = await this.db.from('fee_stakeholders').insert({
      id: row.id,
      stakeholder_type: row.stakeholder_type,
      display_name: row.display_name,
      status: row.status,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    await this.persistEvent(store, previous);
    await audit('STAKEHOLDER_CREATED', actor, row.id, { stakeholder_type: row.stakeholder_type });
    return row;
  }

  async updateStakeholder(id: string, patch: any, actor: ActorContext) {
    const store = await this.loadStore();
    const previous = store.events.length;
    const row = updateStakeholder(store, id, patch, actor);
    const { error } = await this.db.from('fee_stakeholders').update({
      display_name: row.display_name,
      status: row.status,
      metadata: row.metadata,
      updated_at: row.updated_at,
    }).eq('id', id);
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    await this.persistEvent(store, previous);
    await audit(patch.status === 'SUSPENDED' ? 'STAKEHOLDER_SUSPENDED' : 'STAKEHOLDER_UPDATED', actor, id, {
      status: row.status,
    });
    return row;
  }

  async listWithdrawals() {
    const store = await this.loadStore();
    const names = new Map(store.stakeholders.map((s) => [s.id, s.display_name]));
    return store.withdrawals.map((w) => ({
      ...w,
      stakeholder_name: names.get(w.stakeholder_id) || w.stakeholder_id,
      amount: money(w.amount_kobo),
      available_at_request: money(w.available_balance_kobo_at_request),
      payout_executed: false,
    }));
  }

  async getWithdrawal(id: string) {
    const store = await this.loadStore();
    const w = store.withdrawals.find((row) => row.id === id);
    if (!w) throw Object.assign(new Error('Withdrawal not found'), { status: 404 });
    const stakeholder = store.stakeholders.find((s) => s.id === w.stakeholder_id);
    const events = store.events.filter((e) => e.withdrawal_id === id);
    return {
      ...w,
      stakeholder,
      amount: money(w.amount_kobo),
      available_at_request: money(w.available_balance_kobo_at_request),
      payout_executed: false,
      control_plane_only: true,
      audit_trail: events,
    };
  }

  async createWithdrawal(input: any, actor: ActorContext) {
    const store = await this.loadStore();
    const beforeStakeholders = new Set(store.stakeholders.map((s) => s.id));
    materializeAllPayables(store);
    await this.persistNewStakeholders(beforeStakeholders, store);
    const previous = store.events.length;
    const stakeholderId = String(input.stakeholder_id || input.stakeholderId || '');
    const amountKobo = input.amount_kobo ?? input.amountKobo;
    const clientRequestId = String(input.client_request_id || input.clientRequestId || '');
    try {
      const { data: reserved, error: rpcErr } = await supabaseAdmin.rpc('fee_reserve_withdrawal', {
        p_stakeholder_id: stakeholderId,
        p_amount_kobo: Number(amountKobo),
        p_client_request_id: clientRequestId,
        p_requested_by: uuidOrNull(actor.id || null),
      });
      if (!rpcErr && reserved) {
        await audit('WITHDRAWAL_REQUESTED', actor, String(reserved.withdrawal_id), {
          amount_kobo: Number(amountKobo),
          reservation: 'fee_reserve_withdrawal',
        });
        return {
          id: reserved.withdrawal_id,
          stakeholder_id: stakeholderId,
          amount_kobo: Number(amountKobo),
          status: reserved.status,
          client_request_id: clientRequestId,
          replayed: Boolean(reserved.replayed),
          payout_executed: false,
        };
      }
      const rpcMsg = String(rpcErr?.message || '');
      if (rpcMsg.includes('INSUFFICIENT_AVAILABLE')) {
        throw new FeeDistributionError('Cannot withdraw more than available balance', 'INSUFFICIENT_AVAILABLE');
      }
      if (rpcMsg.includes('STAKEHOLDER_NOT_ACTIVE')) {
        throw new FeeDistributionError('Suspended or inactive stakeholders cannot request withdrawal', 'STAKEHOLDER_NOT_ACTIVE');
      }
      const result = requestWithdrawal(
        store,
        {
          stakeholderId,
          amountKobo,
          clientRequestId,
        },
        actor,
      );
      if (!result.replayed) {
        const w = result.withdrawal;
        const { error } = await this.db.from('fee_withdrawal_requests').insert({
          id: w.id,
          stakeholder_id: w.stakeholder_id,
          amount_kobo: w.amount_kobo,
          status: w.status,
          client_request_id: w.client_request_id,
          available_balance_kobo_at_request: w.available_balance_kobo_at_request,
          settlement_id: w.settlement_id,
          requested_by: uuidOrNull(w.requested_by),
          metadata: w.metadata,
          created_at: w.created_at,
        });
        if (error) throw Object.assign(new Error(error.message), { status: 500 });
        await this.persistEvent(store, previous);
        await audit('WITHDRAWAL_REQUESTED', actor, w.id, { amount_kobo: w.amount_kobo });
      }
      return { ...result.withdrawal, replayed: result.replayed, payout_executed: false };
    } catch (err: any) {
      if (err instanceof FeeDistributionError) {
        throw Object.assign(new Error(err.message), { status: err.status, code: err.code });
      }
      throw err;
    }
  }

  async approveWithdrawal(id: string, actor: ActorContext) {
    const store = await this.loadStore();
    const previous = store.events.length;
    const knownSettlements = new Set(store.settlements.map((s) => s.id));
    try {
      const result = approveWithdrawal(store, id, actor);
      if (!knownSettlements.has(result.settlement.id)) {
        await this.db.from('fee_settlements').insert({
          id: result.settlement.id,
          stakeholder_id: result.settlement.stakeholder_id,
          amount_kobo: result.settlement.amount_kobo,
          status: result.settlement.status,
          settlement_reference: result.settlement.settlement_reference,
          metadata: result.settlement.metadata,
          created_at: result.settlement.created_at,
        });
      }
      await this.db.from('fee_withdrawal_requests').update({
        status: result.withdrawal.status,
        approved_at: result.withdrawal.approved_at,
        approved_by: result.withdrawal.approved_by,
        settlement_id: result.withdrawal.settlement_id,
      }).eq('id', id);
      await this.persistEvent(store, previous);
      await audit('WITHDRAWAL_APPROVED', actor, id, { settlement_id: result.settlement.id });
      await audit('SETTLEMENT_CREATED', actor, result.settlement.id, { withdrawal_id: id });
      return { ...result, payout_executed: false };
    } catch (err: any) {
      if (err instanceof FeeDistributionError) {
        throw Object.assign(new Error(err.message), { status: err.status, code: err.code });
      }
      throw err;
    }
  }

  async rejectWithdrawal(id: string, reason: string, actor: ActorContext) {
    const store = await this.loadStore();
    const previous = store.events.length;
    try {
      const row = rejectWithdrawal(store, id, reason, actor);
      await this.db.from('fee_withdrawal_requests').update({
        status: row.status,
        failure_reason: row.failure_reason,
      }).eq('id', id);
      await this.persistEvent(store, previous);
      await audit('WITHDRAWAL_REJECTED', actor, id, { reason });
      return row;
    } catch (err: any) {
      if (err instanceof FeeDistributionError) {
        throw Object.assign(new Error(err.message), { status: err.status, code: err.code });
      }
      throw err;
    }
  }

  async cancelWithdrawal(id: string, actor: ActorContext) {
    const store = await this.loadStore();
    const previous = store.events.length;
    const row = cancelWithdrawal(store, id, actor);
    await this.db.from('fee_withdrawal_requests').update({ status: row.status }).eq('id', id);
    await this.persistEvent(store, previous);
    await audit('WITHDRAWAL_CANCELLED', actor, id, {});
    return row;
  }

  async approveSettlement(id: string, actor: ActorContext) {
    const store = await this.loadStore();
    const previous = store.events.length;
    const row = approveSettlement(store, id, actor);
    await this.db.from('fee_settlements').update({ status: row.status, approved_at: row.approved_at }).eq('id', id);
    await this.persistEvent(store, previous);
    await audit('SETTLEMENT_APPROVED', actor, id, {});
    return { ...row, payout_executed: false };
  }

  async markSettlementProcessing(id: string, actor: ActorContext) {
    const store = await this.loadStore();
    const previous = store.events.length;
    const row = markSettlementProcessing(store, id, actor);
    await this.db.from('fee_settlements').update({ status: row.status, processed_at: row.processed_at }).eq('id', id);
    await this.persistEvent(store, previous);
    await audit('SETTLEMENT_PROCESSING', actor, id, { control_plane_only: true });
    return { ...row, payout_executed: false };
  }

  completeSettlement() {
    return completeSettlement();
  }

  async failSettlement(id: string, reason: string, actor: ActorContext) {
    const store = await this.loadStore();
    const previous = store.events.length;
    const row = failSettlement(store, id, reason, actor);
    await this.db.from('fee_settlements').update({ status: row.status, failure_reason: row.failure_reason }).eq('id', id);
    await this.persistEvent(store, previous);
    await audit('SETTLEMENT_FAILED', actor, id, { reason });
    return row;
  }
}

export const platformFeeDistributionService = new PlatformFeeDistributionService();

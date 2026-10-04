import { randomUUID } from 'crypto';
import type { FeeTransactionType } from './types';

export const FEE_DISTRIBUTION_CONTROL_PLANE = 'CONTROL_PLANE_ONLY' as const;
export const SYSTEM_STAKEHOLDER_TYPES = ['PLATFORM', 'PROCESSOR', 'SERVICE', 'AGENT'] as const;

export type FeeStakeholderType = (typeof SYSTEM_STAKEHOLDER_TYPES)[number];
export type FeeStakeholderStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type FeePayableStatus = 'PENDING' | 'AVAILABLE' | 'SETTLED' | 'REVERSED';
export type FeeSettlementStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';
export type FeeWithdrawalStatus = FeeSettlementStatus;

export type FeeLineComponent = 'PLATFORM' | 'PROCESSOR' | 'SERVICE' | 'AGENT_FEE';

const OPEN_WITHDRAWAL: FeeWithdrawalStatus[] = ['REQUESTED', 'APPROVED', 'PROCESSING'];

export class FeeDistributionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'FeeDistributionError';
  }
}

export function asKobo(value: unknown): number {
  const n = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new FeeDistributionError('Amount must be an integer kobo value', 'INVALID_KOBO');
  }
  return n;
}

export function componentToStakeholderType(component: string): FeeStakeholderType {
  if (component === 'AGENT_FEE' || component === 'AGENT') return 'AGENT';
  if (component === 'PLATFORM' || component === 'PLATFORM_FEE') return 'PLATFORM';
  if (component === 'PROCESSOR' || component === 'PROCESSOR_FEE') return 'PROCESSOR';
  if (component === 'SERVICE' || component === 'SERVICE_FEE') return 'SERVICE';
  throw new FeeDistributionError(`Unknown fee component ${component}`, 'UNKNOWN_COMPONENT');
}

export function natureLabel(type: FeeStakeholderType): string {
  if (type === 'PROCESSOR') return 'Processor Payable';
  if (type === 'PLATFORM') return 'Platform Assessed Share';
  if (type === 'SERVICE') return 'Service Assessed Share';
  return 'Agent Assessed Share';
}

export interface FeeStakeholderRecord {
  id: string;
  stakeholder_type: FeeStakeholderType;
  display_name: string;
  status: FeeStakeholderStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FeePayableRecord {
  id: string;
  stakeholder_id: string;
  assessment_id: string;
  assessment_line_id: string;
  component: string;
  amount_kobo: number;
  status: FeePayableStatus;
  created_at: string;
  available_at: string | null;
  settled_at: string | null;
  settlement_id: string | null;
  agent_id?: string | null;
}

export interface FeeWithdrawalRecord {
  id: string;
  stakeholder_id: string;
  amount_kobo: number;
  status: FeeWithdrawalStatus;
  client_request_id: string;
  available_balance_kobo_at_request: number;
  settlement_id: string | null;
  requested_by: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
}

export interface FeeSettlementRecord {
  id: string;
  stakeholder_id: string;
  amount_kobo: number;
  status: FeeSettlementStatus;
  settlement_reference: string | null;
  created_at: string;
  approved_at: string | null;
  processed_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
}

export interface FeeDistributionEvent {
  id: string;
  event_type: string;
  stakeholder_id: string | null;
  withdrawal_id: string | null;
  settlement_id: string | null;
  actor_id: string | null;
  actor_email: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AssessmentRow {
  id: string;
  tenant_id: string | null;
  agent_id?: string | null;
  transaction_type: FeeTransactionType | string;
  mode: string;
  kind: string;
  created_at: string;
  calculated_fee_kobo: number;
  final_fee_kobo: number;
  platform_amount_kobo: number;
  processor_amount_kobo: number;
  service_amount_kobo: number;
  agent_amount_kobo: number;
}

export interface AssessmentLineRow {
  id: string;
  assessment_id: string;
  component: string;
  amount_kobo: number;
}

export interface DistributionFilters {
  from?: string;
  to?: string;
  transactionType?: string;
  agentId?: string;
}

export interface ActorContext {
  id?: string | null;
  email?: string | null;
}

export interface AgentFeeStakeholderLink {
  agent_id: string;
  stakeholder_id: string;
  agent_code: string;
  agent_status?: string;
}

export interface TenantAgentLink {
  tenant_id: string;
  agent_id: string;
  agent_code: string;
}

export interface FeeDistributionStore {
  stakeholders: FeeStakeholderRecord[];
  payables: FeePayableRecord[];
  withdrawals: FeeWithdrawalRecord[];
  settlements: FeeSettlementRecord[];
  events: FeeDistributionEvent[];
  assessments: AssessmentRow[];
  lines: AssessmentLineRow[];
  tenantAgents: TenantAgentLink[];
  agentFeeStakeholders: AgentFeeStakeholderLink[];
  unattributedAgentFeeLineIds: string[];
}

export function emptyDistributionStore(): FeeDistributionStore {
  return {
    stakeholders: [],
    payables: [],
    withdrawals: [],
    settlements: [],
    events: [],
    assessments: [],
    lines: [],
    tenantAgents: [],
    agentFeeStakeholders: [],
    unattributedAgentFeeLineIds: [],
  };
}

export function systemStakeholder(store: FeeDistributionStore, type: FeeStakeholderType): FeeStakeholderRecord | undefined {
  return store.stakeholders.find((s) => s.stakeholder_type === type && s.metadata?.system === true)
    || store.stakeholders.find((s) => s.stakeholder_type === type);
}

export function isSystemAgentStakeholder(row: FeeStakeholderRecord | undefined): boolean {
  return Boolean(row && row.stakeholder_type === 'AGENT' && row.metadata?.system === true);
}

export function ensureIndividualAgentStakeholder(
  store: FeeDistributionStore,
  agent: { agent_id: string; agent_code: string; display_name?: string; status?: string },
): FeeStakeholderRecord {
  const existingLink = store.agentFeeStakeholders.find((l) => l.agent_id === agent.agent_id);
  if (existingLink) {
    const row = store.stakeholders.find((s) => s.id === existingLink.stakeholder_id);
    if (row) return row;
  }
  const row = createStakeholder(store, {
    stakeholder_type: 'AGENT',
    display_name: agent.display_name || `Agent ${agent.agent_code}`,
    metadata: {
      system: false,
      agent_id: agent.agent_id,
      agent_code: agent.agent_code,
      nature: 'INDIVIDUAL_AGENT_PAYABLE',
    },
  });
  store.agentFeeStakeholders.push({
    agent_id: agent.agent_id,
    stakeholder_id: row.id,
    agent_code: agent.agent_code,
    agent_status: agent.status || 'ACTIVE',
  });
  return row;
}

export function resolveAgentFeeStakeholder(
  store: FeeDistributionStore,
  assessment: AssessmentRow,
  line: AssessmentLineRow,
): { stakeholder: FeeStakeholderRecord; attributed: boolean } {
  const type = componentToStakeholderType(line.component);
  if (type !== 'AGENT') {
    const stakeholder = systemStakeholder(store, type);
    if (!stakeholder) throw new FeeDistributionError(`No stakeholder for ${type}`, 'STAKEHOLDER_MISSING');
    return { stakeholder, attributed: true };
  }
  const tenantId = assessment.tenant_id ? String(assessment.tenant_id) : '';
  const snapshotAgentId = assessment.agent_id ? String(assessment.agent_id) : '';
  if (snapshotAgentId) {
    const mapped = store.agentFeeStakeholders.find((l) => l.agent_id === snapshotAgentId);
    const fromTenant = store.tenantAgents.find((t) => t.agent_id === snapshotAgentId);
    const agent = mapped
      ? { agent_id: mapped.agent_id, agent_code: mapped.agent_code }
      : fromTenant
        ? { agent_id: fromTenant.agent_id, agent_code: fromTenant.agent_code }
        : { agent_id: snapshotAgentId, agent_code: snapshotAgentId };
    return {
      stakeholder: ensureIndividualAgentStakeholder(store, agent),
      attributed: true,
    };
  }
  const tenantLink = tenantId ? store.tenantAgents.find((t) => t.tenant_id === tenantId) : undefined;
  if (tenantLink) {
    return {
      stakeholder: ensureIndividualAgentStakeholder(store, tenantLink),
      attributed: true,
    };
  }
  const fallback = systemStakeholder(store, 'AGENT');
  if (!fallback) throw new FeeDistributionError('No stakeholder for AGENT', 'STAKEHOLDER_MISSING');
  if (!store.unattributedAgentFeeLineIds.includes(line.id)) {
    store.unattributedAgentFeeLineIds.push(line.id);
  }
  return { stakeholder: fallback, attributed: false };
}

export function seedSystemStakeholders(now = new Date().toISOString()): FeeStakeholderRecord[] {
  return [
    {
      id: '11111111-1111-4111-8111-111111111111',
      stakeholder_type: 'PLATFORM',
      display_name: 'Invify Platform',
      status: 'ACTIVE',
      metadata: { system: true, nature: 'PLATFORM_REVENUE' },
      created_at: now,
      updated_at: now,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      stakeholder_type: 'PROCESSOR',
      display_name: 'Processor Payable',
      status: 'ACTIVE',
      metadata: { system: true, nature: 'PROCESSOR_PAYABLE' },
      created_at: now,
      updated_at: now,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      stakeholder_type: 'SERVICE',
      display_name: 'Service Provider',
      status: 'ACTIVE',
      metadata: { system: true, nature: 'SERVICE_COST' },
      created_at: now,
      updated_at: now,
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      stakeholder_type: 'AGENT',
      display_name: 'Agent / Partner',
      status: 'ACTIVE',
      metadata: { system: true, nature: 'AGENT_PAYABLE' },
      created_at: now,
      updated_at: now,
    },
  ];
}

function inRange(iso: string, filters: DistributionFilters): boolean {
  if (filters.from && iso < filters.from) return false;
  if (filters.to && iso > filters.to) return false;
  return true;
}

function pushEvent(
  store: FeeDistributionStore,
  eventType: string,
  extra: Partial<FeeDistributionEvent>,
): void {
  store.events.push({
    id: randomUUID(),
    event_type: eventType,
    stakeholder_id: extra.stakeholder_id || null,
    withdrawal_id: extra.withdrawal_id || null,
    settlement_id: extra.settlement_id || null,
    actor_id: extra.actor_id || null,
    actor_email: extra.actor_email || null,
    payload: extra.payload || {},
    created_at: extra.created_at || new Date().toISOString(),
  });
}

export function filterAssessments(store: FeeDistributionStore, filters: DistributionFilters): AssessmentRow[] {
  return store.assessments.filter((row) => {
    if (filters.transactionType && row.transaction_type !== filters.transactionType) return false;
    if (filters.agentId && String(row.agent_id || '') !== String(filters.agentId)) return false;
    return inRange(row.created_at, filters);
  });
}

export function payableStatusForAssessmentMode(mode: string): FeePayableStatus {
  return mode === 'LIVE' ? 'AVAILABLE' : 'PENDING';
}

export function materializePayables(store: FeeDistributionStore, assessment: AssessmentRow): FeePayableRecord[] {
  const created: FeePayableRecord[] = [];
  const lines = store.lines.filter((line) => line.assessment_id === assessment.id);
  const lineTotal = lines.reduce((sum, line) => sum + asKobo(line.amount_kobo), 0);
  if (lineTotal !== asKobo(assessment.final_fee_kobo)) {
    throw new FeeDistributionError(
      'Assessment lines must sum exactly to final_fee_kobo',
      'DISTRIBUTION_MISMATCH',
    );
  }
  const now = new Date().toISOString();
  const payableStatus = payableStatusForAssessmentMode(assessment.mode);
  for (const line of lines) {
    const existing = store.payables.find((p) => p.assessment_line_id === line.id);
    if (existing) continue;
    const { stakeholder, attributed } = resolveAgentFeeStakeholder(store, assessment, line);
    const payable: FeePayableRecord = {
      id: randomUUID(),
      stakeholder_id: stakeholder.id,
      assessment_id: assessment.id,
      assessment_line_id: line.id,
      component: line.component,
      amount_kobo: asKobo(line.amount_kobo),
      status: payableStatus,
      created_at: now,
      available_at: payableStatus === 'AVAILABLE' ? now : null,
      settled_at: null,
      settlement_id: null,
      agent_id: componentToStakeholderType(line.component) === 'AGENT' && attributed
        ? String(stakeholder.metadata?.agent_id || assessment.agent_id || '') || null
        : null,
    };
    store.payables.push(payable);
    created.push(payable);
    if (!attributed && componentToStakeholderType(line.component) === 'AGENT') {
      pushEvent(store, 'AGENT_FEE_UNATTRIBUTED', {
        stakeholder_id: stakeholder.id,
        payload: {
          assessment_id: assessment.id,
          assessment_line_id: line.id,
          tenant_id: assessment.tenant_id,
          reason: 'No immutable tenant-to-agent mapping; payable remains on global AGENT stakeholder',
        },
      });
    }
  }
  return created;
}

export function materializeAllPayables(store: FeeDistributionStore): number {
  let count = 0;
  for (const assessment of store.assessments) {
    count += materializePayables(store, assessment).length;
  }
  return count;
}

export function reservedKobo(store: FeeDistributionStore, stakeholderId: string): number {
  return store.withdrawals
    .filter((w) => w.stakeholder_id === stakeholderId && OPEN_WITHDRAWAL.includes(w.status))
    .reduce((sum, w) => sum + asKobo(w.amount_kobo), 0);
}

export function rawAvailableKobo(store: FeeDistributionStore, stakeholderId: string): number {
  return store.payables
    .filter((p) => p.stakeholder_id === stakeholderId && p.status === 'AVAILABLE')
    .reduce((sum, p) => sum + asKobo(p.amount_kobo), 0);
}

export function availableKobo(store: FeeDistributionStore, stakeholderId: string): number {
  const available = rawAvailableKobo(store, stakeholderId) - reservedKobo(store, stakeholderId);
  if (available < 0) {
    throw new FeeDistributionError('Available balance cannot be negative', 'NEGATIVE_AVAILABLE');
  }
  return available;
}

export function stakeholderBalances(store: FeeDistributionStore, stakeholderId: string) {
  const payables = store.payables.filter((p) => p.stakeholder_id === stakeholderId && p.status !== 'REVERSED');
  const earned = payables.reduce((sum, p) => sum + asKobo(p.amount_kobo), 0);
  const pending = payables.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + asKobo(p.amount_kobo), 0);
  const settled = payables.filter((p) => p.status === 'SETTLED').reduce((sum, p) => sum + asKobo(p.amount_kobo), 0);
  const available = availableKobo(store, stakeholderId);
  return {
    earned_kobo: earned,
    pending_kobo: pending,
    available_kobo: available,
    settled_kobo: settled,
    reservation_kobo: reservedKobo(store, stakeholderId),
    assessment_count: new Set(payables.map((p) => p.assessment_id)).size,
  };
}

export function summarizeDistribution(store: FeeDistributionStore, filters: DistributionFilters = {}) {
  const assessments = filterAssessments(store, filters);
  const ids = new Set(assessments.map((a) => a.id));
  let totalCalculated = 0;
  let totalFinal = 0;
  let platform = 0;
  let processor = 0;
  let service = 0;
  let agent = 0;
  const typeCounts = new Map<string, number>();
  for (const row of assessments) {
    const finalFee = asKobo(row.final_fee_kobo);
    const p = asKobo(row.platform_amount_kobo);
    const pr = asKobo(row.processor_amount_kobo);
    const s = asKobo(row.service_amount_kobo);
    const a = asKobo(row.agent_amount_kobo);
    if (p + pr + s + a !== finalFee) {
      throw new FeeDistributionError('Component allocations must equal final_fee_kobo', 'DISTRIBUTION_MISMATCH');
    }
    totalCalculated += asKobo(row.calculated_fee_kobo);
    totalFinal += finalFee;
    platform += p;
    processor += pr;
    service += s;
    agent += a;
    typeCounts.set(row.transaction_type, (typeCounts.get(row.transaction_type) || 0) + 1);
  }

  const modes = new Set(assessments.map((a) => a.mode));
  const feeMode = modes.size === 1 ? [...modes][0] : modes.has('LIVE') ? 'MIXED' : 'SHADOW';

  const byType = SYSTEM_STAKEHOLDER_TYPES.map((type) => {
    const stakeholder = systemStakeholder(store, type);
    const typePayables = store.payables.filter((p) => {
      const owner = store.stakeholders.find((s) => s.id === p.stakeholder_id);
      return owner?.stakeholder_type === type && p.status !== 'REVERSED';
    });
    const pending = typePayables.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + asKobo(p.amount_kobo), 0);
    const settled = typePayables.filter((p) => p.status === 'SETTLED').reduce((sum, p) => sum + asKobo(p.amount_kobo), 0);
    const earned = typePayables.reduce((sum, p) => sum + asKobo(p.amount_kobo), 0);
    const available = type === 'AGENT'
      ? store.stakeholders
          .filter((s) => s.stakeholder_type === 'AGENT')
          .reduce((sum, s) => sum + availableKobo(store, s.id), 0)
      : stakeholder
        ? availableKobo(store, stakeholder.id)
        : 0;
    const reservation = type === 'AGENT'
      ? store.stakeholders
          .filter((s) => s.stakeholder_type === 'AGENT')
          .reduce((sum, s) => sum + reservedKobo(store, s.id), 0)
      : stakeholder
        ? reservedKobo(store, stakeholder.id)
        : 0;
    const allocation =
      type === 'PLATFORM' ? platform : type === 'PROCESSOR' ? processor : type === 'SERVICE' ? service : agent;
    return {
      stakeholder_id: stakeholder?.id || null,
      stakeholder_type: type,
      display_name: stakeholder?.display_name || type,
      label: natureLabel(type),
      allocation_kobo: allocation,
      earned_kobo: type === 'AGENT' ? earned : allocation,
      pending_kobo: pending,
      available_kobo: available,
      settled_kobo: settled,
      reservation_kobo: reservation,
      assessment_count: assessments.length,
      individual_agent_count: type === 'AGENT' ? store.agentFeeStakeholders.length : 0,
    };
  });

  return {
    fee_mode: feeMode || 'SHADOW',
    control_plane_only: true,
    payout_execution_enabled: false,
    terminology: {
      note: 'SHADOW assessments are assessed, not collected. Processor allocation is a payable/cost, not platform revenue.',
      total_assessed: 'TOTAL ASSESSED',
      final_assessed_fees: 'FINAL ASSESSED FEES',
      platform: 'PLATFORM ASSESSED SHARE',
      processor: 'PROCESSOR ASSESSED PAYABLE',
      service: 'SERVICE ASSESSED SHARE',
      agent: 'AGENT ASSESSED SHARE',
    },
    total_assessments: assessments.length,
    total_fee_calculated_kobo: totalCalculated,
    total_final_customer_fee_kobo: totalFinal,
    total_distributed_kobo: platform + processor + service + agent,
    matches_final_fee: platform + processor + service + agent === totalFinal,
    components: {
      PLATFORM: { allocation_kobo: platform, label: natureLabel('PLATFORM') },
      PROCESSOR: { allocation_kobo: processor, label: natureLabel('PROCESSOR') },
      SERVICE: { allocation_kobo: service, label: natureLabel('SERVICE') },
      AGENT: { allocation_kobo: agent, label: natureLabel('AGENT') },
    },
    stakeholders: byType,
    transaction_types_with_activity: [...typeCounts.entries()].map(([transaction_type, count]) => ({
      transaction_type,
      count,
    })),
    filtered_assessment_ids: [...ids],
  };
}

export function createStakeholder(
  store: FeeDistributionStore,
  input: { stakeholder_type: FeeStakeholderType; display_name: string; metadata?: Record<string, unknown>; status?: FeeStakeholderStatus },
  actor: ActorContext = {},
): FeeStakeholderRecord {
  if (!SYSTEM_STAKEHOLDER_TYPES.includes(input.stakeholder_type)) {
    throw new FeeDistributionError('Invalid stakeholder type', 'INVALID_TYPE');
  }
  const name = String(input.display_name || '').trim();
  if (!name) throw new FeeDistributionError('display_name is required', 'INVALID_NAME');
  const now = new Date().toISOString();
  const row: FeeStakeholderRecord = {
    id: randomUUID(),
    stakeholder_type: input.stakeholder_type,
    display_name: name,
    status: input.status || 'ACTIVE',
    metadata: { ...(input.metadata || {}), system: false },
    created_at: now,
    updated_at: now,
  };
  store.stakeholders.push(row);
  pushEvent(store, 'STAKEHOLDER_CREATED', {
    stakeholder_id: row.id,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { display_name: row.display_name, stakeholder_type: row.stakeholder_type },
  });
  return row;
}

export function updateStakeholder(
  store: FeeDistributionStore,
  id: string,
  patch: { display_name?: string; status?: FeeStakeholderStatus; metadata?: Record<string, unknown> },
  actor: ActorContext = {},
): FeeStakeholderRecord {
  const row = store.stakeholders.find((s) => s.id === id);
  if (!row) throw new FeeDistributionError('Stakeholder not found', 'NOT_FOUND', 404);
  if (patch.display_name) row.display_name = String(patch.display_name).trim();
  if (patch.status) {
    row.status = patch.status;
    if (patch.status === 'SUSPENDED') {
      pushEvent(store, 'STAKEHOLDER_SUSPENDED', {
        stakeholder_id: row.id,
        actor_id: actor.id || null,
        actor_email: actor.email || null,
        payload: {},
      });
    }
  }
  if (patch.metadata) row.metadata = { ...row.metadata, ...patch.metadata, system: row.metadata.system === true };
  row.updated_at = new Date().toISOString();
  pushEvent(store, 'STAKEHOLDER_UPDATED', {
    stakeholder_id: row.id,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { status: row.status },
  });
  return row;
}

export function requestWithdrawal(
  store: FeeDistributionStore,
  input: {
    stakeholderId: string;
    amountKobo: unknown;
    clientRequestId: string;
    ownerAgentId?: string | null;
    afterAvailabilityCheck?: () => void;
  },
  actor: ActorContext = {},
): { withdrawal: FeeWithdrawalRecord; replayed: boolean } {
  const stakeholder = store.stakeholders.find((s) => s.id === input.stakeholderId);
  if (!stakeholder) throw new FeeDistributionError('Stakeholder not found', 'NOT_FOUND', 404);
  if (stakeholder.status !== 'ACTIVE') {
    throw new FeeDistributionError('Suspended or inactive stakeholders cannot request withdrawal', 'STAKEHOLDER_NOT_ACTIVE');
  }
  if (input.ownerAgentId) {
    const link = store.agentFeeStakeholders.find((l) => l.agent_id === input.ownerAgentId && l.stakeholder_id === stakeholder.id);
    if (!link || isSystemAgentStakeholder(stakeholder)) {
      throw new FeeDistributionError('Stakeholder does not belong to the authenticated agent', 'STAKEHOLDER_NOT_OWNED', 403);
    }
    if (link.agent_status && link.agent_status !== 'ACTIVE') {
      throw new FeeDistributionError('Agent is not ACTIVE', 'AGENT_NOT_ACTIVE');
    }
  }
  const clientRequestId = String(input.clientRequestId || '').trim();
  if (!clientRequestId) throw new FeeDistributionError('client_request_id is required', 'IDEMPOTENCY_REQUIRED');
  const existing = store.withdrawals.find(
    (w) => w.stakeholder_id === stakeholder.id && w.client_request_id === clientRequestId,
  );
  if (existing) return { withdrawal: existing, replayed: true };

  const amount = asKobo(input.amountKobo);
  if (amount <= 0) throw new FeeDistributionError('Withdrawal amount must be greater than zero', 'INVALID_AMOUNT');
  const firstAvailable = availableKobo(store, stakeholder.id);
  if (amount > firstAvailable) {
    throw new FeeDistributionError('Cannot withdraw more than available balance', 'INSUFFICIENT_AVAILABLE');
  }
  if (input.afterAvailabilityCheck) input.afterAvailabilityCheck();
  const available = availableKobo(store, stakeholder.id);
  if (amount > available) {
    throw new FeeDistributionError('Cannot withdraw more than available balance', 'INSUFFICIENT_AVAILABLE');
  }

  const now = new Date().toISOString();
  const withdrawal: FeeWithdrawalRecord = {
    id: randomUUID(),
    stakeholder_id: stakeholder.id,
    amount_kobo: amount,
    status: 'REQUESTED',
    client_request_id: clientRequestId,
    available_balance_kobo_at_request: available,
    settlement_id: null,
    requested_by: actor.id || null,
    approved_by: null,
    created_at: now,
    approved_at: null,
    completed_at: null,
    failure_reason: null,
    metadata: {
      control_plane_only: true,
      payout_execution_enabled: false,
      reservation: 'control_plane_hold_against_available_payables',
      reservation_limitation:
        'Hold is recorded on the withdrawal request. Customer wallets and fee ledger are not mutated in this phase.',
    },
  };
  store.withdrawals.push(withdrawal);
  pushEvent(store, 'WITHDRAWAL_REQUESTED', {
    stakeholder_id: stakeholder.id,
    withdrawal_id: withdrawal.id,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { amount_kobo: amount, available_kobo: available },
  });
  return { withdrawal, replayed: false };
}

function requireOpenWithdrawal(store: FeeDistributionStore, id: string): FeeWithdrawalRecord {
  const row = store.withdrawals.find((w) => w.id === id);
  if (!row) throw new FeeDistributionError('Withdrawal not found', 'NOT_FOUND', 404);
  return row;
}

export function approveWithdrawal(
  store: FeeDistributionStore,
  withdrawalId: string,
  actor: ActorContext = {},
): { withdrawal: FeeWithdrawalRecord; settlement: FeeSettlementRecord } {
  const withdrawal = requireOpenWithdrawal(store, withdrawalId);
  if (withdrawal.status === 'APPROVED' && withdrawal.settlement_id) {
    const existing = store.settlements.find((s) => s.id === withdrawal.settlement_id);
    if (existing) return { withdrawal, settlement: existing };
  }
  if (withdrawal.status !== 'REQUESTED') {
    throw new FeeDistributionError('Only REQUESTED withdrawals can be approved', 'INVALID_STATE');
  }
  const now = new Date().toISOString();
  const settlement: FeeSettlementRecord = {
    id: randomUUID(),
    stakeholder_id: withdrawal.stakeholder_id,
    amount_kobo: withdrawal.amount_kobo,
    status: 'REQUESTED',
    settlement_reference: `settlement:${randomUUID()}`,
    created_at: now,
    approved_at: null,
    processed_at: null,
    completed_at: null,
    failure_reason: null,
    metadata: {
      control_plane_only: true,
      payout_execution_enabled: false,
      withdrawal_id: withdrawal.id,
    },
  };
  store.settlements.push(settlement);
  withdrawal.status = 'APPROVED';
  withdrawal.approved_at = now;
  withdrawal.approved_by = actor.id || null;
  withdrawal.settlement_id = settlement.id;
  pushEvent(store, 'WITHDRAWAL_APPROVED', {
    stakeholder_id: withdrawal.stakeholder_id,
    withdrawal_id: withdrawal.id,
    settlement_id: settlement.id,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { amount_kobo: withdrawal.amount_kobo },
  });
  pushEvent(store, 'SETTLEMENT_CREATED', {
    stakeholder_id: withdrawal.stakeholder_id,
    withdrawal_id: withdrawal.id,
    settlement_id: settlement.id,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { amount_kobo: settlement.amount_kobo },
  });
  return { withdrawal, settlement };
}

export function rejectWithdrawal(
  store: FeeDistributionStore,
  withdrawalId: string,
  reason: string,
  actor: ActorContext = {},
): FeeWithdrawalRecord {
  const withdrawal = requireOpenWithdrawal(store, withdrawalId);
  if (withdrawal.status !== 'REQUESTED') {
    throw new FeeDistributionError('Only REQUESTED withdrawals can be rejected', 'INVALID_STATE');
  }
  withdrawal.status = 'REJECTED';
  withdrawal.failure_reason = reason || 'Rejected';
  pushEvent(store, 'WITHDRAWAL_REJECTED', {
    stakeholder_id: withdrawal.stakeholder_id,
    withdrawal_id: withdrawal.id,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { reason: withdrawal.failure_reason },
  });
  return withdrawal;
}

export function cancelWithdrawal(
  store: FeeDistributionStore,
  withdrawalId: string,
  actor: ActorContext = {},
): FeeWithdrawalRecord {
  const withdrawal = requireOpenWithdrawal(store, withdrawalId);
  if (!['REQUESTED', 'APPROVED'].includes(withdrawal.status)) {
    throw new FeeDistributionError('Withdrawal cannot be cancelled in its current state', 'INVALID_STATE');
  }
  withdrawal.status = 'CANCELLED';
  pushEvent(store, 'WITHDRAWAL_CANCELLED', {
    stakeholder_id: withdrawal.stakeholder_id,
    withdrawal_id: withdrawal.id,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: {},
  });
  return withdrawal;
}

export function approveSettlement(
  store: FeeDistributionStore,
  settlementId: string,
  actor: ActorContext = {},
): FeeSettlementRecord {
  const settlement = store.settlements.find((s) => s.id === settlementId);
  if (!settlement) throw new FeeDistributionError('Settlement not found', 'NOT_FOUND', 404);
  if (settlement.status !== 'REQUESTED') {
    throw new FeeDistributionError('Only REQUESTED settlements can be approved', 'INVALID_STATE');
  }
  settlement.status = 'APPROVED';
  settlement.approved_at = new Date().toISOString();
  pushEvent(store, 'SETTLEMENT_APPROVED', {
    stakeholder_id: settlement.stakeholder_id,
    settlement_id: settlement.id,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { amount_kobo: settlement.amount_kobo },
  });
  return settlement;
}

export function markSettlementProcessing(
  store: FeeDistributionStore,
  settlementId: string,
  actor: ActorContext = {},
): FeeSettlementRecord {
  const settlement = store.settlements.find((s) => s.id === settlementId);
  if (!settlement) throw new FeeDistributionError('Settlement not found', 'NOT_FOUND', 404);
  if (settlement.status === 'PROCESSING') return settlement;
  if (settlement.status !== 'APPROVED') {
    throw new FeeDistributionError('Settlement must be APPROVED before PROCESSING', 'INVALID_STATE');
  }
  settlement.status = 'PROCESSING';
  settlement.processed_at = new Date().toISOString();
  const withdrawal = store.withdrawals.find((w) => w.settlement_id === settlement.id);
  if (withdrawal) withdrawal.status = 'PROCESSING';
  pushEvent(store, 'SETTLEMENT_PROCESSING', {
    stakeholder_id: settlement.stakeholder_id,
    settlement_id: settlement.id,
    withdrawal_id: withdrawal?.id || null,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { control_plane_only: true },
  });
  return settlement;
}

export function completeSettlement(): never {
  throw new FeeDistributionError(
    'Real payout execution is disabled. Settlements cannot COMPLETE in CONTROL_PLANE_ONLY mode.',
    'PAYOUT_DISABLED',
    409,
  );
}

export function failSettlement(
  store: FeeDistributionStore,
  settlementId: string,
  reason: string,
  actor: ActorContext = {},
): FeeSettlementRecord {
  const settlement = store.settlements.find((s) => s.id === settlementId);
  if (!settlement) throw new FeeDistributionError('Settlement not found', 'NOT_FOUND', 404);
  if (settlement.status === 'FAILED') return settlement;
  if (!['REQUESTED', 'APPROVED', 'PROCESSING'].includes(settlement.status)) {
    throw new FeeDistributionError('Settlement cannot fail from its current state', 'INVALID_STATE');
  }
  settlement.status = 'FAILED';
  settlement.failure_reason = reason || 'Failed';
  const withdrawal = store.withdrawals.find((w) => w.settlement_id === settlement.id);
  if (withdrawal && OPEN_WITHDRAWAL.includes(withdrawal.status)) {
    withdrawal.status = 'FAILED';
    withdrawal.failure_reason = settlement.failure_reason;
  }
  pushEvent(store, 'SETTLEMENT_FAILED', {
    stakeholder_id: settlement.stakeholder_id,
    settlement_id: settlement.id,
    withdrawal_id: withdrawal?.id || null,
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    payload: { reason: settlement.failure_reason },
  });
  return settlement;
}


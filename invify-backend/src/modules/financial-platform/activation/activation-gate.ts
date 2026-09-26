import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../../db/supabase';

export type ManualCheckKey = 'cac' | 'phone_call' | 'address';

export type ManualCheck = {
  passed: boolean;
  by?: string;
  email?: string;
  at?: string;
  notes?: string;
};

export type ActivationProposal = {
  id: string;
  makerId: string;
  makerEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  checkerId?: string;
  checkerEmail?: string;
  decidedAt?: string;
  reason?: string;
};

export type ActivationGate = {
  checks: Record<ManualCheckKey, ManualCheck>;
  proposal: ActivationProposal | null;
};

const EMPTY_CHECK: ManualCheck = { passed: false };

export const MANUAL_CHECK_KEYS: ManualCheckKey[] = ['cac', 'phone_call', 'address'];

function parseSettings(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? { ...raw } : {};
}

function emptyGate(): ActivationGate {
  return {
    checks: {
      cac: { ...EMPTY_CHECK },
      phone_call: { ...EMPTY_CHECK },
      address: { ...EMPTY_CHECK },
    },
    proposal: null,
  };
}

function normalizeGate(raw: any): ActivationGate {
  const base = emptyGate();
  if (!raw || typeof raw !== 'object') return base;
  for (const key of MANUAL_CHECK_KEYS) {
    const row = raw.checks?.[key];
    if (row && typeof row === 'object') {
      base.checks[key] = {
        passed: row.passed === true,
        by: row.by,
        email: row.email,
        at: row.at,
        notes: row.notes,
      };
    }
  }
  if (raw.proposal && typeof raw.proposal === 'object') {
    base.proposal = raw.proposal;
  }
  return base;
}

export function allManualChecksPassed(gate: ActivationGate): boolean {
  return MANUAL_CHECK_KEYS.every((k) => gate.checks[k]?.passed === true);
}

export function missingManualChecks(gate: ActivationGate): string[] {
  const labels: Record<ManualCheckKey, string> = {
    cac: 'CAC document (manual review)',
    phone_call: 'Phone number confirmation by direct call',
    address: 'Address validation (manual)',
  };
  return MANUAL_CHECK_KEYS.filter((k) => !gate.checks[k]?.passed).map((k) => labels[k]);
}

export async function loadActivationGate(tenantId: string): Promise<{
  gate: ActivationGate;
  settings: Record<string, any>;
  tenant: any;
}> {
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, settings, kyc_status, phone, street_address, lga, state, country')
    .eq('id', tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!tenant) {
    const err: any = new Error('Tenant not found');
    err.status = 404;
    throw err;
  }
  const settings = parseSettings(tenant.settings);
  return { gate: normalizeGate(settings.fp_activation_gate), settings, tenant };
}

async function saveGate(tenantId: string, settings: Record<string, any>, gate: ActivationGate) {
  const { error } = await supabaseAdmin
    .from('tenants')
    .update({
      settings: { ...settings, fp_activation_gate: gate },
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId);
  if (error) throw error;
}

export async function evidenceForChecks(tenantId: string) {
  const { tenant } = await loadActivationGate(tenantId);
  const settings = parseSettings(tenant.settings);
  const owner = settings.owner_profile || {};
  const { data: docs } = await supabaseAdmin
    .from('tenant_kyc_documents')
    .select('id, document_type, document_url, status')
    .eq('tenant_id', tenantId)
    .limit(20);
  const cacUrl = String(settings.cac_document_url || '').trim();
  const idUrl = String(settings.id_document_url || '').trim();
  const hasCac =
    Boolean(cacUrl) ||
    (docs || []).some((d: any) => /cac/i.test(String(d.document_type || '')));
  const hasId =
    Boolean(idUrl) ||
    (docs || []).some((d: any) => /id|nin|passport|license/i.test(String(d.document_type || '')));
  const phone = String(tenant.phone || owner.phone || '').trim();
  const address = [
    tenant.street_address,
    owner.street,
    owner.address,
    tenant.lga,
    tenant.state,
    tenant.country,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(', ');
  return {
    hasCac,
    hasId,
    cacUrl: cacUrl || (docs || []).find((d: any) => /cac/i.test(String(d.document_type || '')))?.document_url || null,
    idUrl: idUrl || (docs || []).find((d: any) => /id|nin|passport|license/i.test(String(d.document_type || '')))?.document_url || null,
    phone: phone || null,
    address: address || null,
    kycStatus: tenant.kyc_status || null,
  };
}

export async function recordManualCheck(opts: {
  tenantId: string;
  key: ManualCheckKey;
  passed: boolean;
  actorId: string;
  actorEmail: string;
  notes?: string;
}): Promise<ActivationGate> {
  if (!MANUAL_CHECK_KEYS.includes(opts.key)) {
    const err: any = new Error('Unknown check. Use cac, phone_call, or address.');
    err.status = 400;
    throw err;
  }
  const { gate, settings, tenant } = await loadActivationGate(opts.tenantId);
  const evidence = await evidenceForChecks(opts.tenantId);
  if (opts.passed) {
    if (opts.key === 'cac' && !evidence.hasCac) {
      const err: any = new Error('Upload and review a CAC certificate before confirming this check.');
      err.status = 400;
      throw err;
    }
    if (opts.key === 'phone_call' && !evidence.phone) {
      const err: any = new Error('No tenant phone number on file. Add a phone, then confirm the direct call.');
      err.status = 400;
      throw err;
    }
    if (opts.key === 'address' && !evidence.address) {
      const err: any = new Error('No business address on file. Add an address, then confirm manual validation.');
      err.status = 400;
      throw err;
    }
  }
  gate.checks[opts.key] = {
    passed: opts.passed === true,
    by: opts.actorId,
    email: opts.actorEmail,
    at: new Date().toISOString(),
    notes: String(opts.notes || '').trim() || undefined,
  };
  if (gate.proposal?.status === 'pending') {
    gate.proposal = null;
  }
  await saveGate(opts.tenantId, settings, gate);
  void tenant;
  return gate;
}

export async function proposeActivation(opts: {
  tenantId: string;
  actorId: string;
  actorEmail: string;
}): Promise<ActivationGate> {
  const { gate, settings } = await loadActivationGate(opts.tenantId);
  const missing = missingManualChecks(gate);
  if (missing.length) {
    const err: any = new Error(
      `Manual checks incomplete: ${missing.join('; ')}. Confirm CAC, direct-call phone, and address before proposing activation.`,
    );
    err.status = 400;
    throw err;
  }
  gate.proposal = {
    id: randomUUID(),
    makerId: opts.actorId,
    makerEmail: opts.actorEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await saveGate(opts.tenantId, settings, gate);
  return gate;
}

export async function rejectActivationProposal(opts: {
  tenantId: string;
  actorId: string;
  actorEmail: string;
  reason?: string;
}): Promise<ActivationGate> {
  const { gate, settings } = await loadActivationGate(opts.tenantId);
  if (!gate.proposal || gate.proposal.status !== 'pending') {
    const err: any = new Error('No pending activation proposal to reject.');
    err.status = 400;
    throw err;
  }
  gate.proposal.status = 'rejected';
  gate.proposal.checkerId = opts.actorId;
  gate.proposal.checkerEmail = opts.actorEmail;
  gate.proposal.decidedAt = new Date().toISOString();
  gate.proposal.reason = opts.reason;
  await saveGate(opts.tenantId, settings, gate);
  return gate;
}

function assertCheckerReady(gate: ActivationGate, opts: { actorId: string; actorEmail: string }) {
  const missing = missingManualChecks(gate);
  if (missing.length) {
    const err: any = new Error(`Manual checks incomplete: ${missing.join('; ')}.`);
    err.status = 403;
    throw err;
  }
  if (!gate.proposal || gate.proposal.status !== 'pending') {
    const err: any = new Error(
      'Maker-checker required. A second operator must approve a pending Activate Platform proposal.',
    );
    err.status = 403;
    throw err;
  }
  const maker = String(gate.proposal.makerEmail || '').trim().toLowerCase();
  const checker = String(opts.actorEmail || '').trim().toLowerCase();
  const samePerson =
    (!!checker && maker === checker) ||
    (!!opts.actorId && !!gate.proposal.makerId && gate.proposal.makerId === opts.actorId);
  if (!checker || samePerson) {
    const err: any = new Error(
      'Maker cannot approve their own activation. Sign in as a different admin to checker-approve.',
    );
    err.status = 403;
    throw err;
  }
}

/** Throws 403/400 unless checks + pending proposal by a different maker. Does not persist. */
export async function assertCheckerCanActivate(opts: {
  tenantId: string;
  actorId: string;
  actorEmail: string;
}): Promise<ActivationGate> {
  const { gate } = await loadActivationGate(opts.tenantId);
  assertCheckerReady(gate, opts);
  return gate;
}

/** Marks a pending proposal approved after the activation saga succeeds. */
export async function markProposalApproved(opts: {
  tenantId: string;
  actorId: string;
  actorEmail: string;
}): Promise<ActivationGate> {
  const { gate, settings } = await loadActivationGate(opts.tenantId);
  assertCheckerReady(gate, opts);
  gate.proposal!.status = 'approved';
  gate.proposal!.checkerId = opts.actorId;
  gate.proposal!.checkerEmail = opts.actorEmail;
  gate.proposal!.decidedAt = new Date().toISOString();
  await saveGate(opts.tenantId, settings, gate);
  return gate;
}

/** Throws 403/400 unless checks + pending proposal by a different maker. Marks approved. */
export async function consumeApprovedActivation(opts: {
  tenantId: string;
  actorId: string;
  actorEmail: string;
}): Promise<ActivationGate> {
  return markProposalApproved(opts);
}

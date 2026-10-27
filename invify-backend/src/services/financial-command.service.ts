import { supabaseAdmin } from '../db/supabase';
import { toStableUuid } from '../utils/stable-uuid';
import { LedgerService } from './ledger.service';
import { ParentAllocationService } from './parent-allocation.service';
import {
  classifyCollectionConfirmation,
  isStableCommandId,
  providerCreditIdempotencyKey,
  type CollectionConfirmation,
} from './collection-confirmation';
import { parentDepositLedgerEntries } from './school-fund-ownership';
import { isSchoolParentWalletPayment } from './virtual-account-ownership';

export type FinanceAck = 'accepted' | 'rejected' | 'duplicate' | 'reconciliation-required';

const ENTITY = 'financial_command';

export type FinanceCommandResult = {
  ack: FinanceAck;
  reason?: string;
  commandId: string;
  confirmation?: CollectionConfirmation;
  ledgerStatus?: string;
  amountPaid?: number;
  newStatus?: string;
  newBalance?: number;
};

async function loadCommand(tenantId: string, commandId: string) {
  const syncId = toStableUuid(tenantId, ENTITY, commandId);
  const { data, error } = await supabaseAdmin
    .from('school_entities')
    .select('payload, tenant_id, sync_id')
    .eq('tenant_id', tenantId)
    .eq('entity_type', ENTITY)
    .eq('sync_id', syncId)
    .maybeSingle();
  if (error) {
    const err: any = new Error(`financial_command_store_unavailable: ${error.message}`);
    err.status = 503;
    throw err;
  }
  return { syncId, row: data };
}

async function patchCommand(
  tenantId: string,
  commandId: string,
  patch: Record<string, unknown>,
) {
  const { syncId, row } = await loadCommand(tenantId, commandId);
  if (!row) {
    const err: any = new Error('financial_command_missing');
    err.status = 409;
    throw err;
  }
  const next = { ...(row.payload || {}), ...patch, commandId, syncId };
  const { error } = await supabaseAdmin
    .from('school_entities')
    .update({ payload: next, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('entity_type', ENTITY)
    .eq('sync_id', syncId);
  if (error) {
    const err: any = new Error(`financial_command_store_unavailable: ${error.message}`);
    err.status = 503;
    throw err;
  }
  return next;
}

async function saveCommand(tenantId: string, commandId: string, payload: Record<string, unknown>) {
  const { syncId, row } = await loadCommand(tenantId, commandId);
  if (row) {
    return { duplicate: true as const, syncId, payload: row.payload || {} };
  }
  const { error } = await supabaseAdmin.from('school_entities').insert({
    tenant_id: tenantId,
    entity_type: ENTITY,
    sync_id: syncId,
    payload: { ...payload, commandId, syncId },
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (String(error.message || '').toLowerCase().includes('duplicate') || error.code === '23505') {
      return { duplicate: true as const, syncId, payload };
    }
    const err: any = new Error(`financial_command_store_unavailable: ${error.message}`);
    err.status = 503;
    throw err;
  }
  return { duplicate: false as const, syncId, payload };
}

function requireAmount(amount: unknown): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    const err: any = new Error('amount_required');
    err.status = 400;
    throw err;
  }
  return n;
}

export class FinancialCommandService {
  static async load(tenantId: string, commandId: string) {
    return loadCommand(tenantId, commandId);
  }

  static async mark(tenantId: string, commandId: string, patch: Record<string, unknown>) {
    return patchCommand(tenantId, commandId, patch);
  }

  static async listUnfinalized(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from('school_entities')
      .select('sync_id, payload, updated_at')
      .eq('tenant_id', tenantId)
      .eq('entity_type', ENTITY);
    if (error) {
      const err: any = new Error(`financial_command_store_unavailable: ${error.message}`);
      err.status = 503;
      throw err;
    }
    return (data || []).filter((row) => {
      const payload = row.payload || {};
      return payload.finalized !== true;
    });
  }

  static async claim(tenantId: string, commandId: string, payload: Record<string, unknown>) {
    if (!isStableCommandId(commandId)) {
      return { ack: 'rejected' as FinanceAck, reason: 'unstable_command_id', commandId };
    }
    const stored = await saveCommand(tenantId, commandId, payload);
    if (stored.duplicate) {
      return { ack: 'duplicate' as FinanceAck, commandId, reason: 'idempotent_replay' };
    }
    return { ack: 'accepted' as FinanceAck, commandId };
  }

  static async parentFund(params: {
    tenantId: string;
    commandId: string;
    amount: unknown;
    method: unknown;
    parentId?: string | null;
    providerReference?: string | null;
    confirmed?: boolean;
  }): Promise<FinanceCommandResult> {
    if (!isStableCommandId(params.commandId)) {
      return { ack: 'rejected', reason: 'unstable_command_id', commandId: String(params.commandId || '') };
    }
    const amount = requireAmount(params.amount);
    const confirmation = classifyCollectionConfirmation(params.method, {
      confirmed: params.confirmed,
      providerReference: params.providerReference,
    });
    const stored = await saveCommand(params.tenantId, params.commandId, {
      kind: 'parent_fund',
      amount,
      method: params.method,
      parentId: params.parentId || null,
      confirmation,
      providerReference: params.providerReference || null,
      finalized: false,
    });
    if (stored.duplicate) {
      const loaded = await loadCommand(params.tenantId, params.commandId);
      return this.resumeParentFund(
        params.tenantId,
        params.commandId,
        (loaded.row?.payload || stored.payload) as Record<string, unknown>,
      );
    }

    if (confirmation === 'unconfirmed') {
      await patchCommand(params.tenantId, params.commandId, { finalized: true, reason: 'pending_evidence' });
      return { ack: 'accepted', commandId: params.commandId, confirmation, reason: 'pending_evidence' };
    }

    if (confirmation === 'settled') {
      return this.settleParentFund(params.tenantId, params.commandId, amount, String(params.providerReference || '').trim());
    }

    await patchCommand(params.tenantId, params.commandId, { finalized: true, reason: 'recorded_unsettled' });
    return { ack: 'accepted', commandId: params.commandId, confirmation, reason: 'recorded_unsettled' };
  }

  static async resumeParentFund(
    tenantId: string,
    commandId: string,
    payload: Record<string, unknown>,
  ): Promise<FinanceCommandResult> {
    if (payload.finalized === true) {
      return {
        ack: 'duplicate',
        commandId,
        confirmation: payload.confirmation as CollectionConfirmation,
        reason: 'idempotent_replay',
      };
    }
    const confirmation = payload.confirmation as CollectionConfirmation;
    if (confirmation === 'settled') {
      return this.settleParentFund(
        tenantId,
        commandId,
        Number(payload.amount),
        String(payload.providerReference || ''),
      );
    }
    await patchCommand(tenantId, commandId, { finalized: true, recovered: true });
    return { ack: 'accepted', commandId, confirmation, reason: String(payload.reason || 'recovered') };
  }

  static async settleParentFund(
    tenantId: string,
    commandId: string,
    amount: number,
    ref: string,
  ): Promise<FinanceCommandResult> {
    if (!ref) {
      return { ack: 'rejected', commandId, reason: 'provider_reference_required', confirmation: 'settled' };
    }
    const key = providerCreditIdempotencyKey(ref);
    try {
      const posted = await LedgerService.createDoubleEntry({
        idempotencyKey: key,
        tenantId,
        reference: ref,
        entries: parentDepositLedgerEntries(amount),
        actorId: 'PARENT_FUND_COMMAND',
        provider: 'invify',
        metadata: { source: 'parent_fund_command', commandId, paidVia: 'parent_account', schoolWalletCredit: false },
      });
      await patchCommand(tenantId, commandId, { finalized: true, ledgerStatus: posted.status });
      return {
        ack: posted.status === 'DE-DUPLICATED' ? 'duplicate' : 'accepted',
        commandId,
        confirmation: 'settled',
        ledgerStatus: String(posted.status),
      };
    } catch (err: any) {
      return {
        ack: 'reconciliation-required',
        commandId,
        confirmation: 'settled',
        reason: err?.message || 'parent_fund_unsettled',
      };
    }
  }

  static async parentAllocate(params: {
    tenantId: string;
    commandId: string;
    amount: unknown;
    invoiceNumber?: string | null;
    reference?: string | null;
    paymentMethod?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<FinanceCommandResult> {
    if (!isStableCommandId(params.commandId)) {
      return { ack: 'rejected', reason: 'unstable_command_id', commandId: String(params.commandId || '') };
    }
    const amount = requireAmount(params.amount);
    const method = params.paymentMethod || 'Parent Credit';
    if (!isSchoolParentWalletPayment(method, params.payload || { businessMode: 'school' })) {
      return { ack: 'rejected', reason: 'not_parent_wallet', commandId: params.commandId };
    }
    const stored = await saveCommand(params.tenantId, params.commandId, {
      kind: 'parent_allocate',
      amount,
      invoiceNumber: params.invoiceNumber || null,
      reference: params.reference || null,
      paymentMethod: method,
      finalized: false,
    });
    if (stored.duplicate) {
      const payload = stored.payload as Record<string, unknown>;
      if (payload.finalized === true) {
        return { ack: 'duplicate', commandId: params.commandId, reason: 'idempotent_replay' };
      }
      return this.finishParentAllocate(params);
    }
    return this.finishParentAllocate(params);
  }

  static async finishParentAllocate(params: {
    tenantId: string;
    commandId: string;
    amount: unknown;
    invoiceNumber?: string | null;
    reference?: string | null;
    paymentMethod?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<FinanceCommandResult> {
    const amount = requireAmount(params.amount);
    try {
      const posted = await ParentAllocationService.creditSchoolOnce({
        tenantId: params.tenantId,
        invoiceNumber: params.invoiceNumber,
        reference: params.reference || params.commandId,
        paymentMethod: 'Parent Credit',
        amountNaira: amount,
        historicalBackfill: false,
      });
      if (posted.status === 'SKIPPED') {
        await patchCommand(params.tenantId, params.commandId, { finalized: true, rejected: true, reason: posted.reason });
        return { ack: 'rejected', reason: posted.reason, commandId: params.commandId };
      }
      await patchCommand(params.tenantId, params.commandId, { finalized: true, ledgerStatus: posted.status });
      if (posted.status === 'DE-DUPLICATED') {
        return { ack: 'duplicate', commandId: params.commandId, ledgerStatus: 'DE-DUPLICATED' };
      }
      return { ack: 'accepted', commandId: params.commandId, ledgerStatus: 'CREATED' };
    } catch (err: any) {
      return {
        ack: 'reconciliation-required',
        commandId: params.commandId,
        reason: err?.message || 'parent_allocate_unsettled',
      };
    }
  }
}

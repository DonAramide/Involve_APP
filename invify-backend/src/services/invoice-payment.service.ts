import { supabaseAdmin } from '../db/supabase';
import { LedgerService } from './ledger.service';
import { ParentAllocationService } from './parent-allocation.service';
import { FinancialCommandService, type FinanceAck } from './financial-command.service';
import {
  classifyCollectionConfirmation,
  isStableCommandId,
  providerCreditIdempotencyKey,
} from './collection-confirmation';
import { isSchoolParentWalletPayment } from './virtual-account-ownership';

export type InvoicePayResult = {
  ack: FinanceAck;
  success: boolean;
  reason?: string;
  newStatus: string;
  newBalance: number;
  amountPaid: number;
  confirmation?: string;
};

function payCommandId(payload: any): string {
  return String(payload?.idempotencyKey || payload?.commandId || '').trim();
}

function snapshotOf(inv: any) {
  const currentPaid = Number(inv.amount_paid || 0);
  const total = Number(inv.total_amount || 0);
  const currentBalance = Number.isFinite(Number(inv.balance_amount)) ? Number(inv.balance_amount) : total - currentPaid;
  return {
    newStatus: String(inv.payment_status || 'Unpaid'),
    newBalance: currentBalance,
    amountPaid: currentPaid,
  };
}

export class InvoicePaymentService {
  static async apply(tenantId: string, invoiceId: string, payload: any): Promise<InvoicePayResult> {
    const commandId = payCommandId(payload);
    if (!isStableCommandId(commandId)) {
      const err: any = new Error('idempotency_key_required');
      err.status = 400;
      throw err;
    }
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err: any = new Error('amount_required');
      err.status = 400;
      throw err;
    }

    const { data: inv, error } = await supabaseAdmin
      .from('invoices')
      .select('id, tenant_id, total_amount, amount_paid, balance_amount, payment_status, invoice_number, payment_method, student_id, business_mode')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) {
      const err: any = new Error(error.message);
      err.status = 500;
      throw err;
    }
    if (!inv) {
      const err: any = new Error('Invoice not found');
      err.status = 404;
      throw err;
    }

    const existing = await FinancialCommandService.load(tenantId, commandId);
    if (existing.row) {
      return this.finalize(tenantId, invoiceId, commandId, inv, payload, existing.row.payload || {});
    }

    const method = payload.paymentMethod || inv.payment_method;
    const confirmation = classifyCollectionConfirmation(method, {
      confirmed: payload.confirmed === true,
      providerReference: payload.providerReference || payload.reference,
    });
    const currentPaid = Number(inv.amount_paid || 0);
    const expectedPaid = confirmation === 'unconfirmed' ? currentPaid : currentPaid + amount;

    const claimed = await FinancialCommandService.claim(tenantId, commandId, {
      kind: 'invoice_pay',
      invoiceId,
      confirmation,
      amount,
      expectedPaid,
      method,
      providerReference: payload.providerReference || payload.reference || null,
      invoiceNumber: inv.invoice_number,
      finalized: false,
    });
    if (claimed.ack === 'duplicate') {
      const again = await FinancialCommandService.load(tenantId, commandId);
      return this.finalize(tenantId, invoiceId, commandId, inv, payload, again.row?.payload || {});
    }
    if (claimed.ack === 'rejected') {
      return { ack: 'rejected', success: false, reason: claimed.reason, confirmation, ...snapshotOf(inv) };
    }

    return this.finalize(tenantId, invoiceId, commandId, inv, payload, {
      confirmation,
      amount,
      expectedPaid,
      method,
      invoiceNumber: inv.invoice_number,
      providerReference: payload.providerReference || payload.reference || null,
      finalized: false,
    });
  }

  static async finalize(
    tenantId: string,
    invoiceId: string,
    commandId: string,
    inv: any,
    payload: any,
    command: Record<string, unknown>,
  ): Promise<InvoicePayResult> {
    const amount = Number(command.amount || payload.amount);
    const method = command.method || payload.paymentMethod || inv.payment_method;
    const confirmation = String(command.confirmation || classifyCollectionConfirmation(method, {
      confirmed: payload.confirmed === true,
      providerReference: payload.providerReference || payload.reference,
    }));
    const snap = snapshotOf(inv);

    if (confirmation === 'unconfirmed') {
      if (command.finalized !== true) {
        const pendingStatus = snap.amountPaid > 0 ? 'Partial' : 'Pending';
        await supabaseAdmin
          .from('invoices')
          .update({ payment_status: pendingStatus, updated_at: new Date().toISOString() })
          .eq('id', invoiceId)
          .eq('tenant_id', tenantId);
        await FinancialCommandService.mark(tenantId, commandId, { finalized: true, reason: 'pending_evidence' });
        return {
          ack: 'accepted',
          success: true,
          confirmation,
          reason: 'pending_evidence',
          newStatus: pendingStatus,
          newBalance: snap.newBalance,
          amountPaid: snap.amountPaid,
        };
      }
      return { ack: 'duplicate', success: true, reason: 'idempotent_replay', confirmation, ...snap };
    }

    const schoolPayload = {
      businessMode: inv.business_mode || payload.businessMode,
      studentId: inv.student_id || payload.studentId,
    };

    try {
      if (isSchoolParentWalletPayment(method, schoolPayload)) {
        const alloc = await ParentAllocationService.creditSchoolOnce({
          tenantId,
          invoiceNumber: String(command.invoiceNumber || inv.invoice_number || invoiceId),
          reference: String(payload.reference || commandId),
          paymentMethod: 'Parent Credit',
          amountNaira: amount,
          historicalBackfill: false,
          businessMode: schoolPayload.businessMode,
          studentId: schoolPayload.studentId,
        });
        if (alloc.status === 'SKIPPED') {
          await FinancialCommandService.mark(tenantId, commandId, { finalized: true, rejected: true, reason: alloc.reason });
          return { ack: 'rejected', success: false, reason: alloc.reason, confirmation, ...snap };
        }
        if (alloc.status === 'DE-DUPLICATED') {
          await FinancialCommandService.mark(tenantId, commandId, { finalized: true, ledgerStatus: 'DE-DUPLICATED' });
          return { ack: 'duplicate', success: true, reason: 'allocation_already_posted', confirmation, ...snap };
        }
      } else if (confirmation === 'settled') {
        const provider = String(command.providerReference || payload.providerReference || payload.reference || '').trim();
        const ledgerKey = provider ? providerCreditIdempotencyKey(provider) : `pay:${tenantId}:${commandId}`;
        await LedgerService.createDoubleEntry({
          idempotencyKey: ledgerKey,
          tenantId,
          reference: provider || `PAY-${invoiceId}`,
          entries: [
            { account: 'EXTERNAL_BANK', type: 'DEBIT', amount },
            { account: 'USER_WALLET', type: 'CREDIT', amount },
          ],
          metadata: { source: 'invoice_payment', invoiceId, paymentMethod: method, commandId },
        });
      }
    } catch (err: any) {
      return {
        ack: 'reconciliation-required',
        success: false,
        reason: err?.message || 'ledger_unsettled',
        confirmation,
        ...snap,
      };
    }

    const total = Number(inv.total_amount || 0);
    const expectedPaid = Number(command.expectedPaid);
    const targetPaid = Number.isFinite(expectedPaid) ? expectedPaid : snap.amountPaid + amount;
    if (snap.amountPaid + 0.0001 >= targetPaid) {
      await FinancialCommandService.mark(tenantId, commandId, { finalized: true });
      return { ack: command.finalized === true ? 'duplicate' : 'accepted', success: true, confirmation, ...snap };
    }

    const newAmountPaid = targetPaid;
    const newBalance = total - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';
    const { error: updErr } = await supabaseAdmin
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        balance_amount: newBalance,
        payment_status: newStatus,
        payment_method: method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId);
    if (updErr) {
      return {
        ack: 'reconciliation-required',
        success: false,
        reason: `Invoice payment update failed: ${updErr.message}`,
        confirmation,
        ...snap,
      };
    }

    await FinancialCommandService.mark(tenantId, commandId, { finalized: true, invoiceStatus: newStatus });
    return {
      ack: 'accepted',
      success: true,
      confirmation,
      newStatus,
      newBalance,
      amountPaid: newAmountPaid,
    };
  }
}

import { supabaseAdmin } from '../../db/supabase';
import {
  BillingAccount,
  BillingInstallment,
  BillingObligation,
  BillingPayment,
  MemoryTenantBillingStore,
} from './tenant-billing.service';
import { BillingInvariantError, InstallmentStatus } from './tenant-billing.engine';

function num(v: unknown): number {
  return Number(v || 0);
}

function uuidOrNull(v: unknown): string | null {
  const s = String(v || '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

function mapAccount(r: any): BillingAccount {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    currency: r.currency,
    status: r.status,
    unappliedCreditKobo: num(r.unapplied_credit_kobo),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapObligation(r: any): BillingObligation {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    billingAccountId: r.billing_account_id,
    type: r.type,
    description: r.description,
    currency: r.currency,
    grossAmountKobo: num(r.gross_amount_kobo),
    amountPaidKobo: num(r.amount_paid_kobo),
    amountOutstandingKobo: num(r.amount_outstanding_kobo),
    status: r.status,
    issueDate: r.issue_date,
    dueDate: r.due_date,
    startDate: r.start_date,
    endDate: r.end_date,
    source: r.source,
    deviceId: r.device_id,
    subscriptionId: r.subscription_id,
    metadata: r.metadata || {},
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapInstallment(r: any): BillingInstallment {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    obligationId: r.obligation_id,
    planId: r.plan_id,
    sequence: Number(r.sequence),
    dueDate: r.due_date,
    amountKobo: num(r.amount_kobo),
    paidKobo: num(r.paid_kobo),
    outstandingKobo: num(r.outstanding_kobo),
    status: r.status as InstallmentStatus,
    cancelled: !!r.cancelled,
    waived: !!r.waived,
  };
}

function mapPayment(r: any): BillingPayment {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    billingAccountId: r.billing_account_id,
    amountKobo: num(r.amount_kobo),
    allocatedKobo: num(r.allocated_kobo),
    unappliedKobo: num(r.unapplied_kobo),
    method: r.method,
    reference: r.reference,
    idempotencyKey: r.idempotency_key,
    paymentDate: r.payment_date,
    notes: r.notes,
    status: r.status,
    verification: r.verification,
    postedBy: r.posted_by,
    postedByRole: r.posted_by_role,
    createdAt: r.created_at,
    reversalId: r.reversal_id,
  };
}

async function must(table: string, q: PromiseLike<{ data: any; error: any }>) {
  const { data, error } = await q;
  if (error) throw new BillingInvariantError(`${table}: ${error.message}`);
  return data || [];
}

export class SupabaseTenantBillingStore extends MemoryTenantBillingStore {
  readonly persistent = true;

  async hydrate(): Promise<void> {
    const [accounts, obligations, plans, installments, payments, allocations, reversals, subscriptions, audit, events] =
      await Promise.all([
        must('billing_accounts', supabaseAdmin.from('billing_accounts').select('*')),
        must('billing_obligations', supabaseAdmin.from('billing_obligations').select('*')),
        must('billing_installment_plans', supabaseAdmin.from('billing_installment_plans').select('*')),
        must('billing_installments', supabaseAdmin.from('billing_installments').select('*')),
        must('billing_payments', supabaseAdmin.from('billing_payments').select('*')),
        must('billing_payment_allocations', supabaseAdmin.from('billing_payment_allocations').select('*')),
        must('billing_payment_reversals', supabaseAdmin.from('billing_payment_reversals').select('*')),
        must('billing_subscriptions', supabaseAdmin.from('billing_subscriptions').select('*')),
        must('billing_audit_events', supabaseAdmin.from('billing_audit_events').select('*')),
        must('billing_domain_events', supabaseAdmin.from('billing_domain_events').select('*')),
      ]);
    this.accounts.clear();
    this.obligations.clear();
    this.plans.clear();
    this.installments.clear();
    this.payments.clear();
    this.subscriptions.clear();
    this.allocations = [];
    this.reversals = [];
    this.audit = [];
    this.events = [];
    for (const r of accounts) this.accounts.set(r.id, mapAccount(r));
    for (const r of obligations) this.obligations.set(r.id, mapObligation(r));
    for (const r of plans) {
      this.plans.set(r.id, {
        id: r.id,
        tenantId: r.tenant_id,
        obligationId: r.obligation_id,
        deviceId: r.device_id,
        frequency: r.frequency,
        installmentKobo: num(r.installment_kobo),
        remainingKobo: num(r.remaining_kobo),
      });
    }
    for (const r of installments) this.installments.set(r.id, mapInstallment(r));
    for (const r of payments) this.payments.set(r.id, mapPayment(r));
    this.allocations = allocations.map((r: any) => ({
      id: r.id,
      paymentId: r.payment_id,
      installmentId: r.installment_id,
      obligationId: r.obligation_id,
      amountKobo: num(r.amount_kobo),
    }));
    this.reversals = reversals.map((r: any) => ({
      id: r.id,
      paymentId: r.payment_id,
      amountKobo: num(r.amount_kobo),
      reason: r.reason,
      actor: r.actor,
      createdAt: r.created_at,
    }));
    for (const r of subscriptions) {
      this.subscriptions.set(r.id, {
        id: r.id,
        tenantId: r.tenant_id,
        billingAccountId: r.billing_account_id,
        planName: r.plan_name,
        amountKobo: num(r.amount_kobo),
        frequency: r.frequency,
        nextDue: r.next_due,
        status: r.status,
      });
    }
    this.audit = audit.map((r: any) => ({
      id: r.id,
      actorId: r.actor_id,
      actorRole: r.actor_role,
      action: r.action,
      tenantId: r.tenant_id,
      billingAccountId: r.billing_account_id,
      obligationId: r.obligation_id,
      paymentId: r.payment_id,
      amountKobo: r.amount_kobo == null ? undefined : num(r.amount_kobo),
      previousState: r.previous_state,
      newState: r.new_state,
      timestamp: r.created_at,
      reference: r.reference,
      reason: r.reason,
      ip: r.ip,
    }));
    this.events = events.map((r: any) => ({
      id: r.id,
      type: r.type,
      payload: r.payload,
      at: r.created_at,
      delivered: r.delivered,
    }));
  }

  async persistEntities(): Promise<void> {
    const accounts = [...this.accounts.values()].map((a) => ({
      id: a.id,
      tenant_id: a.tenantId,
      currency: a.currency,
      status: a.status,
      unapplied_credit_kobo: a.unappliedCreditKobo,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    }));
    if (accounts.length) {
      const { error } = await supabaseAdmin.from('billing_accounts').upsert(accounts, { onConflict: 'id' });
      if (error) throw new BillingInvariantError(`persist accounts: ${error.message}`);
    }
    const subs = [...this.subscriptions.values()].map((s) => ({
      id: s.id,
      tenant_id: s.tenantId,
      billing_account_id: s.billingAccountId,
      plan_name: s.planName,
      amount_kobo: s.amountKobo,
      frequency: s.frequency,
      next_due: s.nextDue,
      status: s.status,
    }));
    if (subs.length) {
      const { error } = await supabaseAdmin.from('billing_subscriptions').upsert(subs, { onConflict: 'id' });
      if (error) throw new BillingInvariantError(`persist subscriptions: ${error.message}`);
    }
    const obs = [...this.obligations.values()].map((o) => ({
      id: o.id,
      tenant_id: o.tenantId,
      billing_account_id: o.billingAccountId,
      type: o.type,
      description: o.description,
      currency: o.currency,
      gross_amount_kobo: o.grossAmountKobo,
      amount_paid_kobo: o.amountPaidKobo,
      amount_outstanding_kobo: o.amountOutstandingKobo,
      status: o.status,
      issue_date: o.issueDate,
      due_date: o.dueDate,
      start_date: o.startDate || null,
      end_date: o.endDate || null,
      source: o.source,
      device_id: uuidOrNull(o.deviceId),
      subscription_id: o.subscriptionId || null,
      metadata: o.metadata || {},
      created_by: o.createdBy,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
    }));
    if (obs.length) {
      const { error } = await supabaseAdmin.from('billing_obligations').upsert(obs, { onConflict: 'id' });
      if (error) throw new BillingInvariantError(`persist obligations: ${error.message}`);
    }
    const plans = [...this.plans.values()].map((p) => ({
      id: p.id,
      tenant_id: p.tenantId,
      obligation_id: p.obligationId,
      device_id: uuidOrNull(p.deviceId),
      frequency: p.frequency,
      installment_kobo: p.installmentKobo,
      remaining_kobo: p.remainingKobo,
    }));
    if (plans.length) {
      const { error } = await supabaseAdmin.from('billing_installment_plans').upsert(plans, { onConflict: 'id' });
      if (error) throw new BillingInvariantError(`persist plans: ${error.message}`);
    }
    const inst = [...this.installments.values()].map((i) => ({
      id: i.id,
      tenant_id: i.tenantId,
      obligation_id: i.obligationId,
      plan_id: i.planId,
      sequence: i.sequence,
      due_date: i.dueDate,
      amount_kobo: i.amountKobo,
      paid_kobo: i.paidKobo,
      outstanding_kobo: i.outstandingKobo,
      status: i.status,
      cancelled: i.cancelled,
      waived: i.waived,
    }));
    if (inst.length) {
      const { error } = await supabaseAdmin.from('billing_installments').upsert(inst, { onConflict: 'id' });
      if (error) throw new BillingInvariantError(`persist installments: ${error.message}`);
    }
    const auditRows = this.audit.map((a) => ({
      id: a.id,
      actor_id: a.actorId,
      actor_role: a.actorRole,
      action: a.action,
      tenant_id: a.tenantId,
      billing_account_id: a.billingAccountId || null,
      obligation_id: a.obligationId || null,
      payment_id: a.paymentId || null,
      amount_kobo: a.amountKobo ?? null,
      previous_state: a.previousState ?? null,
      new_state: a.newState ?? null,
      reference: a.reference || null,
      reason: a.reason || null,
      ip: a.ip || null,
      created_at: a.timestamp,
    }));
    if (auditRows.length) {
      const { error } = await supabaseAdmin.from('billing_audit_events').upsert(auditRows, { onConflict: 'id' });
      if (error) throw new BillingInvariantError(`persist audit: ${error.message}`);
    }
    const ev = this.events.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      delivered: !!e.delivered,
      created_at: e.at,
    }));
    if (ev.length) {
      const { error } = await supabaseAdmin.from('billing_domain_events').upsert(ev, { onConflict: 'id' });
      if (error) throw new BillingInvariantError(`persist events: ${error.message}`);
    }
  }

  async postPaymentAtomic(payload: Record<string, unknown>): Promise<{ duplicate: boolean; payment: any }> {
    const { data, error } = await supabaseAdmin.rpc('post_tenant_billing_payment', { p: payload });
    if (error) throw new BillingInvariantError(error.message);
    return data as { duplicate: boolean; payment: any };
  }

  async reversePaymentAtomic(payload: Record<string, unknown>): Promise<{ payment: any; reversal_id: string }> {
    const { data, error } = await supabaseAdmin.rpc('reverse_tenant_billing_payment', { p: payload });
    if (error) {
      if (/ALREADY_REVERSED/i.test(error.message)) {
        throw new BillingInvariantError('payment already reversed');
      }
      throw new BillingInvariantError(error.message);
    }
    return data as { payment: any; reversal_id: string };
  }
}

import { randomUUID } from 'crypto';
import {
  AllocatableInstallment,
  BILLING_EVENTS,
  BillingInvariantError,
  InstallmentStatus,
  OBLIGATION_TYPES,
  ObligationType,
  OVERPAYMENT_POLICY,
  PAYMENT_METHODS,
  PaymentMethod,
  applyAllocationToPaid,
  assertAllocationDoesNotExceedPayment,
  assertCannotReverseTwice,
  assertKobo,
  computeInstallmentStatus,
  generateInstallmentSchedule,
  outstandingKobo,
  planAutomaticAllocation,
  previewPosting,
  utcDay,
  verificationFlag,
} from './tenant-billing.engine';

export type Actor = {
  id: string;
  email: string;
  role: string;
  ip?: string;
};

export type BillingAccount = {
  id: string;
  tenantId: string;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  unappliedCreditKobo: number;
  createdAt: string;
  updatedAt: string;
};

export type BillingObligation = {
  id: string;
  tenantId: string;
  billingAccountId: string;
  type: ObligationType;
  description: string;
  currency: string;
  grossAmountKobo: number;
  amountPaidKobo: number;
  amountOutstandingKobo: number;
  status: 'OPEN' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  issueDate: string;
  dueDate: string;
  startDate?: string | null;
  endDate?: string | null;
  source: string;
  deviceId?: string | null;
  subscriptionId?: string | null;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingInstallment = {
  id: string;
  tenantId: string;
  obligationId: string;
  planId: string;
  sequence: number;
  dueDate: string;
  amountKobo: number;
  paidKobo: number;
  outstandingKobo: number;
  status: InstallmentStatus;
  cancelled: boolean;
  waived: boolean;
};

export type BillingPayment = {
  id: string;
  tenantId: string;
  billingAccountId: string;
  amountKobo: number;
  allocatedKobo: number;
  unappliedKobo: number;
  method: PaymentMethod;
  reference: string;
  idempotencyKey: string;
  paymentDate: string;
  notes?: string;
  status: string;
  verification: string | null;
  postedBy: string;
  postedByRole: string;
  createdAt: string;
  reversalId?: string | null;
};

type AuditRow = {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  tenantId: string;
  billingAccountId?: string;
  obligationId?: string;
  paymentId?: string;
  amountKobo?: number;
  previousState?: unknown;
  newState?: unknown;
  timestamp: string;
  reference?: string;
  reason?: string;
  ip?: string;
};

function nowIso() {
  return new Date().toISOString();
}

export class MemoryTenantBillingStore {
  readonly persistent: boolean = false;
  accounts = new Map<string, BillingAccount>();
  obligations = new Map<string, BillingObligation>();
  plans = new Map<string, any>();
  installments = new Map<string, BillingInstallment>();
  payments = new Map<string, BillingPayment>();
  allocations: any[] = [];
  reversals: any[] = [];
  subscriptions = new Map<string, any>();
  audit: AuditRow[] = [];
  events: any[] = [];
  private chains = new Map<string, Promise<unknown>>();

  async hydrate(): Promise<void> {
    return;
  }

  async persistEntities(): Promise<void> {
    return;
  }

  async withAccountLock<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(accountId) || Promise.resolve();
    let release: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const next = prev.then(() => gate);
    this.chains.set(accountId, next.catch(() => undefined));
    await prev;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

export class TenantBillingService {
  constructor(public store: MemoryTenantBillingStore) {}

  ensureAccount(tenantId: string, currency = 'NGN'): BillingAccount {
    const existing = [...this.store.accounts.values()].find((a) => a.tenantId === tenantId);
    if (existing) return existing;
    const account: BillingAccount = {
      id: randomUUID(),
      tenantId,
      currency,
      status: 'ACTIVE',
      unappliedCreditKobo: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.store.accounts.set(account.id, account);
    return account;
  }

  createObligation(input: {
    tenantId: string;
    type: ObligationType;
    description: string;
    grossAmountKobo: number;
    dueDate: string;
    issueDate?: string;
    deviceId?: string | null;
    subscriptionId?: string | null;
    source?: string;
    actor: Actor;
  }): BillingObligation {
    if (!OBLIGATION_TYPES.includes(input.type)) {
      throw new BillingInvariantError(`Unsupported obligation type ${input.type}`);
    }
    const account = this.ensureAccount(input.tenantId);
    const gross = assertKobo(input.grossAmountKobo, 'gross');
    const ob: BillingObligation = {
      id: randomUUID(),
      tenantId: input.tenantId,
      billingAccountId: account.id,
      type: input.type,
      description: input.description,
      currency: account.currency,
      grossAmountKobo: gross,
      amountPaidKobo: 0,
      amountOutstandingKobo: gross,
      status: 'OPEN',
      issueDate: utcDay(input.issueDate || new Date()),
      dueDate: utcDay(input.dueDate),
      source: input.source || 'MANUAL',
      deviceId: input.deviceId || null,
      subscriptionId: input.subscriptionId || null,
      metadata: {},
      createdBy: input.actor.email,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.store.obligations.set(ob.id, ob);
    this.audit(input.actor, 'CREATE_OBLIGATION', ob.tenantId, { obligationId: ob.id, amountKobo: gross, billingAccountId: account.id });
    return ob;
  }

  createDeviceInstallmentPlan(input: {
    tenantId: string;
    deviceId: string;
    description: string;
    purchasePriceKobo: number;
    downPaymentKobo: number;
    installmentKobo: number;
    firstDueDate: string;
    serialNumber?: string;
    actor: Actor;
    now?: string | Date;
  }) {
    const purchase = assertKobo(input.purchasePriceKobo, 'purchase');
    const down = assertKobo(input.downPaymentKobo, 'down payment');
    if (down > purchase) throw new BillingInvariantError('down payment exceeds purchase price');
    const remaining = purchase - down;
    const obligation = this.createObligation({
      tenantId: input.tenantId,
      type: 'DEVICE_INSTALLMENT',
      description: input.description,
      grossAmountKobo: remaining,
      dueDate: input.firstDueDate,
      deviceId: input.deviceId,
      source: 'DEVICE_FINANCING',
      actor: input.actor,
    });
    obligation.metadata = {
      purchasePriceKobo: purchase,
      downPaymentKobo: down,
      serialNumber: input.serialNumber || null,
    };
    const planId = randomUUID();
    const schedule = generateInstallmentSchedule({
      remainingKobo: remaining,
      installmentKobo: input.installmentKobo,
      firstDueDate: input.firstDueDate,
      now: input.now,
    });
    this.store.plans.set(planId, {
      id: planId,
      tenantId: input.tenantId,
      obligationId: obligation.id,
      deviceId: input.deviceId,
      frequency: 'MONTHLY',
      installmentKobo: input.installmentKobo,
      remainingKobo: remaining,
    });
    const installments = schedule.map((row) => {
      const inst: BillingInstallment = {
        id: randomUUID(),
        tenantId: input.tenantId,
        obligationId: obligation.id,
        planId,
        sequence: row.sequence,
        dueDate: row.dueDate,
        amountKobo: row.amountKobo,
        paidKobo: 0,
        outstandingKobo: row.amountKobo,
        status: row.status,
        cancelled: false,
        waived: false,
      };
      this.store.installments.set(inst.id, inst);
      return inst;
    });
    return { obligation, planId, installments };
  }

  createSubscription(input: {
    tenantId: string;
    planName: string;
    amountKobo: number;
    frequency?: 'MONTHLY';
    nextDue: string;
    actor: Actor;
  }) {
    const amount = assertKobo(input.amountKobo, 'subscription');
    const account = this.ensureAccount(input.tenantId);
    const sub = {
      id: randomUUID(),
      tenantId: input.tenantId,
      billingAccountId: account.id,
      planName: input.planName,
      amountKobo: amount,
      frequency: input.frequency || 'MONTHLY',
      nextDue: utcDay(input.nextDue),
      status: 'ACTIVE',
    };
    this.store.subscriptions.set(sub.id, sub);
    const obligation = this.createObligation({
      tenantId: input.tenantId,
      type: 'SUBSCRIPTION',
      description: `${input.planName} ${utcDay(input.nextDue)}`,
      grossAmountKobo: amount,
      dueDate: input.nextDue,
      subscriptionId: sub.id,
      source: 'SUBSCRIPTION_SCHEDULE',
      actor: input.actor,
    });
    this.emit(BILLING_EVENTS.SUBSCRIPTION_DUE, { subscriptionId: sub.id, obligationId: obligation.id });
    return { subscription: sub, obligation };
  }

  private refreshObligation(ob: BillingObligation) {
    const rows = [...this.store.installments.values()].filter((i) => i.obligationId === ob.id);
    if (rows.length) {
      ob.amountPaidKobo = rows.reduce((s, r) => s + r.paidKobo, 0);
      ob.amountOutstandingKobo = rows.reduce((s, r) => s + r.outstandingKobo, 0);
    } else {
      ob.amountOutstandingKobo = outstandingKobo(ob.grossAmountKobo, ob.amountPaidKobo);
    }
    if (ob.status === 'CANCELLED') return;
    if (ob.amountOutstandingKobo === 0) ob.status = 'PAID';
    else if (ob.amountPaidKobo > 0) ob.status = 'PARTIAL';
    else ob.status = 'OPEN';
    ob.updatedAt = nowIso();
  }

  private refreshInstallment(inst: BillingInstallment, now?: string | Date) {
    inst.outstandingKobo = outstandingKobo(inst.amountKobo, inst.paidKobo);
    inst.status = computeInstallmentStatus({
      amountKobo: inst.amountKobo,
      paidKobo: inst.paidKobo,
      dueDate: inst.dueDate,
      now,
      waived: inst.waived,
      cancelled: inst.cancelled,
    });
  }

  previewPayment(input: {
    tenantId: string;
    obligationId?: string;
    installmentId?: string;
    amountKobo: number;
    now?: string | Date;
    allowFutureWhileOverdue?: boolean;
  }) {
    const account = this.ensureAccount(input.tenantId);
    const scope = this.installmentsForScope(input.tenantId, input.obligationId, input.installmentId);
    const lump = this.lumpObligations(input.tenantId, input.obligationId, scope.length > 0);
    const outstandingBefore =
      (scope.length ? scope.reduce((s, i) => s + i.outstandingKobo, 0) : 0) +
      lump.reduce((s, o) => s + o.amountOutstandingKobo, 0);
    const plan = planAutomaticAllocation(scope, input.amountKobo, {
      now: input.now,
      allowFutureWhileOverdue: input.allowFutureWhileOverdue,
    });
    const preview = previewPosting({
      outstandingBeforeKobo: outstandingBefore,
      paymentKobo: input.amountKobo,
    });
    const lumpAllocations: { obligationId: string; amountKobo: number }[] = [];
    let leftover = plan.unappliedKobo;
    if (!scope.length) leftover = preview.paymentKobo;
    for (const ob of lump) {
      if (leftover <= 0) break;
      const apply = Math.min(leftover, ob.amountOutstandingKobo);
      lumpAllocations.push({ obligationId: ob.id, amountKobo: apply });
      leftover -= apply;
    }
    return {
      overpaymentPolicy: OVERPAYMENT_POLICY,
      accountId: account.id,
      ...preview,
      proposedAllocations: plan.allocations,
      proposedObligationAllocations: lumpAllocations,
      unappliedCreditKobo: leftover,
    };
  }

  async postPayment(input: {
    tenantId: string;
    amountKobo: number;
    method: PaymentMethod;
    reference: string;
    paymentDate: string;
    notes?: string;
    obligationId?: string;
    installmentId?: string;
    idempotencyKey?: string;
    allocations?: { installmentId: string; amountKobo: number }[];
    confirm?: boolean;
    actor: Actor;
    now?: string | Date;
    allowFutureWhileOverdue?: boolean;
  }): Promise<{ payment: BillingPayment; preview: ReturnType<TenantBillingService['previewPayment']>; duplicate?: boolean }> {
    if (!PAYMENT_METHODS.includes(input.method)) {
      throw new BillingInvariantError(`Unsupported payment method ${input.method}`);
    }
    const account = this.ensureAccount(input.tenantId);
    const remote = this.store as MemoryTenantBillingStore & {
      postPaymentAtomic?: (p: Record<string, unknown>) => Promise<{ duplicate: boolean; payment: any }>;
    };
    if (remote.postPaymentAtomic) {
      await this.store.persistEntities();
      const key = input.idempotencyKey || `ref:${input.tenantId}:${input.reference}`;
      const preview = this.previewPayment(input);
      const result = await remote.postPaymentAtomic({
        tenant_id: input.tenantId,
        amount_kobo: assertKobo(input.amountKobo, 'payment'),
        method: input.method,
        reference: input.reference,
        idempotency_key: key,
        payment_date: utcDay(input.paymentDate),
        notes: input.notes || null,
        verification: verificationFlag(input.method),
        posted_by: input.actor.email,
        posted_by_role: input.actor.role,
        actor_id: input.actor.id,
        ip: input.actor.ip || null,
        allocations: (input.allocations || preview.proposedAllocations).map((a) => ({
          installment_id: a.installmentId,
          amount_kobo: a.amountKobo,
        })),
        obligation_allocations: preview.proposedObligationAllocations.map((a) => ({
          obligation_id: a.obligationId,
          amount_kobo: a.amountKobo,
        })),
      });
      await this.store.hydrate();
      const paymentRow = result.payment || {};
      const payment =
        this.store.payments.get(paymentRow.id) ||
        ({
          id: paymentRow.id,
          tenantId: paymentRow.tenant_id,
          billingAccountId: paymentRow.billing_account_id,
          amountKobo: Number(paymentRow.amount_kobo || 0),
          allocatedKobo: Number(paymentRow.allocated_kobo || 0),
          unappliedKobo: Number(paymentRow.unapplied_kobo || 0),
          method: paymentRow.method,
          reference: paymentRow.reference,
          idempotencyKey: paymentRow.idempotency_key,
          paymentDate: paymentRow.payment_date,
          notes: paymentRow.notes,
          status: paymentRow.status,
          verification: paymentRow.verification,
          postedBy: paymentRow.posted_by,
          postedByRole: paymentRow.posted_by_role,
          createdAt: paymentRow.created_at,
          reversalId: paymentRow.reversal_id,
        } as BillingPayment);
      return { payment, preview, duplicate: !!result.duplicate };
    }
    return this.store.withAccountLock(account.id, async () => {
      const key = input.idempotencyKey || `ref:${input.tenantId}:${input.reference}`;
      const existing = [...this.store.payments.values()].find(
        (p) => p.tenantId === input.tenantId && (p.idempotencyKey === key || p.reference === input.reference),
      );
      if (existing) {
        return {
          payment: existing,
          preview: this.previewPayment(input),
          duplicate: true,
        };
      }

      const preview = this.previewPayment(input);
      const payment: BillingPayment = {
        id: randomUUID(),
        tenantId: input.tenantId,
        billingAccountId: account.id,
        amountKobo: assertKobo(input.amountKobo, 'payment'),
        allocatedKobo: 0,
        unappliedKobo: 0,
        method: input.method,
        reference: input.reference,
        idempotencyKey: key,
        paymentDate: utcDay(input.paymentDate),
        notes: input.notes,
        status: 'PENDING',
        verification: verificationFlag(input.method),
        postedBy: input.actor.email,
        postedByRole: input.actor.role,
        createdAt: nowIso(),
        reversalId: null,
      };
      this.store.payments.set(payment.id, payment);
      this.audit(input.actor, 'POST_PAYMENT', input.tenantId, {
        paymentId: payment.id,
        amountKobo: payment.amountKobo,
        billingAccountId: account.id,
        obligationId: input.obligationId,
        reference: input.reference,
      });
      this.emit(BILLING_EVENTS.PAYMENT_POSTED, { paymentId: payment.id });

      if (input.confirm !== false) {
        this.confirmPayment({
          paymentId: payment.id,
          tenantId: input.tenantId,
          allocations: input.allocations || preview.proposedAllocations,
          obligationAllocations: preview.proposedObligationAllocations,
          actor: input.actor,
          now: input.now,
        });
      }
      return { payment, preview };
    });
  }

  confirmPayment(input: {
    paymentId: string;
    tenantId: string;
    allocations: { installmentId: string; amountKobo: number }[];
    obligationAllocations?: { obligationId: string; amountKobo: number }[];
    actor: Actor;
    now?: string | Date;
  }) {
    const payment = this.store.payments.get(input.paymentId);
    if (!payment) throw new BillingInvariantError('payment not found');
    this.assertTenant(payment.tenantId, input.tenantId);
    if (payment.status === 'REVERSED') throw new BillingInvariantError('cannot confirm a reversed payment');
    if (payment.status === 'CONFIRMED') return payment;
    const obligationAllocations = input.obligationAllocations || [];
    assertAllocationDoesNotExceedPayment(
      [...input.allocations, ...obligationAllocations],
      payment.amountKobo,
    );
    let allocated = 0;
    for (const line of input.allocations) {
      const inst = this.store.installments.get(line.installmentId);
      if (!inst) throw new BillingInvariantError('installment not found');
      this.assertTenant(inst.tenantId, input.tenantId);
      if (inst.cancelled) throw new BillingInvariantError('cancelled installment cannot receive payment');
      const ob = this.store.obligations.get(inst.obligationId)!;
      if (ob.status === 'CANCELLED') throw new BillingInvariantError('cancelled obligation cannot receive payment');
      const next = applyAllocationToPaid(inst.paidKobo, inst.amountKobo, line.amountKobo);
      inst.paidKobo = next.paidKobo;
      inst.outstandingKobo = next.outstandingKobo;
      this.refreshInstallment(inst, input.now);
      this.store.allocations.push({
        id: randomUUID(),
        paymentId: payment.id,
        installmentId: inst.id,
        obligationId: inst.obligationId,
        amountKobo: line.amountKobo,
      });
      allocated += line.amountKobo;
      this.refreshObligation(ob);
    }
    for (const line of obligationAllocations) {
      const ob = this.store.obligations.get(line.obligationId);
      if (!ob) throw new BillingInvariantError('obligation not found');
      this.assertTenant(ob.tenantId, input.tenantId);
      if (ob.status === 'CANCELLED') throw new BillingInvariantError('cancelled obligation cannot receive payment');
      const nextPaid = ob.amountPaidKobo + line.amountKobo;
      if (nextPaid > ob.grossAmountKobo) throw new BillingInvariantError('allocation would overpay the obligation');
      ob.amountPaidKobo = nextPaid;
      ob.amountOutstandingKobo = ob.grossAmountKobo - nextPaid;
      this.refreshObligation(ob);
      this.store.allocations.push({
        id: randomUUID(),
        paymentId: payment.id,
        installmentId: null,
        obligationId: ob.id,
        amountKobo: line.amountKobo,
      });
      allocated += line.amountKobo;
    }
    payment.allocatedKobo = allocated;
    payment.unappliedKobo = payment.amountKobo - allocated;
    payment.status = 'CONFIRMED';
    const account = this.store.accounts.get(payment.billingAccountId)!;
    account.unappliedCreditKobo += payment.unappliedKobo;
    this.audit(input.actor, 'CONFIRM_PAYMENT', input.tenantId, {
      paymentId: payment.id,
      amountKobo: payment.amountKobo,
      billingAccountId: account.id,
      newState: { allocated, unapplied: payment.unappliedKobo },
    });
    this.emit(BILLING_EVENTS.PAYMENT_CONFIRMED, { paymentId: payment.id });
    return payment;
  }

  reversePayment(input: { paymentId: string; tenantId: string; reason: string; actor: Actor; now?: string | Date }) {
    const remote = this.store as MemoryTenantBillingStore & {
      reversePaymentAtomic?: (p: Record<string, unknown>) => Promise<{ payment: any; reversal_id: string }>;
    };
    if (remote.reversePaymentAtomic) {
      throw new BillingInvariantError('use reversePaymentRemote for persistent store');
    }
    const payment = this.store.payments.get(input.paymentId);
    if (!payment) throw new BillingInvariantError('payment not found');
    this.assertTenant(payment.tenantId, input.tenantId);
    assertCannotReverseTwice(payment.reversalId);
    if (payment.status !== 'CONFIRMED' && payment.status !== 'PENDING') {
      throw new BillingInvariantError('only pending or confirmed payments can be reversed');
    }
    const reversalId = randomUUID();
    payment.reversalId = reversalId;
    const lines = this.store.allocations.filter((a) => a.paymentId === payment.id);
    for (const line of lines) {
      if (line.installmentId) {
        const inst = this.store.installments.get(line.installmentId);
        if (!inst) continue;
        inst.paidKobo -= line.amountKobo;
        if (inst.paidKobo < 0) throw new BillingInvariantError('reversal underflow');
        this.refreshInstallment(inst, input.now);
        const ob = this.store.obligations.get(inst.obligationId)!;
        this.refreshObligation(ob);
      } else if (line.obligationId) {
        const ob = this.store.obligations.get(line.obligationId);
        if (!ob) continue;
        ob.amountPaidKobo -= line.amountKobo;
        if (ob.amountPaidKobo < 0) throw new BillingInvariantError('reversal underflow');
        this.refreshObligation(ob);
      }
    }
    const account = this.store.accounts.get(payment.billingAccountId)!;
    account.unappliedCreditKobo -= payment.unappliedKobo;
    if (account.unappliedCreditKobo < 0) account.unappliedCreditKobo = 0;
    payment.status = 'REVERSED';
    this.store.reversals.push({
      id: reversalId,
      paymentId: payment.id,
      amountKobo: payment.amountKobo,
      reason: input.reason,
      actor: input.actor.email,
      createdAt: nowIso(),
    });
    this.audit(input.actor, 'REVERSE_PAYMENT', input.tenantId, {
      paymentId: payment.id,
      amountKobo: payment.amountKobo,
      reason: input.reason,
      billingAccountId: account.id,
    });
    this.emit(BILLING_EVENTS.PAYMENT_REVERSED, { paymentId: payment.id, reversalId });
    return { payment, reversalId };
  }

  async reversePaymentRemote(input: { paymentId: string; tenantId: string; reason: string; actor: Actor }) {
    const remote = this.store as MemoryTenantBillingStore & {
      reversePaymentAtomic?: (p: Record<string, unknown>) => Promise<{ payment: any; reversal_id: string }>;
    };
    if (!remote.reversePaymentAtomic) return this.reversePayment(input);
    const result = await remote.reversePaymentAtomic({
      payment_id: input.paymentId,
      tenant_id: input.tenantId,
      reason: input.reason,
      actor: input.actor.email,
      actor_id: input.actor.id,
      actor_role: input.actor.role,
    });
    await this.store.hydrate();
    const payment = this.store.payments.get(input.paymentId)!;
    return { payment, reversalId: result.reversal_id };
  }

  cancelObligation(obligationId: string, tenantId: string, actor: Actor) {
    const ob = this.store.obligations.get(obligationId);
    if (!ob) throw new BillingInvariantError('obligation not found');
    this.assertTenant(ob.tenantId, tenantId);
    ob.status = 'CANCELLED';
    for (const inst of [...this.store.installments.values()].filter((i) => i.obligationId === ob.id)) {
      inst.cancelled = true;
      inst.status = 'CANCELLED';
    }
    this.audit(actor, 'CANCEL_OBLIGATION', tenantId, { obligationId });
    return ob;
  }

  overview(now?: string | Date) {
    const today = utcDay(now || new Date());
    const month = today.slice(0, 7);
    const installments = [...this.store.installments.values()].filter((i) => !i.cancelled);
    const payments = [...this.store.payments.values()].filter((p) => p.status === 'CONFIRMED');
    const overdue = installments.filter((i) => i.status === 'OVERDUE' || (i.outstandingKobo > 0 && i.dueDate < today));
    const dueThisMonth = installments.filter((i) => i.dueDate.startsWith(month) && i.outstandingKobo > 0);
    return {
      totalOutstandingKobo: installments.reduce((s, i) => s + i.outstandingKobo, 0),
      dueThisMonthKobo: dueThisMonth.reduce((s, i) => s + i.outstandingKobo, 0),
      overdueKobo: overdue.reduce((s, i) => s + i.outstandingKobo, 0),
      collectedThisMonthKobo: payments
        .filter((p) => p.paymentDate.startsWith(month))
        .reduce((s, p) => s + p.allocatedKobo, 0),
      pendingPayments: [...this.store.payments.values()].filter((p) => p.status === 'PENDING').length,
      activeInstallmentPlans: this.store.plans.size,
      activeSubscriptions: [...this.store.subscriptions.values()].filter((s) => s.status === 'ACTIVE').length,
    };
  }

  tenantProfile(tenantId: string, now?: string | Date) {
    const obligations = [...this.store.obligations.values()].filter((o) => o.tenantId === tenantId);
    const installments = [...this.store.installments.values()].filter((i) => i.tenantId === tenantId);
    const payments = [...this.store.payments.values()].filter((p) => p.tenantId === tenantId);
    const today = utcDay(now || new Date());
    return {
      tenantId,
      totalObligationsKobo: obligations.reduce((s, o) => s + o.grossAmountKobo, 0),
      totalPaidKobo: obligations.reduce((s, o) => s + o.amountPaidKobo, 0),
      outstandingKobo: installments.reduce((s, i) => s + i.outstandingKobo, 0),
      overdueKobo: installments
        .filter((i) => i.outstandingKobo > 0 && i.dueDate < today)
        .reduce((s, i) => s + i.outstandingKobo, 0),
      devices: obligations.filter((o) => o.deviceId),
      subscriptions: [...this.store.subscriptions.values()].filter((s) => s.tenantId === tenantId),
      payments,
      installments,
    };
  }

  reports(kind: string, filters: { tenantId?: string } = {}) {
    const inst = [...this.store.installments.values()].filter(
      (i) => !filters.tenantId || i.tenantId === filters.tenantId,
    );
    const pays = [...this.store.payments.values()].filter(
      (p) => !filters.tenantId || p.tenantId === filters.tenantId,
    );
    if (kind === 'overdue') return inst.filter((i) => i.status === 'OVERDUE');
    if (kind === 'collections') return pays.filter((p) => p.status === 'CONFIRMED');
    if (kind === 'payments') return pays;
    if (kind === 'installments') return inst;
    if (kind === 'subscriptions') return [...this.store.subscriptions.values()];
    return [...this.store.obligations.values()].filter(
      (o) => !filters.tenantId || o.tenantId === filters.tenantId,
    );
  }

  private lumpObligations(tenantId: string, obligationId: string | undefined, hasInstallments: boolean) {
    if (hasInstallments) return [];
    let rows = [...this.store.obligations.values()].filter((o) => o.tenantId === tenantId && o.status !== 'CANCELLED');
    if (obligationId) rows = rows.filter((o) => o.id === obligationId);
    return rows.filter((o) => o.amountOutstandingKobo > 0);
  }

  private installmentsForScope(
    tenantId: string,
    obligationId?: string,
    installmentId?: string,
  ): AllocatableInstallment[] {
    let rows = [...this.store.installments.values()].filter((i) => i.tenantId === tenantId);
    if (obligationId) rows = rows.filter((i) => i.obligationId === obligationId);
    if (installmentId) {
      rows = rows.filter((i) => i.id === installmentId);
      if (!rows.length) {
        const foreign = [...this.store.installments.values()].find((i) => i.id === installmentId);
        if (foreign) throw new BillingInvariantError('tenant isolation violation', 'TENANT_ISOLATION');
        throw new BillingInvariantError('installment not found');
      }
    }
    if (obligationId) {
      const ob = this.store.obligations.get(obligationId);
      if (ob && ob.tenantId !== tenantId) throw new BillingInvariantError('tenant isolation violation', 'TENANT_ISOLATION');
      if (ob?.status === 'CANCELLED') throw new BillingInvariantError('cancelled obligation cannot receive payment');
    }
    return rows;
  }

  private assertTenant(actual: string, expected: string) {
    if (actual !== expected) {
      throw new BillingInvariantError('tenant isolation violation', 'TENANT_ISOLATION');
    }
  }

  private audit(actor: Actor, action: string, tenantId: string, extra: Partial<AuditRow>) {
    this.store.audit.push({
      id: randomUUID(),
      actorId: actor.id,
      actorRole: actor.role,
      action,
      tenantId,
      timestamp: nowIso(),
      ip: actor.ip,
      ...extra,
    });
  }

  private emit(type: string, payload: Record<string, unknown>) {
    this.store.events.push({ id: randomUUID(), type, payload, at: nowIso(), delivered: false });
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantBillingService = exports.MemoryTenantBillingStore = void 0;
const crypto_1 = require("crypto");
const tenant_billing_engine_1 = require("./tenant-billing.engine");
function nowIso() {
    return new Date().toISOString();
}
class MemoryTenantBillingStore {
    persistent = false;
    accounts = new Map();
    obligations = new Map();
    plans = new Map();
    installments = new Map();
    payments = new Map();
    allocations = [];
    reversals = [];
    subscriptions = new Map();
    audit = [];
    events = [];
    chains = new Map();
    async hydrate() {
        return;
    }
    async persistEntities() {
        return;
    }
    async withAccountLock(accountId, fn) {
        const prev = this.chains.get(accountId) || Promise.resolve();
        let release;
        const gate = new Promise((resolve) => {
            release = resolve;
        });
        const next = prev.then(() => gate);
        this.chains.set(accountId, next.catch(() => undefined));
        await prev;
        try {
            return await fn();
        }
        finally {
            release();
        }
    }
}
exports.MemoryTenantBillingStore = MemoryTenantBillingStore;
class TenantBillingService {
    store;
    constructor(store) {
        this.store = store;
    }
    ensureAccount(tenantId, currency = 'NGN') {
        const existing = [...this.store.accounts.values()].find((a) => a.tenantId === tenantId);
        if (existing)
            return existing;
        const account = {
            id: (0, crypto_1.randomUUID)(),
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
    createObligation(input) {
        if (!tenant_billing_engine_1.OBLIGATION_TYPES.includes(input.type)) {
            throw new tenant_billing_engine_1.BillingInvariantError(`Unsupported obligation type ${input.type}`);
        }
        const account = this.ensureAccount(input.tenantId);
        const gross = (0, tenant_billing_engine_1.assertKobo)(input.grossAmountKobo, 'gross');
        const ob = {
            id: (0, crypto_1.randomUUID)(),
            tenantId: input.tenantId,
            billingAccountId: account.id,
            type: input.type,
            description: input.description,
            currency: account.currency,
            grossAmountKobo: gross,
            amountPaidKobo: 0,
            amountOutstandingKobo: gross,
            status: 'OPEN',
            issueDate: (0, tenant_billing_engine_1.utcDay)(input.issueDate || new Date()),
            dueDate: (0, tenant_billing_engine_1.utcDay)(input.dueDate),
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
    createDeviceInstallmentPlan(input) {
        const purchase = (0, tenant_billing_engine_1.assertKobo)(input.purchasePriceKobo, 'purchase');
        const down = (0, tenant_billing_engine_1.assertKobo)(input.downPaymentKobo, 'down payment');
        if (down > purchase)
            throw new tenant_billing_engine_1.BillingInvariantError('down payment exceeds purchase price');
        this.assertCanCreateDevicePlan(input.tenantId);
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
        const planId = (0, crypto_1.randomUUID)();
        const schedule = (0, tenant_billing_engine_1.generateInstallmentSchedule)({
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
            const inst = {
                id: (0, crypto_1.randomUUID)(),
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
    createSubscription(input) {
        const amount = (0, tenant_billing_engine_1.assertKobo)(input.amountKobo, 'subscription');
        const account = this.ensureAccount(input.tenantId);
        const sub = {
            id: (0, crypto_1.randomUUID)(),
            tenantId: input.tenantId,
            billingAccountId: account.id,
            planName: input.planName,
            amountKobo: amount,
            frequency: input.frequency || 'MONTHLY',
            nextDue: (0, tenant_billing_engine_1.utcDay)(input.nextDue),
            status: 'ACTIVE',
        };
        this.store.subscriptions.set(sub.id, sub);
        const obligation = this.createObligation({
            tenantId: input.tenantId,
            type: 'SUBSCRIPTION',
            description: `${input.planName} ${(0, tenant_billing_engine_1.utcDay)(input.nextDue)}`,
            grossAmountKobo: amount,
            dueDate: input.nextDue,
            subscriptionId: sub.id,
            source: 'SUBSCRIPTION_SCHEDULE',
            actor: input.actor,
        });
        this.emit(tenant_billing_engine_1.BILLING_EVENTS.SUBSCRIPTION_DUE, { subscriptionId: sub.id, obligationId: obligation.id });
        return { subscription: sub, obligation };
    }
    refreshObligation(ob) {
        const rows = [...this.store.installments.values()].filter((i) => i.obligationId === ob.id);
        if (rows.length) {
            ob.amountPaidKobo = rows.reduce((s, r) => s + r.paidKobo, 0);
            ob.amountOutstandingKobo = rows.reduce((s, r) => s + r.outstandingKobo, 0);
        }
        else {
            ob.amountOutstandingKobo = (0, tenant_billing_engine_1.outstandingKobo)(ob.grossAmountKobo, ob.amountPaidKobo);
        }
        if (ob.status === 'CANCELLED')
            return;
        if (ob.amountOutstandingKobo === 0)
            ob.status = 'PAID';
        else if (ob.amountPaidKobo > 0)
            ob.status = 'PARTIAL';
        else
            ob.status = 'OPEN';
        ob.updatedAt = nowIso();
    }
    refreshInstallment(inst, now) {
        inst.outstandingKobo = (0, tenant_billing_engine_1.outstandingKobo)(inst.amountKobo, inst.paidKobo);
        inst.status = (0, tenant_billing_engine_1.computeInstallmentStatus)({
            amountKobo: inst.amountKobo,
            paidKobo: inst.paidKobo,
            dueDate: inst.dueDate,
            now,
            waived: inst.waived,
            cancelled: inst.cancelled,
        });
    }
    previewPayment(input) {
        const account = this.ensureAccount(input.tenantId);
        const scope = this.installmentsForScope(input.tenantId, input.obligationId, input.installmentId);
        const lump = this.lumpObligations(input.tenantId, input.obligationId, scope.length > 0);
        const outstandingBefore = (scope.length ? scope.reduce((s, i) => s + i.outstandingKobo, 0) : 0) +
            lump.reduce((s, o) => s + o.amountOutstandingKobo, 0);
        const plan = (0, tenant_billing_engine_1.planAutomaticAllocation)(scope, input.amountKobo, {
            now: input.now,
            allowFutureWhileOverdue: input.allowFutureWhileOverdue,
        });
        const preview = (0, tenant_billing_engine_1.previewPosting)({
            outstandingBeforeKobo: outstandingBefore,
            paymentKobo: input.amountKobo,
        });
        const lumpAllocations = [];
        let leftover = plan.unappliedKobo;
        if (!scope.length)
            leftover = preview.paymentKobo;
        for (const ob of lump) {
            if (leftover <= 0)
                break;
            const apply = Math.min(leftover, ob.amountOutstandingKobo);
            lumpAllocations.push({ obligationId: ob.id, amountKobo: apply });
            leftover -= apply;
        }
        return {
            overpaymentPolicy: tenant_billing_engine_1.OVERPAYMENT_POLICY,
            accountId: account.id,
            ...preview,
            proposedAllocations: plan.allocations,
            proposedObligationAllocations: lumpAllocations,
            unappliedCreditKobo: leftover,
        };
    }
    async postPayment(input) {
        if (!tenant_billing_engine_1.PAYMENT_METHODS.includes(input.method)) {
            throw new tenant_billing_engine_1.BillingInvariantError(`Unsupported payment method ${input.method}`);
        }
        const account = this.ensureAccount(input.tenantId);
        const remote = this.store;
        if (remote.postPaymentAtomic) {
            await this.store.persistEntities();
            const key = input.idempotencyKey || `ref:${input.tenantId}:${input.reference}`;
            const preview = this.previewPayment(input);
            const result = await remote.postPaymentAtomic({
                tenant_id: input.tenantId,
                amount_kobo: (0, tenant_billing_engine_1.assertKobo)(input.amountKobo, 'payment'),
                method: input.method,
                reference: input.reference,
                idempotency_key: key,
                payment_date: (0, tenant_billing_engine_1.utcDay)(input.paymentDate),
                notes: input.notes || null,
                verification: (0, tenant_billing_engine_1.verificationFlag)(input.method),
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
            const payment = this.store.payments.get(paymentRow.id) ||
                {
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
                };
            return { payment, preview, duplicate: !!result.duplicate };
        }
        return this.store.withAccountLock(account.id, async () => {
            const key = input.idempotencyKey || `ref:${input.tenantId}:${input.reference}`;
            const existing = [...this.store.payments.values()].find((p) => p.tenantId === input.tenantId && (p.idempotencyKey === key || p.reference === input.reference));
            if (existing) {
                return {
                    payment: existing,
                    preview: this.previewPayment(input),
                    duplicate: true,
                };
            }
            const preview = this.previewPayment(input);
            const payment = {
                id: (0, crypto_1.randomUUID)(),
                tenantId: input.tenantId,
                billingAccountId: account.id,
                amountKobo: (0, tenant_billing_engine_1.assertKobo)(input.amountKobo, 'payment'),
                allocatedKobo: 0,
                unappliedKobo: 0,
                method: input.method,
                reference: input.reference,
                idempotencyKey: key,
                paymentDate: (0, tenant_billing_engine_1.utcDay)(input.paymentDate),
                notes: input.notes,
                status: 'PENDING',
                verification: (0, tenant_billing_engine_1.verificationFlag)(input.method),
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
            this.emit(tenant_billing_engine_1.BILLING_EVENTS.PAYMENT_POSTED, { paymentId: payment.id });
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
    confirmPayment(input) {
        const payment = this.store.payments.get(input.paymentId);
        if (!payment)
            throw new tenant_billing_engine_1.BillingInvariantError('payment not found');
        this.assertTenant(payment.tenantId, input.tenantId);
        if (payment.status === 'REVERSED')
            throw new tenant_billing_engine_1.BillingInvariantError('cannot confirm a reversed payment');
        if (payment.status === 'CONFIRMED')
            return payment;
        const obligationAllocations = input.obligationAllocations || [];
        (0, tenant_billing_engine_1.assertAllocationDoesNotExceedPayment)([...input.allocations, ...obligationAllocations], payment.amountKobo);
        let allocated = 0;
        for (const line of input.allocations) {
            const inst = this.store.installments.get(line.installmentId);
            if (!inst)
                throw new tenant_billing_engine_1.BillingInvariantError('installment not found');
            this.assertTenant(inst.tenantId, input.tenantId);
            if (inst.cancelled)
                throw new tenant_billing_engine_1.BillingInvariantError('cancelled installment cannot receive payment');
            const ob = this.store.obligations.get(inst.obligationId);
            if (ob.status === 'CANCELLED')
                throw new tenant_billing_engine_1.BillingInvariantError('cancelled obligation cannot receive payment');
            const next = (0, tenant_billing_engine_1.applyAllocationToPaid)(inst.paidKobo, inst.amountKobo, line.amountKobo);
            inst.paidKobo = next.paidKobo;
            inst.outstandingKobo = next.outstandingKobo;
            this.refreshInstallment(inst, input.now);
            this.store.allocations.push({
                id: (0, crypto_1.randomUUID)(),
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
            if (!ob)
                throw new tenant_billing_engine_1.BillingInvariantError('obligation not found');
            this.assertTenant(ob.tenantId, input.tenantId);
            if (ob.status === 'CANCELLED')
                throw new tenant_billing_engine_1.BillingInvariantError('cancelled obligation cannot receive payment');
            const nextPaid = ob.amountPaidKobo + line.amountKobo;
            if (nextPaid > ob.grossAmountKobo)
                throw new tenant_billing_engine_1.BillingInvariantError('allocation would overpay the obligation');
            ob.amountPaidKobo = nextPaid;
            ob.amountOutstandingKobo = ob.grossAmountKobo - nextPaid;
            this.refreshObligation(ob);
            this.store.allocations.push({
                id: (0, crypto_1.randomUUID)(),
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
        const account = this.store.accounts.get(payment.billingAccountId);
        account.unappliedCreditKobo += payment.unappliedKobo;
        this.audit(input.actor, 'CONFIRM_PAYMENT', input.tenantId, {
            paymentId: payment.id,
            amountKobo: payment.amountKobo,
            billingAccountId: account.id,
            newState: { allocated, unapplied: payment.unappliedKobo },
        });
        this.emit(tenant_billing_engine_1.BILLING_EVENTS.PAYMENT_CONFIRMED, { paymentId: payment.id });
        return payment;
    }
    reversePayment(input) {
        const remote = this.store;
        if (remote.reversePaymentAtomic) {
            throw new tenant_billing_engine_1.BillingInvariantError('use reversePaymentRemote for persistent store');
        }
        const payment = this.store.payments.get(input.paymentId);
        if (!payment)
            throw new tenant_billing_engine_1.BillingInvariantError('payment not found');
        this.assertTenant(payment.tenantId, input.tenantId);
        (0, tenant_billing_engine_1.assertCannotReverseTwice)(payment.reversalId);
        if (payment.status !== 'CONFIRMED' && payment.status !== 'PENDING') {
            throw new tenant_billing_engine_1.BillingInvariantError('only pending or confirmed payments can be reversed');
        }
        const reversalId = (0, crypto_1.randomUUID)();
        payment.reversalId = reversalId;
        const lines = this.store.allocations.filter((a) => a.paymentId === payment.id);
        for (const line of lines) {
            if (line.installmentId) {
                const inst = this.store.installments.get(line.installmentId);
                if (!inst)
                    continue;
                inst.paidKobo -= line.amountKobo;
                if (inst.paidKobo < 0)
                    throw new tenant_billing_engine_1.BillingInvariantError('reversal underflow');
                this.refreshInstallment(inst, input.now);
                const ob = this.store.obligations.get(inst.obligationId);
                this.refreshObligation(ob);
            }
            else if (line.obligationId) {
                const ob = this.store.obligations.get(line.obligationId);
                if (!ob)
                    continue;
                ob.amountPaidKobo -= line.amountKobo;
                if (ob.amountPaidKobo < 0)
                    throw new tenant_billing_engine_1.BillingInvariantError('reversal underflow');
                this.refreshObligation(ob);
            }
        }
        const account = this.store.accounts.get(payment.billingAccountId);
        account.unappliedCreditKobo -= payment.unappliedKobo;
        if (account.unappliedCreditKobo < 0)
            account.unappliedCreditKobo = 0;
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
        this.emit(tenant_billing_engine_1.BILLING_EVENTS.PAYMENT_REVERSED, { paymentId: payment.id, reversalId });
        return { payment, reversalId };
    }
    async reversePaymentRemote(input) {
        const remote = this.store;
        if (!remote.reversePaymentAtomic)
            return this.reversePayment(input);
        const result = await remote.reversePaymentAtomic({
            payment_id: input.paymentId,
            tenant_id: input.tenantId,
            reason: input.reason,
            actor: input.actor.email,
            actor_id: input.actor.id,
            actor_role: input.actor.role,
        });
        await this.store.hydrate();
        const payment = this.store.payments.get(input.paymentId);
        return { payment, reversalId: result.reversal_id };
    }
    cancelObligation(obligationId, tenantId, actor) {
        const ob = this.store.obligations.get(obligationId);
        if (!ob)
            throw new tenant_billing_engine_1.BillingInvariantError('obligation not found');
        this.assertTenant(ob.tenantId, tenantId);
        ob.status = 'CANCELLED';
        for (const inst of [...this.store.installments.values()].filter((i) => i.obligationId === ob.id)) {
            inst.cancelled = true;
            inst.status = 'CANCELLED';
        }
        this.audit(actor, 'CANCEL_OBLIGATION', tenantId, { obligationId });
        return ob;
    }
    overview(now) {
        const today = (0, tenant_billing_engine_1.utcDay)(now || new Date());
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
    tenantProfile(tenantId, now) {
        const obligations = [...this.store.obligations.values()].filter((o) => o.tenantId === tenantId);
        const installments = [...this.store.installments.values()].filter((i) => i.tenantId === tenantId);
        const payments = [...this.store.payments.values()].filter((p) => p.tenantId === tenantId);
        const today = (0, tenant_billing_engine_1.utcDay)(now || new Date());
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
    reports(kind, filters = {}) {
        const inst = [...this.store.installments.values()].filter((i) => !filters.tenantId || i.tenantId === filters.tenantId);
        const pays = [...this.store.payments.values()].filter((p) => !filters.tenantId || p.tenantId === filters.tenantId);
        if (kind === 'overdue')
            return inst.filter((i) => i.status === 'OVERDUE');
        if (kind === 'collections')
            return pays.filter((p) => p.status === 'CONFIRMED');
        if (kind === 'payments')
            return pays;
        if (kind === 'installments')
            return inst;
        if (kind === 'subscriptions')
            return [...this.store.subscriptions.values()];
        return [...this.store.obligations.values()].filter((o) => !filters.tenantId || o.tenantId === filters.tenantId);
    }
    lumpObligations(tenantId, obligationId, hasInstallments) {
        if (hasInstallments)
            return [];
        let rows = [...this.store.obligations.values()].filter((o) => o.tenantId === tenantId && o.status !== 'CANCELLED');
        if (obligationId)
            rows = rows.filter((o) => o.id === obligationId);
        return rows.filter((o) => o.amountOutstandingKobo > 0);
    }
    installmentsForScope(tenantId, obligationId, installmentId) {
        let rows = [...this.store.installments.values()].filter((i) => i.tenantId === tenantId);
        if (obligationId)
            rows = rows.filter((i) => i.obligationId === obligationId);
        if (installmentId) {
            rows = rows.filter((i) => i.id === installmentId);
            if (!rows.length) {
                const foreign = [...this.store.installments.values()].find((i) => i.id === installmentId);
                if (foreign)
                    throw new tenant_billing_engine_1.BillingInvariantError('tenant isolation violation', 'TENANT_ISOLATION');
                throw new tenant_billing_engine_1.BillingInvariantError('installment not found');
            }
        }
        if (obligationId) {
            const ob = this.store.obligations.get(obligationId);
            if (ob && ob.tenantId !== tenantId)
                throw new tenant_billing_engine_1.BillingInvariantError('tenant isolation violation', 'TENANT_ISOLATION');
            if (ob?.status === 'CANCELLED')
                throw new tenant_billing_engine_1.BillingInvariantError('cancelled obligation cannot receive payment');
        }
        return rows;
    }
    assertCanCreateDevicePlan(tenantId) {
        if (!tenantId)
            throw new tenant_billing_engine_1.BillingInvariantError('tenantId is required');
        const openObs = [...this.store.obligations.values()].filter((o) => o.tenantId === tenantId &&
            o.type === 'DEVICE_INSTALLMENT' &&
            o.status !== 'CANCELLED' &&
            o.status !== 'PAID' &&
            o.amountOutstandingKobo > 0);
        const openInst = [...this.store.installments.values()].filter((i) => i.tenantId === tenantId && !i.cancelled && i.outstandingKobo > 0);
        const pendingPay = [...this.store.payments.values()].filter((p) => p.tenantId === tenantId && p.status === 'PENDING');
        if (openObs.length || openInst.length || pendingPay.length) {
            throw new tenant_billing_engine_1.BillingInvariantError('This tenant already has an ongoing installment or pending payment. Finish, collect, or reverse it before creating another plan.', 'ONGOING_PLAN');
        }
    }
    assertTenant(actual, expected) {
        if (actual !== expected) {
            throw new tenant_billing_engine_1.BillingInvariantError('tenant isolation violation', 'TENANT_ISOLATION');
        }
    }
    audit(actor, action, tenantId, extra) {
        this.store.audit.push({
            id: (0, crypto_1.randomUUID)(),
            actorId: actor.id,
            actorRole: actor.role,
            action,
            tenantId,
            timestamp: nowIso(),
            ip: actor.ip,
            ...extra,
        });
    }
    emit(type, payload) {
        this.store.events.push({ id: (0, crypto_1.randomUUID)(), type, payload, at: nowIso(), delivered: false });
    }
}
exports.TenantBillingService = TenantBillingService;
//# sourceMappingURL=tenant-billing.service.js.map
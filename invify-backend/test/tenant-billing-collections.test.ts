import { nairaStringToKobo, computeInstallmentStatus, generateInstallmentSchedule } from '../src/modules/tenant-billing/tenant-billing.engine';
import { MemoryTenantBillingStore, TenantBillingService } from '../src/modules/tenant-billing/tenant-billing.service';
import { checkBillingPermission } from '../src/middleware/rbac.middleware';

const finance = { id: 'u1', email: 'finance@invify.app', role: 'admin_finance' };
const admin = { id: 'u0', email: 'super@invify.app', role: 'super_admin' };

function svc() {
  return new TenantBillingService(new MemoryTenantBillingStore());
}

async function runMw(permission: string, user: any) {
  const mw = checkBillingPermission(permission);
  const res: any = {
    statusCode: 200,
    body: null,
    status(c: number) { this.statusCode = c; return this; },
    json(b: any) { this.body = b; return this; },
  };
  let next = false;
  await mw({ user } as any, res, (() => { next = true; }) as any);
  return { next, res };
}

describe('Phase 33 tenant billing collections', () => {
  it('stores money as integer kobo from naira strings', () => {
    expect(nairaStringToKobo('300000')).toBe(30000000);
    expect(nairaStringToKobo('25.50')).toBe(2550);
    expect(() => nairaStringToKobo('1.234')).toThrow();
  });

  it('creates a billing account per tenant', () => {
    const s = svc();
    const a = s.ensureAccount('tenant-a');
    expect(s.ensureAccount('tenant-a').id).toBe(a.id);
    expect(a.unappliedCreditKobo).toBe(0);
  });

  it('creates a device obligation linked to a device id', () => {
    const s = svc();
    const ob = s.createObligation({
      tenantId: 't1',
      type: 'DEVICE_PURCHASE',
      description: 'Invify Box',
      grossAmountKobo: 30000000,
      dueDate: '2026-05-10',
      deviceId: 'dev-1',
      actor: finance,
    });
    expect(ob.deviceId).toBe('dev-1');
    expect(ob.amountOutstandingKobo).toBe(30000000);
  });

  it('generates an installment schedule that sums to remaining principal', () => {
    const rows = generateInstallmentSchedule({
      remainingKobo: 25000000,
      installmentKobo: 2500000,
      firstDueDate: '2026-05-10',
      now: '2026-04-01',
    });
    expect(rows).toHaveLength(10);
    expect(rows.reduce((n, r) => n + r.amountKobo, 0)).toBe(25000000);
    expect(rows[0].status).toBe('UPCOMING');
  });

  it('computes outstanding as integer subtraction', () => {
    const s = svc();
    const { obligation } = s.createDeviceInstallmentPlan({
      tenantId: 't1',
      deviceId: 'box-1',
      description: 'Box',
      purchasePriceKobo: 30000000,
      downPaymentKobo: 5000000,
      installmentKobo: 2500000,
      firstDueDate: '2026-05-10',
      actor: finance,
      now: '2026-04-01',
    });
    expect(obligation.amountOutstandingKobo).toBe(25000000);
  });

  it('applies a full installment payment', async () => {
    const s = svc();
    const plan = s.createDeviceInstallmentPlan({
      tenantId: 't1', deviceId: 'box-1', description: 'Box',
      purchasePriceKobo: 30000000, downPaymentKobo: 5000000, installmentKobo: 2500000,
      firstDueDate: '2026-05-10', actor: finance, now: '2026-05-10',
    });
    const first = plan.installments[0];
    await s.postPayment({
      tenantId: 't1', amountKobo: 2500000, method: 'BANK_TRANSFER',
      reference: 'FT-1', paymentDate: '2026-05-10', installmentId: first.id, actor: finance, now: '2026-05-10',
    });
    const inst = s.store.installments.get(first.id)!;
    expect(inst.status).toBe('PAID');
    expect(inst.outstandingKobo).toBe(0);
  });

  it('supports partial payments on the same installment', async () => {
    const s = svc();
    const plan = s.createDeviceInstallmentPlan({
      tenantId: 't1', deviceId: 'box-1', description: 'Box',
      purchasePriceKobo: 30000000, downPaymentKobo: 5000000, installmentKobo: 2500000,
      firstDueDate: '2026-05-10', actor: finance, now: '2026-05-10',
    });
    const first = plan.installments[0];
    await s.postPayment({
      tenantId: 't1', amountKobo: 1000000, method: 'BANK_TRANSFER',
      reference: 'P1', paymentDate: '2026-05-10', installmentId: first.id, actor: finance, now: '2026-05-10',
    });
    expect(s.store.installments.get(first.id)!.status).toBe('PARTIALLY_PAID');
    expect(s.store.installments.get(first.id)!.outstandingKobo).toBe(1500000);
    await s.postPayment({
      tenantId: 't1', amountKobo: 1500000, method: 'BANK_TRANSFER',
      reference: 'P2', paymentDate: '2026-05-10', installmentId: first.id, actor: finance, now: '2026-05-10',
    });
    expect(s.store.installments.get(first.id)!.status).toBe('PAID');
    expect(s.store.installments.get(first.id)!.outstandingKobo).toBe(0);
  });

  it('allocates one payment across two installments oldest-first', async () => {
    const s = svc();
    const plan = s.createDeviceInstallmentPlan({
      tenantId: 't1', deviceId: 'box-1', description: 'Box',
      purchasePriceKobo: 30000000, downPaymentKobo: 5000000, installmentKobo: 2500000,
      firstDueDate: '2026-05-10', actor: finance, now: '2026-06-10',
    });
    await s.postPayment({
      tenantId: 't1', amountKobo: 5000000, method: 'BANK_TRANSFER',
      reference: 'SPLIT', paymentDate: '2026-06-10', obligationId: plan.obligation.id, actor: finance, now: '2026-06-10',
    });
    expect(s.store.installments.get(plan.installments[0].id)!.status).toBe('PAID');
    expect(s.store.installments.get(plan.installments[1].id)!.status).toBe('PAID');
  });

  it('does not allocate to a future installment while overdue remains', async () => {
    const s = svc();
    const plan = s.createDeviceInstallmentPlan({
      tenantId: 't1', deviceId: 'box-1', description: 'Box',
      purchasePriceKobo: 30000000, downPaymentKobo: 5000000, installmentKobo: 2500000,
      firstDueDate: '2026-05-10', actor: finance, now: '2026-06-11',
    });
    const preview = s.previewPayment({
      tenantId: 't1', obligationId: plan.obligation.id, amountKobo: 2500000, now: '2026-06-11',
    });
    const ids = preview.proposedAllocations.map((a) => a.installmentId);
    expect(ids).toContain(plan.installments[0].id);
    expect(ids).not.toContain(plan.installments[2].id);
  });

  it('keeps overpayment as unapplied credit', async () => {
    const s = svc();
    s.createObligation({
      tenantId: 't1', type: 'SETUP_FEE', description: 'Setup',
      grossAmountKobo: 2500000, dueDate: '2026-05-10', actor: finance,
    });
    const { payment } = await s.postPayment({
      tenantId: 't1', amountKobo: 3000000, method: 'CASH',
      reference: 'OVER', paymentDate: '2026-05-10', actor: finance, now: '2026-05-10',
    });
    expect(payment.allocatedKobo).toBe(2500000);
    expect(payment.unappliedKobo).toBe(500000);
    expect([...s.store.accounts.values()][0].unappliedCreditKobo).toBe(500000);
  });

  it('reverses a confirmed payment once and restores balances', async () => {
    const s = svc();
    const ob = s.createObligation({
      tenantId: 't1', type: 'SETUP_FEE', description: 'Setup',
      grossAmountKobo: 2500000, dueDate: '2026-05-10', actor: finance,
    });
    const { payment } = await s.postPayment({
      tenantId: 't1', amountKobo: 2500000, method: 'CASH',
      reference: 'REV', paymentDate: '2026-05-10', actor: finance,
    });
    s.reversePayment({ paymentId: payment.id, tenantId: 't1', reason: 'bank reject', actor: admin });
    expect(s.store.obligations.get(ob.id)!.amountOutstandingKobo).toBe(2500000);
    expect(() => s.reversePayment({ paymentId: payment.id, tenantId: 't1', reason: 'again', actor: admin })).toThrow(/already reversed/);
  });

  it('is idempotent on duplicate payment reference', async () => {
    const s = svc();
    s.createObligation({
      tenantId: 't1', type: 'SETUP_FEE', description: 'Setup',
      grossAmountKobo: 2500000, dueDate: '2026-05-10', actor: finance,
    });
    const a = await s.postPayment({
      tenantId: 't1', amountKobo: 2500000, method: 'BANK_TRANSFER',
      reference: 'BANK-ABC-123', paymentDate: '2026-05-10', actor: finance,
    });
    const b = await s.postPayment({
      tenantId: 't1', amountKobo: 2500000, method: 'BANK_TRANSFER',
      reference: 'BANK-ABC-123', paymentDate: '2026-05-10', actor: finance,
    });
    expect(b.duplicate).toBe(true);
    expect(b.payment.id).toBe(a.payment.id);
    expect([...s.store.payments.values()]).toHaveLength(1);
  });

  it('rejects payment on a cancelled obligation', async () => {
    const s = svc();
    const ob = s.createObligation({
      tenantId: 't1', type: 'OTHER', description: 'X',
      grossAmountKobo: 100, dueDate: '2026-05-10', actor: finance,
    });
    s.cancelObligation(ob.id, 't1', admin);
    await expect(s.postPayment({
      tenantId: 't1', amountKobo: 100, method: 'CASH',
      reference: 'C1', paymentDate: '2026-05-10', obligationId: ob.id, actor: finance,
    })).rejects.toThrow(/cancelled obligation/);
  });

  it('marks installments overdue after the due date', () => {
    expect(computeInstallmentStatus({
      amountKobo: 2500000, paidKobo: 0, dueDate: '2026-05-10', now: '2026-05-11',
    })).toBe('OVERDUE');
    expect(computeInstallmentStatus({
      amountKobo: 2500000, paidKobo: 2500000, dueDate: '2026-05-10', now: '2026-05-11',
    })).toBe('PAID');
  });

  it('creates a subscription obligation without charging a wallet', () => {
    const s = svc();
    const { subscription, obligation } = s.createSubscription({
      tenantId: 't1', planName: 'Business Pro', amountKobo: 1000000,
      nextDue: '2026-10-15', actor: finance,
    });
    expect(subscription.status).toBe('ACTIVE');
    expect(obligation.type).toBe('SUBSCRIPTION');
    expect(s.store.events.some((e) => e.type === 'billing.subscription.due')).toBe(true);
  });

  it('links device financing to device id and serial metadata', () => {
    const s = svc();
    const { obligation } = s.createDeviceInstallmentPlan({
      tenantId: 't1', deviceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      description: 'INVIFY BOX', purchasePriceKobo: 30000000, downPaymentKobo: 5000000,
      installmentKobo: 2500000, firstDueDate: '2026-05-10', serialNumber: 'BOX-123456',
      actor: finance, now: '2026-04-01',
    });
    expect(obligation.deviceId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(obligation.metadata.serialNumber).toBe('BOX-123456');
  });

  it('blocks tenant operators from billing permissions', async () => {
    const denied = await runMw('billing.view', { role: 'tenant_admin' });
    expect(denied.next).toBe(false);
    expect(denied.res.statusCode).toBe(403);
    const financeOk = await runMw('billing.post_payment', { role: 'admin_finance' });
    expect(financeOk.next).toBe(true);
    const reverseDenied = await runMw('billing.reverse_payment', { role: 'admin_finance' });
    expect(reverseDenied.next).toBe(false);
    const reverseOk = await runMw('billing.reverse_payment', { role: 'super_admin' });
    expect(reverseOk.next).toBe(true);
  });

  it('records an audit trail for post and reverse', async () => {
    const s = svc();
    s.createObligation({
      tenantId: 't1', type: 'SETUP_FEE', description: 'Setup',
      grossAmountKobo: 100, dueDate: '2026-05-10', actor: finance,
    });
    const { payment } = await s.postPayment({
      tenantId: 't1', amountKobo: 100, method: 'CASH',
      reference: 'AUD', paymentDate: '2026-05-10', actor: finance,
    });
    s.reversePayment({ paymentId: payment.id, tenantId: 't1', reason: 'fix', actor: admin });
    expect(s.store.audit.map((a) => a.action)).toEqual(expect.arrayContaining(['POST_PAYMENT', 'CONFIRM_PAYMENT', 'REVERSE_PAYMENT']));
  });

  it('isolates tenants so payments cannot target another tenant installment', async () => {
    const s = svc();
    const a = s.createDeviceInstallmentPlan({
      tenantId: 't-a', deviceId: 'd1', description: 'A',
      purchasePriceKobo: 1000, downPaymentKobo: 0, installmentKobo: 1000,
      firstDueDate: '2026-05-10', actor: finance, now: '2026-05-10',
    });
    s.ensureAccount('t-b');
    await expect(s.postPayment({
      tenantId: 't-b', amountKobo: 1000, method: 'CASH',
      reference: 'X', paymentDate: '2026-05-10',
      installmentId: a.installments[0].id, actor: finance, now: '2026-05-10',
    })).rejects.toThrow(/tenant isolation/);
  });

  it('serializes concurrent posts so outstanding is never corrupted', async () => {
    const s = svc();
    const plan = s.createDeviceInstallmentPlan({
      tenantId: 't1', deviceId: 'box-1', description: 'Box',
      purchasePriceKobo: 30000000, downPaymentKobo: 5000000, installmentKobo: 2500000,
      firstDueDate: '2026-05-10', actor: finance, now: '2026-05-10',
    });
    const first = plan.installments[0];
    await Promise.all([
      s.postPayment({
        tenantId: 't1', amountKobo: 1000000, method: 'CASH',
        reference: 'C1', paymentDate: '2026-05-10', installmentId: first.id, actor: finance, now: '2026-05-10',
      }),
      s.postPayment({
        tenantId: 't1', amountKobo: 1500000, method: 'CASH',
        reference: 'C2', paymentDate: '2026-05-10', installmentId: first.id, actor: finance, now: '2026-05-10',
      }),
    ]);
    const inst = s.store.installments.get(first.id)!;
    expect(inst.paidKobo).toBe(2500000);
    expect(inst.outstandingKobo).toBe(0);
    expect(inst.status).toBe('PAID');
  });

  it('retries the same idempotency key without duplicating allocation', async () => {
    const s = svc();
    s.createObligation({
      tenantId: 't1', type: 'SETUP_FEE', description: 'Setup',
      grossAmountKobo: 2500000, dueDate: '2026-05-10', actor: finance,
    });
    const runs = [];
    for (let i = 0; i < 5; i++) {
      runs.push(s.postPayment({
        tenantId: 't1', amountKobo: 2500000, method: 'BANK_TRANSFER',
        reference: 'IDEM-5', paymentDate: '2026-05-10', actor: finance,
        idempotencyKey: 'idem-5',
      }));
    }
    const extra = await Promise.all(Array.from({ length: 10 }, (_, i) => s.postPayment({
      tenantId: 't1', amountKobo: 2500000, method: 'BANK_TRANSFER',
      reference: 'IDEM-5', paymentDate: '2026-05-10', actor: finance,
      idempotencyKey: 'idem-5',
    })));
    const first = await Promise.all(runs);
    const ids = new Set([...first, ...extra].map((r) => r.payment.id));
    expect(ids.size).toBe(1);
    expect([...s.store.payments.values()]).toHaveLength(1);
    expect([...s.store.accounts.values()][0].unappliedCreditKobo).toBe(0);
  });

  it('does not double-consume outstanding on two concurrent full payments', async () => {
    const s = svc();
    const plan = s.createDeviceInstallmentPlan({
      tenantId: 't1', deviceId: 'box-1', description: 'Box',
      purchasePriceKobo: 30000000, downPaymentKobo: 5000000, installmentKobo: 2500000,
      firstDueDate: '2026-05-10', actor: finance, now: '2026-05-10',
    });
    const first = plan.installments[0];
    const [a, b] = await Promise.all([
      s.postPayment({
        tenantId: 't1', amountKobo: 2500000, method: 'CASH',
        reference: 'FULL-A', paymentDate: '2026-05-10', installmentId: first.id, actor: finance, now: '2026-05-10',
      }),
      s.postPayment({
        tenantId: 't1', amountKobo: 2500000, method: 'CASH',
        reference: 'FULL-B', paymentDate: '2026-05-10', installmentId: first.id, actor: finance, now: '2026-05-10',
      }),
    ]);
    const inst = s.store.installments.get(first.id)!;
    expect(inst.outstandingKobo).toBe(0);
    expect(inst.paidKobo).toBe(2500000);
    expect(inst.status).toBe('PAID');
    const unapplied = a.payment.unappliedKobo + b.payment.unappliedKobo;
    const allocated = a.payment.allocatedKobo + b.payment.allocatedKobo;
    expect(allocated).toBe(2500000);
    expect(unapplied).toBe(2500000);
    expect([...s.store.accounts.values()][0].unappliedCreditKobo).toBe(2500000);
  });
});

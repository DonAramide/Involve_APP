/**
 * LABEL: in-memory FakeLedgerDb (not PostgreSQL).
 * These tests prove command/idempotency logic against the in-memory ledger
 * stand-in. They do not prove database isolation or concurrent RPC safety.
 */
import { FakeLedgerDb } from './helpers/fake-ledger-db';
import { randomUUID } from 'crypto';
import {
  collectionSummaryFromInvoices,
} from '../src/utils/invoice-collection-summary';
import { providerCreditIdempotencyKey, isStableCommandId } from '../src/services/collection-confirmation';
import { resolveAuthoritativeTenantId } from '../src/utils/finance-tenant';
import { isLiveFeePostingAllowed } from '../src/services/fee-live-gate';

let mockDb: FakeLedgerDb;

jest.mock('../src/db/supabase', () => ({
  get supabaseAdmin() {
    return mockDb;
  },
  get supabase() {
    return mockDb;
  },
}));
jest.mock('../src/services/audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../src/services/event.service', () => ({
  FinancialEventService: { emit: jest.fn().mockResolvedValue(undefined) },
}));

import { InvoicePaymentService } from '../src/services/invoice-payment.service';
import { FinancialCommandService } from '../src/services/financial-command.service';
import { ParentAllocateHandler } from '../src/services/sync-handlers/finance-command.handler';
import { LedgerService } from '../src/services/ledger.service';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const INVOICE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Phase 1 financial commands (in-memory FakeLedgerDb)', () => {
  beforeEach(() => {
    mockDb = new FakeLedgerDb();
    mockDb.seedWallet(TENANT_A, 0);
    mockDb.seedWallet(TENANT_B, 0);
    mockDb.tables.invoices = [
      {
        id: INVOICE_A,
        tenant_id: TENANT_A,
        total_amount: 100,
        amount_paid: 0,
        balance_amount: 100,
        payment_status: 'Unpaid',
        invoice_number: 'INV-1',
        payment_method: null,
        student_id: randomUUID(),
        business_mode: 'school',
      },
    ];
    process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
  });

  test('1. unconfirmed transfer does not increment amount_paid or school wallet', async () => {
    const before = mockDb.walletBalance(TENANT_A);
    const result = await InvoicePaymentService.apply(TENANT_A, INVOICE_A, {
      amount: 40,
      paymentMethod: 'Transfer',
      commandId: 'cmd-unconfirmed-transfer-01',
    });
    const invoice = mockDb.tables.invoices[0];
    expect(result.ack).toBe('accepted');
    expect(result.reason).toBe('pending_evidence');
    expect(invoice.amount_paid).toBe(0);
    expect(mockDb.walletBalance(TENANT_A)).toBe(before);
  });

  test('2. repeated invoice-payment requests cannot double-increment amount_paid', async () => {
    const key = 'cmd-cash-pay-idempotent-01';
    const first = await InvoicePaymentService.apply(TENANT_A, INVOICE_A, {
      amount: 25,
      paymentMethod: 'Cash',
      commandId: key,
    });
    const second = await InvoicePaymentService.apply(TENANT_A, INVOICE_A, {
      amount: 25,
      paymentMethod: 'Cash',
      commandId: key,
    });
    expect(first.ack).toBe('accepted');
    expect(first.amountPaid).toBe(25);
    expect(second.ack).toBe('duplicate');
    expect(mockDb.tables.invoices[0].amount_paid).toBe(25);
  });

  async function fundParent(amount: number, ref: string) {
    await FinancialCommandService.parentFund({
      tenantId: TENANT_A,
      commandId: `cmd-fund-${ref}`.padEnd(16, '0'),
      amount,
      method: 'VirtualAccount',
      providerReference: ref,
    });
  }

  test('3. parent allocation retries do not double-credit the tenant', async () => {
    await fundParent(50, 'va-fund-alloc-retry');
    const commandId = 'cmd-parent-allocate-retry-01';
    const first = await FinancialCommandService.parentAllocate({
      tenantId: TENANT_A,
      commandId,
      amount: 50,
      invoiceNumber: 'INV-PARENT-1',
      reference: commandId,
      paymentMethod: 'Parent Credit',
      payload: { businessMode: 'school' },
    });
    const second = await FinancialCommandService.parentAllocate({
      tenantId: TENANT_A,
      commandId,
      amount: 50,
      invoiceNumber: 'INV-PARENT-1',
      reference: commandId,
      paymentMethod: 'Parent Credit',
      payload: { businessMode: 'school' },
    });
    expect(first.ack).toBe('accepted');
    expect(second.ack).toBe('duplicate');
    expect(mockDb.walletBalance(TENANT_A)).toBe(50);
    expect(mockDb.tables.ledgers.filter((row) => String(row.idempotency_key).startsWith('alloc:'))).toHaveLength(1);
  });

  test('5. duplicate outbox delivery produces no duplicate ledger entry', async () => {
    await fundParent(30, 'va-fund-outbox-dup');
    const handler = new ParentAllocateHandler();
    const event = {
      eventId: 'evt-1',
      eventName: 'finance.parent_allocate',
      idempotencyKey: 'cmd-outbox-dup-allocate-01',
      aggregateId: 'agg-1',
      payload: {
        commandId: 'cmd-outbox-dup-allocate-01',
        amount: 30,
        invoiceNumber: 'INV-OUTBOX-1',
        reference: 'cmd-outbox-dup-allocate-01',
        paymentMethod: 'Parent Credit',
        businessMode: 'school',
      },
    } as any;
    await handler.handle(event, { tenantId: TENANT_A, deviceId: 'dev-1' });
    expect(event.ack).toBe('accepted');
    await handler.handle(event, { tenantId: TENANT_A, deviceId: 'dev-1' });
    expect(event.ack).toBe('duplicate');
    expect(mockDb.walletBalance(TENANT_A)).toBe(30);
    expect(mockDb.tables.ledgers.filter((row) => String(row.idempotency_key).startsWith('alloc:'))).toHaveLength(1);
  });

  test('6. Tenant A cannot pay or read Tenant B invoices', async () => {
    await expect(
      InvoicePaymentService.apply(TENANT_B, INVOICE_A, {
        amount: 10,
        paymentMethod: 'Cash',
        commandId: 'cmd-cross-tenant-pay-0001',
      }),
    ).rejects.toThrow(/Invoice not found/);
    const req = {
      user: { tenantId: TENANT_A, role: 'owner' },
      headers: { 'x-tenant-id': TENANT_B },
      body: { tenantId: TENANT_B },
      query: { tenantId: TENANT_B },
    } as any;
    expect(resolveAuthoritativeTenantId(req)).toBe(TENANT_A);
  });

  test('7. timestamp-only command ids are rejected; stable keys retry as duplicates', async () => {
    expect(isStableCommandId(String(Date.now()))).toBe(false);
    expect(isStableCommandId('cmd-stable-retry-key-01')).toBe(true);
    const rejected = await FinancialCommandService.parentFund({
      tenantId: TENANT_A,
      commandId: String(Date.now()),
      amount: 10,
      method: 'Cash',
    });
    expect(rejected.ack).toBe('rejected');
    const key = 'cmd-offline-pending-same-01';
    const first = await FinancialCommandService.parentFund({
      tenantId: TENANT_A,
      commandId: key,
      amount: 12,
      method: 'Cash',
    });
    const retry = await FinancialCommandService.parentFund({
      tenantId: TENANT_A,
      commandId: key,
      amount: 12,
      method: 'Cash',
    });
    expect(first.ack).toBe('accepted');
    expect(retry.ack).toBe('duplicate');
  });

  test('8. Invoice History and Tenant Admin share collectionSummaryFromInvoices', () => {
    const invoices = [
      { invoice_number: 'INV-1', total_amount: 100, amount_paid: 40, payment_status: 'Partial', payment_method: 'Cash' },
      { invoice_number: 'INV-2', total_amount: 50, amount_paid: 50, payment_status: 'Paid', payment_method: 'POS' },
      { invoice_number: 'INV-3', total_amount: 20, amount_paid: 20, payment_status: 'Paid', payment_method: 'Transfer' },
      { invoice_number: 'INV-4', total_amount: 15, amount_paid: 15, payment_status: 'Paid', payment_method: 'Parent Credit' },
    ];
    const summary = collectionSummaryFromInvoices(invoices, { start: '2026-10-01', end: '2026-10-20' });
    expect(summary.timezone).toBe('Africa/Lagos');
    expect(summary.invoiced).toBe(185);
    expect(summary.recordedCollected).toBe(125);
    expect(summary.rails.cash).toBe(40);
    expect(summary.rails.card).toBe(50);
    expect(summary.rails.bankTransfer).toBe(20);
    expect(summary.rails.wallet).toBe(15);
    expect(summary.settledFundsNote).toMatch(/recordedCollected is confirmed invoice receipts/);
  });

  test('9. provider-confirmed VA credits stay idempotent across webhook and polling keys', async () => {
    const ref = 'va-ref-abc';
    const key = providerCreditIdempotencyKey(ref);
    expect(key).toBe('quasar:va-ref-abc:credit');
    await LedgerService.createDoubleEntry({
      idempotencyKey: key,
      tenantId: TENANT_A,
      reference: ref,
      entries: [
        { account: 'EXTERNAL_BANK', type: 'DEBIT', amount: 80 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 80 },
      ],
    });
    const again = await LedgerService.createDoubleEntry({
      idempotencyKey: `quasar:${ref}:credit`,
      tenantId: TENANT_A,
      reference: ref,
      entries: [
        { account: 'EXTERNAL_BANK', type: 'DEBIT', amount: 80 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 80 },
      ],
    });
    expect(again.status).toBe('DE-DUPLICATED');
    expect(mockDb.walletBalance(TENANT_A)).toBe(80);
    expect(mockDb.tables.ledgers).toHaveLength(1);
  });

  test('10. payout and fee-orchestration safety gates remain disabled', () => {
    expect(process.env.FEATURE_REAL_MONEY_PAYOUTS).toBe('false');
    expect(process.env.FEE_ORCHESTRATION_LIVE).toBe('false');
    expect(isLiveFeePostingAllowed()).toBe(false);
  });

  test('parent-credit allocation de-duplication does not increment amount_paid', async () => {
    await fundParent(10, 'va-fund-before-inv-pay');
    await FinancialCommandService.parentAllocate({
      tenantId: TENANT_A,
      commandId: 'cmd-parent-alloc-before-pay',
      amount: 10,
      invoiceNumber: 'INV-1',
      reference: 'cmd-parent-alloc-before-pay',
      paymentMethod: 'Parent Credit',
      payload: { businessMode: 'school' },
    });
    const result = await InvoicePaymentService.apply(TENANT_A, INVOICE_A, {
      amount: 10,
      paymentMethod: 'Parent Credit',
      commandId: 'cmd-parent-pay-after-alloc',
    });
    expect(result.ack).toBe('duplicate');
    expect(mockDb.tables.invoices[0].amount_paid).toBe(0);
    expect(mockDb.walletBalance(TENANT_A)).toBe(10);
  });
});

/**
 * LABEL: in-memory FakeLedgerDb. Not PostgreSQL concurrency evidence.
 */
import { FakeLedgerDb } from './helpers/fake-ledger-db';
import { randomUUID } from 'crypto';

let mockDb: FakeLedgerDb;
jest.mock('../src/db/supabase', () => ({
  get supabaseAdmin() {
    return mockDb;
  },
  get supabase() {
    return mockDb;
  },
}));

import { InvoicePaymentService } from '../src/services/invoice-payment.service';
import { FinancialCommandService } from '../src/services/financial-command.service';
import { LedgerService } from '../src/services/ledger.service';
import { collectionSummaryFromInvoices } from '../src/utils/invoice-collection-summary';
import { providerCreditIdempotencyKey } from '../src/services/collection-confirmation';

const TENANT = '11111111-1111-4111-8111-111111111111';
const INVOICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Phase 2 crash recovery (in-memory)', () => {
  beforeEach(() => {
    mockDb = new FakeLedgerDb();
    mockDb.seedWallet(TENANT, 0);
    mockDb.tables.invoices = [
      {
        id: INVOICE,
        tenant_id: TENANT,
        total_amount: 100,
        amount_paid: 0,
        balance_amount: 100,
        payment_status: 'Unpaid',
        invoice_number: 'INV-1',
        payment_method: 'POS',
        student_id: randomUUID(),
        business_mode: 'school',
      },
    ];
    process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
  });

  test('timeout replay after ledger post does not double-credit or double amount_paid', async () => {
    const commandId = 'cmd-crash-resume-pay-0001';
    const provider = 'pos-ref-1';
    await LedgerService.createDoubleEntry({
      idempotencyKey: providerCreditIdempotencyKey(provider),
      tenantId: TENANT,
      reference: provider,
      entries: [
        { account: 'EXTERNAL_BANK', type: 'DEBIT', amount: 40 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 40 },
      ],
    });
    const claimed = await FinancialCommandService.claim(TENANT, commandId, {
      kind: 'invoice_pay',
      invoiceId: INVOICE,
      confirmation: 'settled',
      amount: 40,
      expectedPaid: 40,
      method: 'POS',
      providerReference: provider,
      finalized: false,
    });
    expect(claimed.ack).toBe('accepted');
    const resumed = await InvoicePaymentService.apply(TENANT, INVOICE, {
      amount: 40,
      paymentMethod: 'POS',
      commandId,
      providerReference: provider,
    });
    expect(['accepted', 'duplicate']).toContain(resumed.ack);
    expect(mockDb.tables.invoices[0].amount_paid).toBe(40);
    const replay = await InvoicePaymentService.apply(TENANT, INVOICE, {
      amount: 40,
      paymentMethod: 'POS',
      commandId,
      providerReference: provider,
    });
    expect(replay.ack).toBe('duplicate');
    expect(mockDb.tables.invoices[0].amount_paid).toBe(40);
    expect(mockDb.walletBalance(TENANT)).toBe(40);
    expect(mockDb.tables.ledgers).toHaveLength(1);
  });

  test('unfinalized settled commands are discoverable', async () => {
    await FinancialCommandService.claim(TENANT, 'cmd-unfinalized-visible01', {
      kind: 'invoice_pay',
      invoiceId: INVOICE,
      confirmation: 'settled',
      amount: 10,
      expectedPaid: 10,
      finalized: false,
    });
    const open = await FinancialCommandService.listUnfinalized(TENANT);
    expect(open.length).toBeGreaterThan(0);
  });

  test('second allocation beyond parent liability is rejected', async () => {
    await FinancialCommandService.parentFund({
      tenantId: TENANT,
      commandId: 'cmd-fund-liability-50xx',
      amount: 50,
      method: 'VirtualAccount',
      providerReference: 'va-liability-50',
    });
    const first = await FinancialCommandService.parentAllocate({
      tenantId: TENANT,
      commandId: 'cmd-alloc-first-40xxxx',
      amount: 40,
      invoiceNumber: 'INV-A',
      paymentMethod: 'Parent Credit',
      payload: { businessMode: 'school' },
    });
    const second = await FinancialCommandService.parentAllocate({
      tenantId: TENANT,
      commandId: 'cmd-alloc-second-40xxx',
      amount: 40,
      invoiceNumber: 'INV-B',
      paymentMethod: 'Parent Credit',
      payload: { businessMode: 'school' },
    });
    expect(first.ack).toBe('accepted');
    expect(second.ack).toBe('rejected');
    expect(second.reason).toBe('insufficient_parent_credit');
    expect(mockDb.walletBalance(TENANT)).toBe(40);
  });
});

describe('Phase 2 cross-surface rails (deterministic fixtures)', () => {
  test('pending transfer is invoiced but not recorded collected or settled', () => {
    const summary = collectionSummaryFromInvoices([
      { invoice_number: 'INV-T', total_amount: 100, amount_paid: 100, payment_status: 'Pending', payment_method: 'Transfer' },
    ]);
    expect(summary.invoiced).toBe(100);
    expect(summary.recordedCollected).toBe(0);
    expect(summary.pending).toBe(100);
    expect(summary.rails.bankTransfer).toBe(0);
  });

  test('confirmed VA, cash, POS and parent-credit rails stay distinct', () => {
    const summary = collectionSummaryFromInvoices([
      { invoice_number: 'INV-VA', total_amount: 20, amount_paid: 20, payment_status: 'Paid', payment_method: 'VirtualAccount' },
      { invoice_number: 'INV-CASH', total_amount: 15, amount_paid: 15, payment_status: 'Paid', payment_method: 'Cash' },
      { invoice_number: 'INV-POS', total_amount: 30, amount_paid: 30, payment_status: 'Paid', payment_method: 'POS' },
      { invoice_number: 'INV-PC', total_amount: 10, amount_paid: 10, payment_status: 'Paid', payment_method: 'Parent Credit' },
    ]);
    expect(summary.invoiced).toBe(75);
    expect(summary.recordedCollected).toBe(75);
    expect(summary.rails.vaTransfer).toBe(20);
    expect(summary.rails.cash).toBe(15);
    expect(summary.rails.card).toBe(30);
    expect(summary.rails.wallet).toBe(10);
    expect(summary.settledFundsNote).toMatch(/Cash and own-bank transfer are not Invify-settled/);
  });
});

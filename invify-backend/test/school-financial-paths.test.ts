import { FakeLedgerDb } from './helpers/fake-ledger-db';
import { parentAllocationLedgerEntries, parentDepositLedgerEntries } from '../src/services/school-fund-ownership';

let mockDb: FakeLedgerDb;
let settleable = 0;

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
jest.mock('../src/services/notification.service', () => ({
  NotificationService: {
    notifySchoolAdminOfPayoutSuccess: jest.fn(),
    notifySchoolAdminOfPayoutFailure: jest.fn(),
    notifySchoolAdminOfPayment: jest.fn(),
  },
}));
jest.mock('../src/integrations/quasar/factory', () => ({
  getQuasarService: jest.fn(async () => ({ initiateTransfer: jest.fn() })),
}));
jest.mock('../src/services/tenant-alert.service', () => ({
  TenantAlertService: { notifyWithdrawal: jest.fn() },
}));
jest.mock('../src/app', () => ({ io: null }));
jest.mock('../src/services/quasar-withdrawable.service', () => ({
  QuasarWithdrawableService: {
    available: jest.fn(async () => settleable),
  },
}));

import { PaymentService } from '../src/services/payment.service';
import { LedgerService } from '../src/services/ledger.service';
import { CustomerController } from '../src/controllers/customer.controller';
import { ParentAllocationService } from '../src/services/parent-allocation.service';
import { postSyncedCreditToWallet } from '../src/services/payment-alert-quasar-sync';

const TENANT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function sweepRequest(accountNumber: string, amount: number) {
  return {
    params: { accountNumber },
    body: { amount },
    query: {},
    headers: {},
    user: { tenantId: TENANT, role: 'admin' },
  } as any;
}

function response() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

beforeEach(() => {
  mockDb = new FakeLedgerDb();
  settleable = 0;
  mockDb.seedWallet(TENANT, 0);
  mockDb.tables.payout_settings = [
    { tenant_id: TENANT, account_number: '0123456789', bank_code: '058', account_name: 'Test School' },
  ];
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('prepared school financial paths', () => {
  test('a parent deposit and a partial allocation do not invent the remainder', async () => {
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'quasar:PAR-140:credit',
      tenantId: TENANT,
      reference: 'PAR-140',
      entries: parentDepositLedgerEntries(140),
      provider: 'quasar',
    });
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'alloc:PAR-140:40',
      tenantId: TENANT,
      reference: 'PAR-140',
      entries: parentAllocationLedgerEntries(40),
      provider: 'quasar',
    });

    expect(mockDb.accountBalance(TENANT, 'USER_WALLET')).toBe(40);
    expect(mockDb.accountBalance(TENANT, 'PARENT_LIABILITY')).toBe(100);
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(40);
  });

  test('a low settlement pool does not manufacture a wallet credit', async () => {
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'opening',
      tenantId: TENANT,
      reference: 'opening',
      entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100 },
      ],
    });
    settleable = 10;
    await expect(
      PaymentService.createPayout(TENANT, 50, { metadata: { quasarCap: true } }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(100);
    expect(mockDb.rpcCalls.some((call) => call.fn === 'reserve_school_withdrawal')).toBe(false);
    expect(mockDb.rpcCalls.some((call) => call.fn === 'request_treasury_withdrawal_with_fee')).toBe(false);
  });

  test('staff salary cannot spend a parent-tagged wallet credit', async () => {
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'opening-staff',
      tenantId: TENANT,
      reference: 'opening-staff',
      entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100 },
      ],
    });
    mockDb.tables.transactions_log.push({
      id: 'parent-credit',
      tenant_id: TENANT,
      amount: 80,
      type: 'CREDIT',
      status: 'SUCCESS',
      metadata: { paidVia: 'parent_account' },
    });
    await expect(
      PaymentService.createPayout(TENANT, 50, {
        metadata: { type: 'staff_salary' },
        destination: { account_number: '1111222233', bank_code: '090267', account_name: 'Teacher' },
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(100);
  });

  test('an unknown virtual account sweep does not credit USER_WALLET', async () => {
    const res = response();
    await CustomerController.sweepVirtualAccountFunds(sweepRequest('5555666677', 15), res);
    expect(res.statusCode).toBe(409);
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(0);
  });

  test('a parent virtual account sweep does not post a school credit', async () => {
    mockDb.tables.school_entities = [
      {
        id: 'parent-1',
        tenant_id: TENANT,
        entity_type: 'parent',
        payload: { virtualAccountNumber: '9988776655' },
      },
    ];
    mockDb.tables.wallets[0].balance = 20;
    const res = response();
    await CustomerController.sweepVirtualAccountFunds(sweepRequest('9988776655', 15), res);
    expect(res.statusCode).toBe(409);
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(0);
    expect(mockDb.walletBalance(TENANT)).toBe(20);
  });

  test('a school sweep posts once and a repeat does not add another credit', async () => {
    mockDb.tables.school_entities = [
      {
        id: 'school-va',
        tenant_id: TENANT,
        entity_type: 'quasar_virtual_account',
        payload: { accountNumber: '1234567890' },
      },
    ];
    const res1 = response();
    const req = sweepRequest('1234567890', 25);
    await CustomerController.sweepVirtualAccountFunds(req, res1);
    const res2 = response();
    await CustomerController.sweepVirtualAccountFunds(req, res2);
    expect(res1.statusCode).toBe(200);
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(25);
    expect(mockDb.tables.ledgers.filter((row) => String(row.idempotency_key).startsWith('sweep-va:')).length).toBe(1);
  });

  test('duplicate and concurrent ledger posts keep one credit', async () => {
    const post = () =>
      LedgerService.createDoubleEntry({
        idempotencyKey: 'quasar:CARD-1:credit',
        tenantId: TENANT,
        reference: 'CARD-1',
        entries: [
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 30 },
          { account: 'USER_WALLET', type: 'CREDIT', amount: 30 },
        ],
      });
    const [first, second] = await Promise.all([post(), post()]);
    expect([first.status, second.status].sort()).toEqual(['CREATED', 'DE-DUPLICATED']);
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(30);
  });

  test('concurrent reservations cannot consume the same pool twice', async () => {
    mockDb.tables.wallets[0].balance = 100;
    const reserve = (key: string) =>
      (PaymentService as any).reserveSchoolWithdrawal(TENANT, key, 60);
    const results = await Promise.allSettled([reserve('payout:a'), reserve('payout:b')]);
    const reserved = results.filter((result) => result.status === 'fulfilled').length;
    const rejected = results.filter((result) => result.status === 'rejected').length;
    expect(reserved).toBe(1);
    expect(rejected).toBe(1);
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(0);
  });

  test('a reversal posts the opposite pair and leaves the original row unchanged', async () => {
    const posted = await LedgerService.createDoubleEntry({
      idempotencyKey: 'quasar:CARD-2:credit',
      tenantId: TENANT,
      reference: 'CARD-2',
      entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 30 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 30 },
      ],
    });
    const original = mockDb.tables.ledger_entries.find((row) => row.ledger_id === (posted as any).data.ledger_id && row.account === 'USER_WALLET');
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'quasar:CARD-2:reversal',
      tenantId: TENANT,
      reference: 'CARD-2',
      entries: [
        { account: 'USER_WALLET', type: 'DEBIT', amount: 30 },
        { account: 'QUASAR_CLEARING', type: 'CREDIT', amount: 30 },
      ],
    });
    expect(original?.amount).toBe(30);
    expect(original?.type).toBe('CREDIT');
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(0);
  });

  test('one tenant posting does not change another tenant ledger', async () => {
    mockDb.seedWallet(OTHER, 0);
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'tenant-a',
      tenantId: TENANT,
      reference: 'A',
      entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 12 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 12 },
      ],
    });
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(12);
    expect(mockDb.ledgerUserWallet(OTHER)).toBe(0);
  });

  test('a later posting does not rewrite a historical ledger row', async () => {
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'historical',
      tenantId: TENANT,
      reference: 'OLD',
      entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 7 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 7 },
      ],
    });
    const historical = { ...mockDb.tables.ledger_entries.find((row) => row.account === 'USER_WALLET') };
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'later',
      tenantId: TENANT,
      reference: 'NEW',
      entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 1 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 1 },
      ],
    });
    const still = mockDb.tables.ledger_entries.find((row) => row.id === historical.id);
    expect(still).toMatchObject({ amount: 7, type: 'CREDIT', account: 'USER_WALLET' });
  });

  test('a school withdrawal is blocked when the settleable pool exceeds proven school funds', async () => {
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'mixed-wallet',
      tenantId: TENANT,
      reference: 'mixed-wallet',
      entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100 },
      ],
    });
    mockDb.tables.transactions_log.push({
      tenant_id: TENANT,
      amount: 90,
      type: 'CREDIT',
      status: 'SUCCESS',
      metadata: { paidVia: 'parent_account' },
    });
    settleable = 80;
    await expect(
      PaymentService.createPayout(TENANT, 50, { metadata: { quasarCap: true } }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(100);
  });

  test('parent-owned sync does not credit USER_WALLET', async () => {
    mockDb.tables.school_entities = [
      {
        tenant_id: TENANT,
        entity_type: 'parent_virtual_account',
        payload: { accountNumber: '8877665544' },
      },
    ];
    const result = await postSyncedCreditToWallet(TENANT, 'SYNC-1', 40, '8877665544');
    expect(result.posted).toBe(false);
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(0);
  });

  test('new parent allocation credits once and refuses historical backfill', async () => {
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'quasar:PAR-NEW:credit',
      tenantId: TENANT,
      reference: 'PAR-NEW',
      entries: parentDepositLedgerEntries(80),
    });
    const first = await ParentAllocationService.creditSchoolOnce({
      tenantId: TENANT,
      invoiceNumber: 'INV-NEW',
      paymentMethod: 'Parent Credit',
      amountNaira: 30,
    });
    const replay = await ParentAllocationService.creditSchoolOnce({
      tenantId: TENANT,
      invoiceNumber: 'INV-NEW',
      paymentMethod: 'Parent Credit',
      amountNaira: 30,
    });
    const backfill = await ParentAllocationService.creditSchoolOnce({
      tenantId: TENANT,
      invoiceNumber: 'INV-OLD',
      paymentMethod: 'Parent Credit',
      amountNaira: 30,
      historicalBackfill: true,
    });
    expect(first.status).toBe('CREATED');
    expect(replay.status).toBe('DE-DUPLICATED');
    expect(backfill.status).toBe('SKIPPED');
    expect(mockDb.ledgerUserWallet(TENANT)).toBe(30);
    expect(mockDb.accountBalance(TENANT, 'PARENT_LIABILITY')).toBe(50);
  });

  test('Wallet+school uses the same allocation path as Parent Credit', async () => {
    await LedgerService.createDoubleEntry({
      idempotencyKey: 'quasar:PAR-WALLET:credit',
      tenantId: TENANT,
      reference: 'PAR-WALLET',
      entries: parentDepositLedgerEntries(80),
    });
    const posted = await ParentAllocationService.creditSchoolOnce({
      tenantId: TENANT,
      invoiceNumber: 'INV-WALLET-SCHOOL',
      paymentMethod: 'Wallet',
      businessMode: 'school',
      amountNaira: 20,
    });
    const cash = await ParentAllocationService.creditSchoolOnce({
      tenantId: TENANT,
      invoiceNumber: 'INV-CASH',
      paymentMethod: 'Cash',
      businessMode: 'school',
      amountNaira: 20,
    });
    expect(posted.status).toBe('CREATED');
    expect(cash.status).toBe('SKIPPED');
    expect(cash.reason).toBe('not_parent_wallet');
  });
});

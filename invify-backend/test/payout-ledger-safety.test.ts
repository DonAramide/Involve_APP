import { FakeLedgerDb } from './helpers/fake-ledger-db';

let mockDb: FakeLedgerDb;
const mockAuditLog = jest.fn();
const mockInitiateTransfer = jest.fn();

jest.mock('../src/db/supabase', () => ({
  get supabaseAdmin() {
    return mockDb;
  },
  get supabase() {
    return mockDb;
  },
}));
jest.mock('../src/services/audit.service', () => ({
  AuditService: { log: (...args: any[]) => mockAuditLog(...args) },
}));
jest.mock('../src/services/event.service', () => ({
  FinancialEventService: { emit: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../src/services/notification.service', () => ({
  NotificationService: {
    notifySchoolAdminOfPayoutSuccess: jest.fn().mockResolvedValue(undefined),
    notifySchoolAdminOfPayoutFailure: jest.fn().mockResolvedValue(undefined),
    notifySchoolAdminOfPayment: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../src/services/wallet.service', () => ({
  WalletService: {
    ensureWallet: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
    getBalance: jest.fn(async (tid: string) => ({
      tenantId: tid,
      balance: mockDb.walletBalance(tid),
      currency: 'NGN',
    })),
  },
}));
jest.mock('../src/integrations/quasar/factory', () => ({
  getQuasarService: jest.fn(async () => ({ initiateTransfer: (...a: any[]) => mockInitiateTransfer(...a) })),
}));
jest.mock('../src/services/tenant-alert.service', () => ({
  TenantAlertService: { notifyWithdrawal: jest.fn() },
}));
jest.mock('../src/app', () => ({ io: null }));

import { FeatureGateService } from '../src/config/build-variant';
import { PaymentService } from '../src/services/payment.service';
import { WebhookController } from '../src/controllers/webhook.controller';
import {
  isDefinitiveTransferRejection,
  payoutReversalIdempotencyKey,
  PayoutReversalService,
} from '../src/services/payout-reversal.service';

const TENANT = '11111111-1111-4111-8111-111111111111';
const START = 1_000_000;
const PAYOUT = 250_000;

const handleFailure = (reference: string, priorStatus: string | null, data: Record<string, unknown> = {}) =>
  (WebhookController as any)._handleFailure(TENANT, 'wallet-1', reference, { event: 'transfer.failed', data }, 'payout', priorStatus);
const handleSuccess = (reference: string, priorStatus: string | null, amount = PAYOUT) =>
  (WebhookController as any)._handleSuccess(
    TENANT,
    'wallet-1',
    reference,
    amount,
    `quasar:${reference}:credit`,
    { event: 'transfer.success', data: {} },
    'payout',
    priorStatus,
  );

function httpError(status: number, message = `HTTP ${status}`) {
  return Object.assign(new Error(message), { response: { status } });
}

function txStatus(reference: string) {
  return mockDb.tables.transactions_log.find((t) => t.reference === reference)?.status;
}

function reversalLedgers(reference: string) {
  return mockDb.tables.ledgers.filter((l) => l.idempotency_key === payoutReversalIdempotencyKey(TENANT, reference));
}

function assertLedgerConsistent() {
  expect(mockDb.walletBalance(TENANT)).toBe(mockDb.ledgerUserWallet(TENANT));
  const debits = mockDb.tables.ledger_entries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
  const credits = mockDb.tables.ledger_entries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
  expect(debits).toBe(credits);
  expect(mockDb.tables.ledger_entries.some((e) => e.account === 'SCHOOL_WALLET')).toBe(false);
}

/** Initiation succeeded at Quasar; returns the payout reference. */
async function initiatePendingPayout(idempotencyKey?: string): Promise<string> {
  mockInitiateTransfer.mockResolvedValueOnce({ reference: 'QSR-1', status: 'PENDING' });
  const res: any = await PaymentService.createPayout(TENANT, PAYOUT, idempotencyKey ? { idempotencyKey } : undefined);
  return res.reference;
}

beforeEach(() => {
  mockDb = new FakeLedgerDb();
  // Pre-funded wallet: an opening ledger keeps projection == ledger.
  mockDb.seedWallet(TENANT, 0);
  mockDb.tables.payout_settings = [
    { tenant_id: TENANT, account_number: '0123456789', bank_code: '058', account_name: 'Test School' },
  ];
  void mockDb.rpc('process_ledger_double_entry', {
    p_tenant_id: TENANT,
    p_idempotency_key: 'opening',
    p_reference: 'opening',
    p_entries: [
      { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: START },
      { account: 'USER_WALLET', type: 'CREDIT', amount: START },
    ],
    p_metadata: {},
  });
  mockAuditLog.mockReset().mockResolvedValue(undefined);
  mockInitiateTransfer.mockReset();
  jest.spyOn(FeatureGateService, 'isFeatureEnabled').mockImplementation((f: any) => f === 'real_money_payouts');
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('transfer rejection classification', () => {
  it.each([
    ['HTTP 400', () => httpError(400), true],
    ['HTTP 422', () => httpError(422), true],
    ['HTTP 401', () => httpError(401), true],
    ['HTTP 408', () => httpError(408), false],
    ['HTTP 409', () => httpError(409), false],
    ['HTTP 429', () => httpError(429), false],
    ['HTTP 500', () => httpError(500), false],
    ['HTTP 503', () => httpError(503), false],
    ['socket hang up', () => new Error('socket hang up'), false],
    ['ETIMEDOUT', () => Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }), false],
    ['statusCode 400', () => ({ statusCode: 400 }), true],
    ['QuasarApiError responseCode 400', () => ({ responseCode: '400', message: 'property destination should not exist' }), true],
    ['Quasar responseCode 99', () => ({ responseCode: '99' }), false],
  ])('%s → definitive=%s', (_label, makeErr, expected) => {
    expect(isDefinitiveTransferRejection(makeErr())).toBe(expected);
  });
});

describe('H1 synchronous payout failure', () => {
  it('definitive Quasar rejection restores the wallet exactly once and records FAILED', async () => {
    mockInitiateTransfer.mockRejectedValueOnce(httpError(400, 'invalid account'));
    await expect(PaymentService.createPayout(TENANT, PAYOUT)).rejects.toThrow('Failed to initiate transfer');

    expect(mockDb.walletBalance(TENANT)).toBe(START);
    const failed = mockDb.tables.transactions_log.find((t) => t.type === 'payout')!;
    expect(failed.status).toBe('FAILED');
    expect(failed.metadata.reversal_status).toBe('REVERSED');
    expect(reversalLedgers(failed.reference)).toHaveLength(1);
    expect(mockDb.accountBalance(TENANT, 'EXTERNAL_BANK')).toBe(0);
    assertLedgerConsistent();
  });

  it('ambiguous failure (timeout) keeps funds reserved and flags reconciliation instead of reversing', async () => {
    mockInitiateTransfer.mockRejectedValueOnce(Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }));
    await expect(PaymentService.createPayout(TENANT, PAYOUT)).rejects.toThrow('Failed to initiate transfer');

    expect(mockDb.walletBalance(TENANT)).toBe(START - PAYOUT);
    const pending = mockDb.tables.transactions_log.find((t) => t.type === 'payout')!;
    expect(pending.status).toBe('PENDING');
    expect(pending.metadata.reconciliation_required).toBe(true);
    expect(reversalLedgers(pending.reference)).toHaveLength(0);
    expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'payout.reconciliation_required' }));

    // Provider later confirms failure → webhook restores funds.
    await handleFailure(pending.reference, 'PENDING');
    expect(mockDb.walletBalance(TENANT)).toBe(START);
    expect(reversalLedgers(pending.reference)).toHaveLength(1);
    assertLedgerConsistent();
  });

  it('client retry with the same idempotency key never starts a second transfer', async () => {
    const first = await initiatePendingPayout('client-key-1');
    const replay: any = await PaymentService.createPayout(TENANT, PAYOUT, { idempotencyKey: 'client-key-1' });

    expect(replay.idempotentReplay).toBe(true);
    expect(replay.reference).toBe(first);
    expect(mockInitiateTransfer).toHaveBeenCalledTimes(1);
    expect(mockDb.walletBalance(TENANT)).toBe(START - PAYOUT);
    assertLedgerConsistent();
  });
});

describe('H1 async payout.failed webhook', () => {
  it('restores the original debit', async () => {
    const ref = await initiatePendingPayout();
    expect(mockDb.walletBalance(TENANT)).toBe(START - PAYOUT);

    await handleFailure(ref, 'PENDING');
    expect(mockDb.walletBalance(TENANT)).toBe(START);
    expect(txStatus(ref)).toBe('FAILED');
    expect(reversalLedgers(ref)).toHaveLength(1);
    assertLedgerConsistent();
  });

  it('duplicate failure webhooks (x10) restore once', async () => {
    const ref = await initiatePendingPayout();
    await handleFailure(ref, 'PENDING');
    for (let i = 0; i < 10; i += 1) await handleFailure(ref, 'FAILED');

    expect(mockDb.walletBalance(TENANT)).toBe(START);
    expect(reversalLedgers(ref)).toHaveLength(1);
    assertLedgerConsistent();
  });

  it('concurrent duplicate failure webhooks restore once', async () => {
    const ref = await initiatePendingPayout();
    await Promise.all(Array.from({ length: 6 }, () => handleFailure(ref, 'PENDING')));

    expect(mockDb.walletBalance(TENANT)).toBe(START);
    expect(reversalLedgers(ref)).toHaveLength(1);
    assertLedgerConsistent();
  });

  it('reversal amount comes from the original debit, not the webhook payload', async () => {
    const ref = await initiatePendingPayout();
    await handleFailure(ref, 'PENDING', { amount: PAYOUT * 10 });
    expect(mockDb.walletBalance(TENANT)).toBe(START);
    assertLedgerConsistent();
  });

  it('never creates money when there is no original debit', async () => {
    const result = await PayoutReversalService.reverseFailedPayout({
      tenantId: TENANT,
      reference: 'POUT-UNKNOWN',
      reason: 'test',
      source: 'WEBHOOK_PAYOUT_FAILED',
    });
    expect(result.status).toBe('NOTHING_TO_REVERSE');
    expect(mockDb.walletBalance(TENANT)).toBe(START);
    expect(reversalLedgers('POUT-UNKNOWN')).toHaveLength(0);
    assertLedgerConsistent();
  });

  it('failure after a confirmed SUCCESS is routed to reconciliation, not reversed', async () => {
    const ref = await initiatePendingPayout();
    await handleSuccess(ref, 'PENDING');
    await handleFailure(ref, 'SUCCESS');

    expect(mockDb.walletBalance(TENANT)).toBe(START - PAYOUT);
    expect(reversalLedgers(ref)).toHaveLength(0);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'payout.reconciliation_required', payload: expect.objectContaining({ reason: 'FAILED_AFTER_SUCCESS' }) }),
    );
    assertLedgerConsistent();
  });
});

describe('M3 payout success ledger', () => {
  it('success webhook posts no ledger entry; the initiation debit stands', async () => {
    const ref = await initiatePendingPayout();
    const ledgersBefore = mockDb.tables.ledgers.length;
    const entriesBefore = mockDb.tables.ledger_entries.length;

    await handleSuccess(ref, 'PENDING');
    await handleSuccess(ref, 'SUCCESS');

    expect(mockDb.tables.ledgers.length).toBe(ledgersBefore);
    expect(mockDb.tables.ledger_entries.length).toBe(entriesBefore);
    expect(txStatus(ref)).toBe('SUCCESS');
    expect(mockDb.walletBalance(TENANT)).toBe(START - PAYOUT);
    expect(mockDb.accountBalance(TENANT, 'EXTERNAL_BANK')).toBe(PAYOUT);
    assertLedgerConsistent();
  });

  it('success after the funds were already reversed is flagged, never re-posted', async () => {
    const ref = await initiatePendingPayout();
    await handleFailure(ref, 'PENDING');
    const entriesBefore = mockDb.tables.ledger_entries.length;

    await handleSuccess(ref, 'FAILED');
    expect(mockDb.tables.ledger_entries.length).toBe(entriesBefore);
    expect(txStatus(ref)).toBe('FAILED');
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'payout.reconciliation_required', payload: expect.objectContaining({ reason: 'REVERSED_BEFORE_SUCCESS' }) }),
    );
    assertLedgerConsistent();
  });

  it('success with no initiation debit is flagged instead of inventing an entry', async () => {
    mockDb.tables.transactions_log.push({ reference: 'POUT-ORPHAN', tenant_id: TENANT, type: 'payout', status: 'PENDING' });
    await handleSuccess('POUT-ORPHAN', 'PENDING');
    expect(mockDb.tables.ledgers.some((l) => l.reference === 'POUT-ORPHAN')).toBe(false);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ reason: 'NO_ORIGINAL_DEBIT' }) }),
    );
    assertLedgerConsistent();
  });
});

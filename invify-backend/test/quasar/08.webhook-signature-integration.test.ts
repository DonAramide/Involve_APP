// test/quasar/08.webhook-signature-integration.test.ts
/**
 * Integration Test — Webhook Endpoint & Signature Verification
 *
 * Validates the full HTTP pipeline:
 *  - Express body parser verify middleware (capturing req.rawBody)
 *  - Route mapping (POST /webhooks/quasar)
 *  - WebhookController signature verification and response handling
 *
 * This test boots the actual Express app and makes API requests via Supertest.
 */

import request from 'supertest';
import * as crypto from 'crypto';
import app from '../../src/app';
import { supabase } from '../../src/db/supabase';
import { QuasarIntegrationStore } from '../../src/integrations/quasar/quasar-integration.store';
import { LedgerService } from '../../src/services/ledger.service';
import { AuditService } from '../../src/services/audit.service';
import { NotificationService } from '../../src/services/notification.service';
import { FinancialEventService } from '../../src/services/event.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/db/supabase', () => {
  const mockFrom = jest.fn();
  const mockRpc = jest.fn();
  const client = {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getUser: jest.fn(),
    },
  };
  return {
    supabase: client,
    supabaseAdmin: client,
  };
});

jest.mock('../../src/integrations/quasar/quasar-integration.store', () => {
  return {
    QuasarIntegrationStore: {
      getByInvifyTenantId: jest.fn(),
      decryptSigningSecret: jest.fn(),
    },
  };
});

jest.mock('../../src/services/ledger.service', () => {
  return {
    LedgerService: {
      exists: jest.fn(),
      createDoubleEntry: jest.fn(),
    },
  };
});

jest.mock('../../src/services/audit.service', () => {
  return {
    AuditService: {
      log: jest.fn(),
    },
  };
});

jest.mock('../../src/services/notification.service', () => {
  return {
    NotificationService: {
      notifySchoolAdminOfPayoutSuccess: jest.fn(),
      notifySchoolAdminOfPayment: jest.fn(),
      notifySchoolAdminOfPayoutFailure: jest.fn(),
    },
  };
});

jest.mock('../../src/services/event.service', () => {
  return {
    FinancialEventService: {
      emit: jest.fn(),
    },
  };
});

const mockFrom = supabase.from as jest.Mock;
const MockStore = QuasarIntegrationStore as jest.Mocked<typeof QuasarIntegrationStore>;
const MockLedger = LedgerService as jest.Mocked<typeof LedgerService>;

const SIGNING_SECRET = 'test_webhook_secret_key_123456';
const MOCK_TENANT_ID = 'tenant-uuid-abc-123';
const MOCK_REFERENCE = 'REF-QUASAR-WEBHOOK-TEST-001';

const MOCK_TRANSACTION = {
  tenant_id: MOCK_TENANT_ID,
  wallet_id: 'wallet-uuid-def-456',
  status: 'PENDING',
  type: 'payment',
  amount: 15000, // 150.00 NGN in kobo
  metadata: { studentName: 'Test Student' },
};

function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Mock Supabase transaction log fetch
  const mockSingle = jest.fn().mockResolvedValue({
    data: MOCK_TRANSACTION,
    error: null,
  });
  const mockEq = jest.fn().mockReturnValue({
    single: mockSingle,
    maybeSingle: mockSingle,
  });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'transactions_log') {
      return { select: mockSelect, update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    }
    // Return dummy for other tables (like dead letters or audit updates)
    return { insert: () => Promise.resolve({ error: null }) };
  });

  // Mock Store secrets retrieval
  MockStore.getByInvifyTenantId.mockResolvedValue({
    quasar_webhook_signing_secret_enc: 'dummy-encrypted-signing-secret',
  } as any);
  MockStore.decryptSigningSecret.mockReturnValue(SIGNING_SECRET);

  // Mock Ledger exists (idempotency key is unused / not processed yet)
  MockLedger.exists.mockResolvedValue(false);
  MockLedger.createDoubleEntry.mockResolvedValue({ status: 'CREATED', id: 'ledger-id-001' } as any);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /webhooks/quasar — Express integration test', () => {

  it('accepts and verifies a valid webhook signature', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadObj = {
      event: 'payment.completed',
      data: {
        reference: MOCK_REFERENCE,
        amount: 15000,
        status: 'success',
      },
      timestamp,
    };
    const payloadStr = JSON.stringify(payloadObj);
    const signature = generateSignature(payloadStr, SIGNING_SECRET);

    const res = await request(app)
      .post('/webhooks/quasar')
      .set('Content-Type', 'application/json')
      .set('x-quasar-signature', signature)
      .send(payloadStr);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    // Verify signature was checked with correct parameters
    expect(MockStore.getByInvifyTenantId).toHaveBeenCalledWith(MOCK_TENANT_ID);
    expect(MockStore.decryptSigningSecret).toHaveBeenCalled();
    expect(MockLedger.exists).toHaveBeenCalledWith(`quasar:${MOCK_REFERENCE}:credit`);
    expect(MockLedger.createDoubleEntry).toHaveBeenCalled();
  });

  it('rejects a webhook with a tampered body', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadObj = {
      event: 'payment.completed',
      data: {
        reference: MOCK_REFERENCE,
        amount: 15000,
        status: 'success',
      },
      timestamp,
    };
    const payloadStr = JSON.stringify(payloadObj);
    const signature = generateSignature(payloadStr, SIGNING_SECRET);

    const tamperedStr = payloadStr.replace('payment.completed', 'payment.failed'); // Modify event name, keeping amount at 15000

    const res = await request(app)
      .post('/webhooks/quasar')
      .set('Content-Type', 'application/json')
      .set('x-quasar-signature', signature)
      .send(tamperedStr);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Auth failure');
    expect(MockLedger.createDoubleEntry).not.toHaveBeenCalled();
  });

  it('rejects a webhook if timestamp skew exceeds 5 minutes', async () => {
    const skewedTimestamp = Math.floor(Date.now() / 1000) - 450; // 7.5 minutes ago
    const payloadObj = {
      event: 'payment.completed',
      data: {
        reference: MOCK_REFERENCE,
        amount: 15000,
        status: 'success',
      },
      timestamp: skewedTimestamp,
    };
    const payloadStr = JSON.stringify(payloadObj);
    const signature = generateSignature(payloadStr, SIGNING_SECRET);

    const res = await request(app)
      .post('/webhooks/quasar')
      .set('Content-Type', 'application/json')
      .set('x-quasar-signature', signature)
      .send(payloadStr);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Auth failure');
    expect(MockLedger.createDoubleEntry).not.toHaveBeenCalled();
  });

  it('rejects a webhook with missing signature header', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadObj = {
      event: 'payment.completed',
      data: {
        reference: MOCK_REFERENCE,
        amount: 15000,
        status: 'success',
      },
      timestamp,
    };

    const res = await request(app)
      .post('/webhooks/quasar')
      .send(payloadObj);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Security headers or body missing');
  });

  it('returns 200 with already_processed if duplicate idempotency key is matched', async () => {
    MockLedger.exists.mockResolvedValue(true); // Already processed

    const timestamp = Math.floor(Date.now() / 1000);
    const payloadObj = {
      event: 'payment.completed',
      data: {
        reference: MOCK_REFERENCE,
        amount: 15000,
        status: 'success',
      },
      timestamp,
    };
    const payloadStr = JSON.stringify(payloadObj);
    const signature = generateSignature(payloadStr, SIGNING_SECRET);

    const res = await request(app)
      .post('/webhooks/quasar')
      .set('Content-Type', 'application/json')
      .set('x-quasar-signature', signature)
      .send(payloadStr);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'already_processed' });
    expect(MockLedger.createDoubleEntry).not.toHaveBeenCalled();
  });
});

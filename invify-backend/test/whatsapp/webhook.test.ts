/**
 * WhatsApp webhook verification + event processing tests
 */
import request from 'supertest';
import express from 'express';
import * as crypto from 'crypto';

jest.mock('../../src/services/integration-vault.service', () => ({
  IntegrationVaultService: {
    META_WHATSAPP_SERVICE: 'META_WHATSAPP',
    META_WHATSAPP_KEYS: [],
    getDecryptedCredential: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../src/db/supabase', () => ({
  supabase: { from: jest.fn() },
  supabaseAdmin: { from: jest.fn() },
}));

import { WhatsAppWebhookController } from '../../src/controllers/whatsapp-webhook.controller';
import { WhatsAppMessageLogRepository } from '../../src/repositories/whatsapp-message-log.repository';
import { GovAuditService } from '../../src/services/gov-audit.service';

jest.mock('../../src/repositories/whatsapp-message-log.repository', () => ({
  WhatsAppMessageLogRepository: {
    claimWebhookEvent: jest.fn(),
    mapMetaStatus: jest.requireActual('../../src/repositories/whatsapp-message-log.repository')
      .WhatsAppMessageLogRepository.mapMetaStatus,
    updateByMetaMessageId: jest.fn(),
    create: jest.fn(),
    findByMetaMessageId: jest.fn(),
    findByIdempotencyKey: jest.fn(),
  },
}));

jest.mock('../../src/services/gov-audit.service', () => ({
  GovAuditService: {
    logAction: jest.fn().mockResolvedValue(undefined),
  },
}));

const MockLog = WhatsAppMessageLogRepository as jest.Mocked<typeof WhatsAppMessageLogRepository>;

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

function buildApp() {
  const app = express();
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.get('/webhooks/whatsapp', WhatsAppWebhookController.verify);
  app.post('/webhooks/whatsapp', WhatsAppWebhookController.handle);
  return app;
}

describe('WhatsApp webhook verification (GET)', () => {
  const VERIFY_TOKEN = 'invify_wa_verify_test_token';

  beforeEach(() => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  });

  it('1. returns hub.challenge when mode=subscribe and token matches', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': '1234567890',
      });

    expect(res.status).toBe(200);
    expect(res.text).toBe('1234567890');
  });

  it('2. returns 403 when verify token does not match', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': '1234567890',
      });

    expect(res.status).toBe(403);
  });

  it('returns 403 when hub.mode is not subscribe', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'unsubscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': '1234567890',
      });

    expect(res.status).toBe(403);
  });
});

describe('WhatsApp webhook events (POST)', () => {
  const APP_SECRET = 'whatsapp_app_secret_test';

  function sign(body: object): { raw: string; header: string } {
    const raw = JSON.stringify(body);
    const header =
      'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
    return { raw, header };
  }

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
    process.env.NODE_ENV = 'test';
    jest.clearAllMocks();
    MockLog.claimWebhookEvent.mockResolvedValue({ claimed: true });
    MockLog.updateByMetaMessageId.mockResolvedValue({
      id: 'log-1',
      meta_message_id: 'wamid.TEST',
      status: 'delivered',
    } as any);
  });

  afterEach(() => {
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it('3. processes status event (delivered)', async () => {
    const app = buildApp();
    const body = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_ID',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'PNID' },
                statuses: [
                  {
                    id: 'wamid.TEST',
                    status: 'delivered',
                    timestamp: '1710000000',
                    recipient_id: '2348012345678',
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const { header } = sign(body);

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('x-hub-signature-256', header)
      .send(body);

    expect(res.status).toBe(200);
    expect(MockLog.claimWebhookEvent).toHaveBeenCalled();
    expect(MockLog.updateByMetaMessageId).toHaveBeenCalledWith(
      'wamid.TEST',
      expect.objectContaining({ status: 'delivered', metaStatus: 'delivered' })
    );
  });

  it('4. processes incoming message event', async () => {
    const app = buildApp();
    const body = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_ID',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'PNID' },
                messages: [
                  {
                    id: 'wamid.INBOUND1',
                    from: '2348012345678',
                    type: 'text',
                    timestamp: '1710000001',
                    text: { body: 'Hello' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const { header } = sign(body);

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('x-hub-signature-256', header)
      .send(body);

    expect(res.status).toBe(200);
    expect(MockLog.claimWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'inbound:wamid.INBOUND1',
        eventType: 'inbound_message',
      })
    );
    expect(GovAuditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'WHATSAPP_INBOUND_MESSAGE' })
    );
  });

  it('5. ignores duplicate webhook (idempotent)', async () => {
    MockLog.claimWebhookEvent.mockResolvedValue({ claimed: false });
    const app = buildApp();
    const body = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_ID',
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [
                  {
                    id: 'wamid.DUP',
                    status: 'sent',
                    timestamp: '1710000002',
                    recipient_id: '2348012345678',
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const { header } = sign(body);

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('x-hub-signature-256', header)
      .send(body);

    expect(res.status).toBe(200);
    expect(MockLog.updateByMetaMessageId).not.toHaveBeenCalled();
  });

  it('6. processes failed message status with error details', async () => {
    const app = buildApp();
    const body = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_ID',
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [
                  {
                    id: 'wamid.FAIL',
                    status: 'failed',
                    timestamp: '1710000003',
                    recipient_id: '2348012345678',
                    errors: [{ code: 131026, title: 'Message undeliverable' }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const { header } = sign(body);

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('x-hub-signature-256', header)
      .send(body);

    expect(res.status).toBe(200);
    expect(MockLog.updateByMetaMessageId).toHaveBeenCalledWith(
      'wamid.FAIL',
      expect.objectContaining({
        status: 'failed',
        errorCode: '131026',
        errorMessage: 'Message undeliverable',
      })
    );
  });

  it('rejects invalid signature with 403', async () => {
    const app = buildApp();
    const body = { object: 'whatsapp_business_account', entry: [] };

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('x-hub-signature-256', 'sha256=deadbeef')
      .send(body);

    expect(res.status).toBe(403);
  });
});

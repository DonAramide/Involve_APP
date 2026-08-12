/**
 * Outbound Meta WhatsApp provider + notification service tests
 */
import { MetaWhatsAppProvider } from '../../src/integrations/whatsapp/MetaWhatsAppProvider';
import { WhatsAppNotificationService } from '../../src/services/whatsapp-notification.service';
import { WhatsAppMessageLogRepository } from '../../src/repositories/whatsapp-message-log.repository';
import { WhatsAppSendResult } from '../../src/integrations/whatsapp/types';
import { WhatsAppProvider } from '../../src/integrations/whatsapp/WhatsAppProvider';

jest.mock('../../src/utils/http-client', () => {
  return {
    EnterpriseHttpClient: jest.fn().mockImplementation(() => ({
      post: jest.fn(),
      get: jest.fn(),
    })),
  };
});

jest.mock('../../src/repositories/whatsapp-message-log.repository', () => ({
  WhatsAppMessageLogRepository: {
    create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    findByIdempotencyKey: jest.fn().mockResolvedValue(null),
    findByMetaMessageId: jest.fn().mockResolvedValue(null),
    updateByMetaMessageId: jest.fn(),
    claimWebhookEvent: jest.fn(),
    mapMetaStatus: jest.fn(),
  },
}));

jest.mock('../../src/services/gov-audit.service', () => ({
  GovAuditService: { logAction: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../src/services/queue/QueueEngine', () => ({
  QueueEngine: {
    registerHandler: jest.fn(),
    getHandler: jest.fn().mockReturnValue(undefined),
    enqueue: jest.fn().mockRejectedValue(new Error('queue offline')),
    processMessage: jest.fn(),
  },
}));

jest.mock('../../src/services/integration-vault.service', () => ({
  IntegrationVaultService: {
    getDecryptedCredential: jest.fn().mockResolvedValue(null),
  },
}));

import { EnterpriseHttpClient } from '../../src/utils/http-client';

const MockLog = WhatsAppMessageLogRepository as jest.Mocked<typeof WhatsAppMessageLogRepository>;

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

describe('MetaWhatsAppProvider outbound', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHATSAPP_ACCESS_TOKEN = 'test_access_token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v19.0';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });

  it('7. sends outbound template message request to Graph API', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { messages: [{ id: 'wamid.OUTBOUND1' }] },
    });
    (EnterpriseHttpClient as jest.Mock).mockImplementation(() => ({ post }));

    const provider = new MetaWhatsAppProvider({
      graphApiVersion: 'v19.0',
      accessToken: 'test_access_token',
      phoneNumberId: '1234567890',
    });

    const result = await provider.sendTemplateMessage({
      to: '+2348012345678',
      templateName: 'invify_invoice',
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: 'INV-1' }],
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.metaMessageId).toBe('wamid.OUTBOUND1');
    expect(post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v19.0/1234567890/messages',
      expect.objectContaining({
        messaging_product: 'whatsapp',
        to: '2348012345678',
        type: 'template',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test_access_token',
        }),
      })
    );
  });

  it('8. returns failure result on Meta API error (does not throw)', async () => {
    const post = jest.fn().mockRejectedValue({
      response: { status: 400, data: { error: { code: 100, message: 'Invalid parameter' } } },
      message: 'Request failed',
    });
    (EnterpriseHttpClient as jest.Mock).mockImplementation(() => ({ post }));

    const provider = new MetaWhatsAppProvider({
      graphApiVersion: 'v19.0',
      accessToken: 'test_access_token',
      phoneNumberId: '1234567890',
    });

    const result = await provider.sendTextMessage({
      to: '2348012345678',
      body: 'hello',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('100');
    expect(result.errorMessage).toContain('Invalid parameter');
  });
});

describe('WhatsAppNotificationService business messages', () => {
  const mockProvider: WhatsAppProvider = {
    sendTextMessage: jest.fn(),
    sendTemplateMessage: jest.fn(),
    sendDocumentMessage: jest.fn(),
    sendImageMessage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHATSAPP_USE_QUEUE = 'false';
    WhatsAppNotificationService.setProvider(mockProvider);
    MockLog.findByIdempotencyKey.mockResolvedValue(null);
    (mockProvider.sendTemplateMessage as jest.Mock).mockResolvedValue({
      success: true,
      metaMessageId: 'wamid.NOTIFY1',
      phoneNumberId: 'PNID',
    } as WhatsAppSendResult);
  });

  afterEach(() => {
    WhatsAppNotificationService.resetProvider();
    delete process.env.WHATSAPP_USE_QUEUE;
  });

  it('9. sends invoice WhatsApp notification and persists Meta message ID', async () => {
    const result = await WhatsAppNotificationService.sendInvoiceMessage({
      tenantId: 'tenant-1',
      customerId: 'cust-1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-100',
      amount: 5000,
      recipientPhone: '2348012345678',
      customerName: 'Ada',
    });

    expect(result?.success).toBe(true);
    expect(result?.metaMessageId).toBe('wamid.NOTIFY1');
    expect(mockProvider.sendTemplateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: expect.any(String),
        to: '2348012345678',
      })
    );
    expect(MockLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messageType: 'INVOICE',
        invoiceId: 'inv-1',
        metaMessageId: 'wamid.NOTIFY1',
        status: 'sent',
        idempotencyKey: 'invoice:tenant-1:inv-1',
      })
    );
  });

  it('10. sends receipt WhatsApp notification and persists Meta message ID', async () => {
    const result = await WhatsAppNotificationService.sendReceiptMessage({
      tenantId: 'tenant-1',
      receiptId: 'rcpt-1',
      invoiceId: 'inv-1',
      amount: 5000,
      recipientPhone: '+2348012345678',
      customerName: 'Ada',
      reference: 'REF-1',
    });

    expect(result?.success).toBe(true);
    expect(mockProvider.sendTemplateMessage).toHaveBeenCalled();
    expect(MockLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messageType: 'RECEIPT',
        receiptId: 'rcpt-1',
        metaMessageId: 'wamid.NOTIFY1',
        status: 'sent',
      })
    );
  });

  it('skips invoice send when phone is missing', async () => {
    const result = await WhatsAppNotificationService.sendInvoiceMessage({
      tenantId: 'tenant-1',
      invoiceId: 'inv-2',
      recipientPhone: null,
    });
    expect(result).toBeNull();
    expect(mockProvider.sendTemplateMessage).not.toHaveBeenCalled();
  });
});

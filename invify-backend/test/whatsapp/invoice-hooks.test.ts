/**
 * Invoice / receipt WhatsApp hooks — non-fatal after successful business ops
 */
import { InvoiceFacade } from '../../src/facades/invoice.facade';
import { WhatsAppNotificationService } from '../../src/services/whatsapp-notification.service';

jest.mock('../../src/services/invoice-application.service', () => ({
  InvoiceApplicationService: {
    processOfflineInvoice: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/app', () => ({
  io: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
}));

jest.mock('../../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

jest.mock('../../src/db/pg', () => ({
  getClient: jest.fn(),
}));

jest.mock('../../src/services/ledger.service', () => ({
  LedgerService: { createDoubleEntry: jest.fn() },
}));

jest.mock('../../src/services/gov-audit.service', () => ({
  GovAuditService: { logAction: jest.fn() },
}));

jest.mock('../../src/services/whatsapp-notification.service', () => ({
  WhatsAppNotificationService: {
    notifyInvoiceCreated: jest.fn(),
    notifyReceipt: jest.fn(),
  },
}));

describe('InvoiceFacade WhatsApp hooks', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies WhatsApp after successful invoice create without throwing', async () => {
    await InvoiceFacade.createInvoice(
      {
        syncId: 'sync-1',
        id: 'inv-99',
        invoiceNumber: 'INV-99',
        customerPhone: '2348099999999',
        customerId: 'c-1',
        customerName: 'Bola',
        totalAmount: 1200,
      },
      { tenantId: 'tenant-x' },
      'idem-1'
    );

    expect(WhatsAppNotificationService.notifyInvoiceCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-x',
        invoiceId: 'inv-99',
        recipientPhone: '2348099999999',
      })
    );
  });

  it('does not fail invoice create when WhatsApp notify throws', async () => {
    (WhatsAppNotificationService.notifyInvoiceCreated as jest.Mock).mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(
      InvoiceFacade.createInvoice(
        { syncId: 'sync-2', id: 'inv-100', customerPhone: '2348011111111' },
        { tenantId: 'tenant-x' },
        'idem-2'
      )
    ).resolves.toEqual({ success: true, syncId: 'sync-2' });
  });
});

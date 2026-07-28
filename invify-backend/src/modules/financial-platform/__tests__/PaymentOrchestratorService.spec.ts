import { PaymentOrchestratorService } from '../orchestration/PaymentOrchestratorService';
import { PaymentIntentState } from '../domain/state-machines/PaymentStateMachine';

describe('PaymentOrchestratorService', () => {
  let orchestrator: PaymentOrchestratorService;
  let mockQuasar: any;
  let mockBilling: any;
  let mockQueue: any;
  let mockLogger: any;

  beforeEach(() => {
    mockQuasar = {};
    mockBilling = {
      isEligibleForInvoicePayments: jest.fn().mockResolvedValue(true)
    };
    mockQueue = {
      enqueue: jest.fn().mockResolvedValue(undefined)
    };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    orchestrator = new PaymentOrchestratorService(
      mockQuasar,
      mockBilling,
      mockQueue,
      mockLogger
    );
  });

  it('should throw if tenant plan is ineligible', async () => {
    mockBilling.isEligibleForInvoicePayments.mockResolvedValue(false);
    
    await expect(orchestrator.createPaymentIntent('tenant-1', 'inv-1', 100, 'USD'))
      .rejects.toThrow('Tenant plan does not support invoice payments');
  });

  it('should successfully create and enqueue a payment intent', async () => {
    const result = await orchestrator.createPaymentIntent('tenant-1', 'inv-1', 100, 'USD');
    
    expect(result.status).toBe(PaymentIntentState.CREATED);
    expect(result.correlationId).toBeDefined();
    
    expect(mockQueue.enqueue).toHaveBeenCalledWith('payment.intent.create', expect.objectContaining({
      tenantId: 'tenant-1',
      amount: 100,
      currency: 'USD',
      correlationId: result.correlationId
    }));
  });
});

import { randomUUID } from 'crypto';
import { PaymentIntentState } from '../domain/state-machines/PaymentStateMachine';

export class PaymentOrchestratorService {
  constructor(
    private quasarConnector: any,
    private billingGovernanceService: any,
    private queueService: any,
    private logger: any
  ) {}

  async createPaymentIntent(tenantId: string, invoiceId: string, amount: number, currency: string) {
    const correlationId = randomUUID();
    
    // 1. Check Plan Eligibility
    const isEligible = await this.billingGovernanceService.isEligibleForInvoicePayments(tenantId);
    if (!isEligible) {
      throw new Error('Tenant plan does not support invoice payments. Please upgrade to Professional or Enterprise.');
    }

    const idempotencyKey = `intent_${tenantId}_${invoiceId}_${correlationId}`;

    this.logger.info('Initializing payment intent', {
      tenantId,
      invoiceId,
      correlationId,
      amount,
      currency
    });

    try {
      // 2. Initial Local State (CREATED)
      const localIntent = await this.saveLocalIntent({
        tenantId,
        invoiceId,
        amount,
        currency,
        status: PaymentIntentState.CREATED,
        correlationId
      });

      // 3. Dispatch to Queue for Quasar Interaction
      await this.queueService.enqueue('payment.intent.create', {
        intentId: localIntent.id,
        tenantId,
        amount,
        currency,
        idempotencyKey,
        correlationId
      });

      return {
        intentId: localIntent.id,
        correlationId,
        status: PaymentIntentState.CREATED
      };
    } catch (error) {
      this.logger.error('Failed to create payment intent', { tenantId, invoiceId, correlationId, error });
      throw error;
    }
  }

  private async saveLocalIntent(intentData: any) {
    // DB interaction mock
    return { id: randomUUID(), ...intentData };
  }
}

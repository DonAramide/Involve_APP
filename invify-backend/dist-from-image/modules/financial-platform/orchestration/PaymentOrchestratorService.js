"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrchestratorService = void 0;
const crypto_1 = require("crypto");
const PaymentStateMachine_1 = require("../domain/state-machines/PaymentStateMachine");
class PaymentOrchestratorService {
    quasarConnector;
    billingGovernanceService;
    queueService;
    logger;
    constructor(quasarConnector, billingGovernanceService, queueService, logger) {
        this.quasarConnector = quasarConnector;
        this.billingGovernanceService = billingGovernanceService;
        this.queueService = queueService;
        this.logger = logger;
    }
    async createPaymentIntent(tenantId, invoiceId, amount, currency) {
        const correlationId = (0, crypto_1.randomUUID)();
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
                status: PaymentStateMachine_1.PaymentIntentState.CREATED,
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
                status: PaymentStateMachine_1.PaymentIntentState.CREATED
            };
        }
        catch (error) {
            this.logger.error('Failed to create payment intent', { tenantId, invoiceId, correlationId, error });
            throw error;
        }
    }
    async saveLocalIntent(intentData) {
        // DB interaction mock
        return { id: (0, crypto_1.randomUUID)(), ...intentData };
    }
}
exports.PaymentOrchestratorService = PaymentOrchestratorService;
//# sourceMappingURL=PaymentOrchestratorService.js.map
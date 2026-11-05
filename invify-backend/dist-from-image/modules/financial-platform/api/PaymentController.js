"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
class PaymentController {
    paymentOrchestratorService;
    dbStore;
    constructor(paymentOrchestratorService, dbStore) {
        this.paymentOrchestratorService = paymentOrchestratorService;
        this.dbStore = dbStore;
    }
    async createIntent(req, res) {
        try {
            const { tenantId, invoiceId, amount, currency } = req.body;
            const result = await this.paymentOrchestratorService.createPaymentIntent(tenantId, invoiceId, amount, currency);
            res.status(201).json(result);
        }
        catch (error) {
            if (error.message.includes('plan does not support')) {
                res.status(403).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to create payment intent' });
            }
        }
    }
    async getIntent(req, res) {
        try {
            const { id } = req.params;
            const intent = await this.dbStore.getPaymentIntent(id);
            if (!intent)
                return res.status(404).send('Not Found');
            res.status(200).json(intent);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to retrieve intent' });
        }
    }
    async cancelIntent(req, res) {
        try {
            const { id } = req.params;
            // Trigger cancellation in orchestrator
            res.status(200).json({ message: 'Cancellation requested' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to cancel intent' });
        }
    }
    async refundIntent(req, res) {
        try {
            const { id } = req.params;
            const { amount } = req.body;
            // Trigger refund in orchestrator
            res.status(200).json({ message: 'Refund processing' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to process refund' });
        }
    }
    async getHistory(req, res) {
        try {
            const { tenantId } = req.query;
            const history = await this.dbStore.getPaymentHistory(tenantId);
            res.status(200).json(history);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to retrieve history' });
        }
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=PaymentController.js.map
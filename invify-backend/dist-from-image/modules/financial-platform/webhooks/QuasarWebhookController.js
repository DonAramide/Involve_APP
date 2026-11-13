"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarWebhookController = void 0;
class QuasarWebhookController {
    eventStore;
    signatureValidator;
    webhookDispatcher;
    logger;
    constructor(eventStore, signatureValidator, webhookDispatcher, logger) {
        this.eventStore = eventStore;
        this.signatureValidator = signatureValidator;
        this.webhookDispatcher = webhookDispatcher;
        this.logger = logger;
    }
    async handleWebhook(req, res) {
        try {
            const signature = req.headers['x-quasar-signature'];
            const payload = req.body;
            // 1. Validate Signature
            const isValid = await this.signatureValidator.validate(payload, signature);
            if (!isValid) {
                this.logger.warn('Invalid webhook signature received');
                return res.status(401).send('Unauthorized');
            }
            // 2. Extract Event ID & Deduplicate
            const eventId = payload.eventId;
            const isDuplicate = await this.eventStore.exists(eventId);
            if (isDuplicate) {
                this.logger.info(`Duplicate webhook received: ${eventId}`);
                return res.status(200).send('Duplicate');
            }
            // 3. Append to Immutable Store
            await this.eventStore.append({
                eventId: payload.eventId,
                version: payload.eventVersion,
                type: payload.type,
                tenantId: payload.tenantId,
                correlationId: payload.correlationId,
                payload: payload.data
            });
            // 4. Dispatch to State Machines asynchronously via queue or directly
            await this.webhookDispatcher.dispatch(payload);
            return res.status(200).send('OK');
        }
        catch (error) {
            this.logger.error('Error processing webhook', { error });
            // Depending on the error, returning 500 triggers Quasar to retry
            return res.status(500).send('Internal Server Error');
        }
    }
}
exports.QuasarWebhookController = QuasarWebhookController;
//# sourceMappingURL=QuasarWebhookController.js.map
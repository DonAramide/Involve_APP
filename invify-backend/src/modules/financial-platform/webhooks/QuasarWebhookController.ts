import { createHmac } from 'crypto';

export class QuasarWebhookController {
  constructor(
    private eventStore: any,
    private signatureValidator: any,
    private webhookDispatcher: any,
    private logger: any
  ) {}

  async handleWebhook(req: any, res: any) {
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
    } catch (error) {
      this.logger.error('Error processing webhook', { error });
      // Depending on the error, returning 500 triggers Quasar to retry
      return res.status(500).send('Internal Server Error');
    }
  }
}

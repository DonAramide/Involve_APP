import { QuasarProvisioningService } from '../../../integrations/quasar/quasar-provisioning.service';

export class QuasarConnector {
  constructor(private vaultService: any, private httpService: any) {}

  async createPaymentIntent(tenantId: string, payload: any, idempotencyKey: string) {
    const client = await QuasarProvisioningService.getPaymentsClient(tenantId);
    return await client.createPaymentIntent(payload, { idempotencyKey });
  }

  async getPaymentStatus(tenantId: string, intentId: string) {
    const client = await QuasarProvisioningService.getPaymentsClient(tenantId);
    return await client.getPaymentIntent(intentId);
  }

  async createRefund(tenantId: string, intentId: string, amount: number, idempotencyKey: string) {
    const client = await QuasarProvisioningService.getPaymentsClient(tenantId);
    return await (client as any).client.post(`/payments/intents/${intentId}/refunds`, { amount }, { idempotencyKey });
  }

  async getSettlements(tenantId: string, date: string) {
    const client = await QuasarProvisioningService.getPaymentsClient(tenantId);
    return await (client as any).client.get(`/settlements?date=${date}`);
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarConnector = void 0;
const quasar_provisioning_service_1 = require("../../../integrations/quasar/quasar-provisioning.service");
class QuasarConnector {
    vaultService;
    httpService;
    constructor(vaultService, httpService) {
        this.vaultService = vaultService;
        this.httpService = httpService;
    }
    async createPaymentIntent(tenantId, payload, idempotencyKey) {
        const client = await quasar_provisioning_service_1.QuasarProvisioningService.getPaymentsClient(tenantId);
        return await client.createPaymentIntent(payload, { idempotencyKey });
    }
    async getPaymentStatus(tenantId, intentId) {
        const client = await quasar_provisioning_service_1.QuasarProvisioningService.getPaymentsClient(tenantId);
        return await client.getPaymentIntent(intentId);
    }
    async createRefund(tenantId, intentId, amount, idempotencyKey) {
        const client = await quasar_provisioning_service_1.QuasarProvisioningService.getPaymentsClient(tenantId);
        return await client.client.post(`/payments/intents/${intentId}/refunds`, { amount }, { idempotencyKey });
    }
    async getSettlements(tenantId, date) {
        const client = await quasar_provisioning_service_1.QuasarProvisioningService.getPaymentsClient(tenantId);
        return await client.client.get(`/settlements?date=${date}`);
    }
}
exports.QuasarConnector = QuasarConnector;
//# sourceMappingURL=QuasarConnector.js.map
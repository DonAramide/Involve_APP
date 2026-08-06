import api from './index'; // Assuming an existing axios instance or similar setup in index.js

export const paymentApi = {
  /**
   * Retrieves paginated payment history for a tenant
   */
  getHistory(tenantId, params = {}) {
    return api.get('/payments/history', { 
      params: { tenantId, ...params } 
    });
  },

  /**
   * Retrieves a specific payment intent
   */
  getIntent(intentId) {
    return api.get(`/payments/intents/${intentId}`);
  },

  /**
   * Initiates a refund for a payment intent
   */
  refundIntent(intentId, payload) {
    return api.post(`/payments/intents/${intentId}/refund`, payload);
  },

  /**
   * Cancels a pending payment intent
   */
  cancelIntent(intentId) {
    return api.post(`/payments/intents/${intentId}/cancel`);
  },

  /**
   * Creates a new payment intent (used largely behind the scenes or for manual links)
   */
  createIntent(payload) {
    return api.post('/payments/intents', payload);
  }
};

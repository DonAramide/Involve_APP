import { paymentApi } from '../api/paymentApi';

export class PaymentPollingService {
  constructor() {
    this.intervalId = null;
    this.subscribers = new Set();
    this.currentIntentId = null;
  }

  /**
   * Starts polling the intent status every intervalMs
   */
  start(intentId, intervalMs = 2500) {
    if (this.intervalId && this.currentIntentId === intentId) return;
    this.stop();

    this.currentIntentId = intentId;
    this.intervalId = setInterval(async () => {
      try {
        const response = await paymentApi.getIntent(intentId);
        const data = response.data; // Assuming axios
        this.notify(data);

        // Stop polling if we reach a terminal state
        if (['SUCCEEDED', 'FAILED', 'REFUNDED'].includes(data.status)) {
          this.stop();
        }
      } catch (error) {
        console.error('Payment polling error:', error);
      }
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.currentIntentId = null;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback); // Returns unsubscribe function
  }

  notify(data) {
    for (const callback of this.subscribers) {
      callback(data);
    }
  }
}

// Export as singleton
export const paymentPollingService = new PaymentPollingService();

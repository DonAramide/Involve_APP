/**
 * AUTHORITATIVE FINANCIAL TELEMETRY EVENT BUS
 * Real-time event broker for platform transactions, billing actions, and quota violations.
 * Standardizes diagnostic tracking data for downstream enterprise systems.
 */

export class FinancialTelemetryEventBus {
  constructor() {
    this.listeners = new Map();
    this.eventLog = [];
    this.maxHistoryLogSize = 250;
  }

  /**
   * Registers a subscriber callback for a specific event topic.
   */
  subscribe(topic, callback) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, []);
    }
    this.listeners.get(topic).push(callback);

    // Unsubscribe helper return
    return () => {
      const callbacks = this.listeners.get(topic) || [];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Publishes an event to all registered topic subscribers.
   */
  publish(topic, payload) {
    const eventEnvelope = {
      eventId: `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: Date.now(),
      topic,
      payload
    };

    // Keep memory history bounded
    this.eventLog.unshift(eventEnvelope);
    if (this.eventLog.length > this.maxHistoryLogSize) {
      this.eventLog.pop();
    }

    // Notify registered subscribers
    const callbacks = this.listeners.get(topic) || [];
    callbacks.forEach(callback => {
      try {
        callback(eventEnvelope);
      } catch (err) {
        console.error(`[TelemetryEventBus] Subscriber callback failure on topic ${topic}:`, err);
      }
    });

    console.log(`[TelemetryEventBus] Topic: ${topic} | ID: ${eventEnvelope.eventId}`);
    return eventEnvelope;
  }

  /**
   * Retrieves full history of logged events.
   */
  getEventHistory() {
    return this.eventLog;
  }
}

// Global Singleton Instance
export const globalTelemetryBus = new FinancialTelemetryEventBus();

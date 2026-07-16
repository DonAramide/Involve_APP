import { EnterpriseEventV1 } from '../../../domains/core/events/enterprise.event';

export class EventDeduplicator {
  private processedEvents = new Map<string, number>();
  private readonly TTL_MS = 60000; // 1 minute window for deduping

  /**
   * Returns true if the event has already been processed within the TTL window.
   */
  isDuplicate(event: EnterpriseEventV1): boolean {
    const key = `${event.eventId}-${event.correlationId}`;
    const now = Date.now();

    // Clean up expired entries (lazy cleanup)
    for (const [k, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.TTL_MS) {
        this.processedEvents.delete(k);
      }
    }

    if (this.processedEvents.has(key)) {
      return true;
    }

    this.processedEvents.set(key, now);
    return false;
  }
}

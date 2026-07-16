import { EnterpriseEventV1 } from '../../../domains/core/events/enterprise.event';

export type EventBusSubscriber = (event: EnterpriseEventV1) => void;

export class EventBus {
  private subscribers = new Map<string, Set<EventBusSubscriber>>();

  /**
   * Subscribes to a specific event topic or wildcard (e.g., 'finance.*')
   */
  subscribe(topic: string, callback: EventBusSubscriber): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    
    this.subscribers.get(topic)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(topic);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  /**
   * Dispatches a transport-agnostic enterprise event to all listeners
   */
  dispatch(event: EnterpriseEventV1): void {
    const topic = event.event;
    
    // Exact match
    if (this.subscribers.has(topic)) {
      this.subscribers.get(topic)!.forEach(cb => cb(event));
    }
    
    // Wildcard match (e.g., topic='finance.invoice.created' -> matches 'finance.*')
    const parts = topic.split('.');
    if (parts.length > 1) {
      const wildcard = `${parts[0]}.*`;
      if (this.subscribers.has(wildcard)) {
        this.subscribers.get(wildcard)!.forEach(cb => cb(event));
      }
    }
  }
}

export const globalEventBus = new EventBus();

import { EventEmitter as NodeEventEmitter } from 'events';
import { DomainEvent } from '../types/operations.dto';

class DomainEventEmitter extends NodeEventEmitter {
  emitEvent<T>(topic: string, tenantId: string, payload: T): void {
    const event: DomainEvent<T> = {
      id: crypto.randomUUID(),
      topic,
      tenantId,
      timestamp: new Date().toISOString(),
      payload
    };
    
    // Emit locally for synchronous intra-process handlers (like AuditService)
    this.emit(topic, event);
    this.emit('*', event); // Firehose topic

    // In a production system, this would also push to Kafka/RabbitMQ/SQS
    console.log(`[DomainEvent] Emitted ${topic} for tenant ${tenantId}`);
  }
}

export const eventEmitter = new DomainEventEmitter();

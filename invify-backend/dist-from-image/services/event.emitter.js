"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventEmitter = void 0;
const events_1 = require("events");
class DomainEventEmitter extends events_1.EventEmitter {
    emitEvent(topic, tenantId, payload) {
        const event = {
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
exports.eventEmitter = new DomainEventEmitter();
//# sourceMappingURL=event.emitter.js.map
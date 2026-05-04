// backend/src/services/event_bus.service.js
const EventEmitter = require('events');
const { Queue } = require('bullmq');

const connection = { 
    host: process.env.REDIS_HOST || '127.0.0.1', 
    port: process.env.REDIS_PORT || 6379 
};

// 1. Local Event Emitter for low-latency in-process tasks (e.g. WebSockets)
const localBus = new EventEmitter();

// 2. Distributed Event Queue for cross-process tasks (e.g. Workers, Pushes)
const financeQueue = new Queue('finance-events', { connection });

class EventBusService {
    /**
     * Emit a financial event
     * @param {string} event - 'payment.success', 'payment.failed', 'wallet.updated'
     * @param {Object} data - event payload
     */
    static async emit(event, data) {
        console.log(`[EventBus] Emitting ${event}`, data);

        // A. Trigger Local Listeners
        localBus.emit(event, data);

        // B. Add to Background Queue for processing (Notifications, Analytics)
        await financeQueue.add(event, {
            event,
            payload: data,
            timestamp: new Date().toISOString()
        }, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 }
        });
    }

    static on(event, callback) {
        localBus.on(event, callback);
    }
}

module.exports = { EventBusService, localBus, financeQueue };

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventDispatcher = void 0;
class EventDispatcher {
    static listeners = {};
    static subscribe(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    static publish(event, payload) {
        console.log(`[EventDispatcher] Emitting event: ${event}`, payload);
        const callbacks = this.listeners[event] || [];
        callbacks.forEach(cb => cb(payload));
    }
}
exports.EventDispatcher = EventDispatcher;
//# sourceMappingURL=EventDispatcher.js.map
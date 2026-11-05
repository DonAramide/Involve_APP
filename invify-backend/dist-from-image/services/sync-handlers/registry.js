"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRegistry = exports.EventHandlerRegistry = void 0;
class EventHandlerRegistry {
    handlers = new Map();
    register(eventName, handler) {
        this.handlers.set(eventName, handler);
    }
    getHandler(eventName) {
        return this.handlers.get(eventName);
    }
}
exports.EventHandlerRegistry = EventHandlerRegistry;
exports.syncRegistry = new EventHandlerRegistry();
//# sourceMappingURL=registry.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityAuditService = void 0;
class SecurityAuditService {
    static events = [];
    static clearEvents() {
        this.events = [];
    }
    static getEvents() {
        return this.events;
    }
    static getEventsByType(eventType) {
        return this.events.filter((e) => e.eventType === eventType);
    }
    static getEventsBySeverity(severity) {
        return this.events.filter((e) => e.severity === severity);
    }
    /**
     * Record a security event to the audit trail.
     */
    static record(input) {
        const event = {
            id: Math.random().toString(36).substring(2),
            eventType: input.eventType,
            severity: input.severity,
            description: input.description,
            metadata: input.metadata ?? {},
            recordedAt: new Date().toISOString(),
        };
        this.events.push(event);
        return event;
    }
    /**
     * Returns a breakdown of event counts by type.
     */
    static getBreakdown() {
        const breakdown = {};
        for (const event of this.events) {
            breakdown[event.eventType] = (breakdown[event.eventType] || 0) + 1;
        }
        return breakdown;
    }
    /**
     * Returns total counts by severity.
     */
    static getSeverityCounts() {
        return {
            INFO: this.events.filter((e) => e.severity === 'INFO').length,
            WARNING: this.events.filter((e) => e.severity === 'WARNING').length,
            HIGH: this.events.filter((e) => e.severity === 'HIGH').length,
            CRITICAL: this.events.filter((e) => e.severity === 'CRITICAL').length,
        };
    }
}
exports.SecurityAuditService = SecurityAuditService;
//# sourceMappingURL=SecurityAuditService.js.map
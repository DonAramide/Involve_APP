"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceAuditService = void 0;
class GovernanceAuditService {
    static events = [];
    static seq = 0;
    static clearEvents() {
        this.events = [];
        this.seq = 0;
    }
    static record(input) {
        const event = {
            id: `GAE-${++this.seq}`,
            eventType: input.eventType,
            severity: input.severity,
            actor: input.actor ?? 'SYSTEM',
            targetId: input.targetId ?? '',
            description: input.description,
            correlationId: input.correlationId ?? `CORR-${this.seq}`,
            timestamp: new Date().toISOString(),
            metadata: input.metadata,
        };
        this.events.push(event);
        return event;
    }
    static getEvents() { return [...this.events]; }
    static getByType(type) {
        return this.events.filter((e) => e.eventType === type);
    }
    static getBySeverity(severity) {
        return this.events.filter((e) => e.severity === severity);
    }
    static getSeverityCounts() {
        return {
            INFO: this.events.filter((e) => e.severity === 'INFO').length,
            WARN: this.events.filter((e) => e.severity === 'WARN').length,
            CRITICAL: this.events.filter((e) => e.severity === 'CRITICAL').length,
        };
    }
}
exports.GovernanceAuditService = GovernanceAuditService;
//# sourceMappingURL=GovernanceAuditService.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryClient = void 0;
const StructuredLogger_1 = require("./StructuredLogger");
class SentryClient {
    static incidents = [];
    static clearIncidents() {
        this.incidents = [];
    }
    static getIncidents() {
        return this.incidents;
    }
    /**
     * Capture exceptions and record them in the mock Sentry database.
     */
    static captureException(error, extraContext = {}) {
        const id = 'sentry-inc-' + Math.random().toString(36).substring(2, 10);
        const incident = {
            id,
            errorName: error.name,
            errorMessage: error.message,
            extraContext,
            timestamp: new Date().toISOString(),
        };
        this.incidents.push(incident);
        StructuredLogger_1.StructuredLogger.error(`[Sentry Alert Generated] Exception captured. Incident ID: ${id}`, error, {
            sentryIncidentId: id,
            ...extraContext,
        });
        return id;
    }
}
exports.SentryClient = SentryClient;
//# sourceMappingURL=SentryClient.js.map
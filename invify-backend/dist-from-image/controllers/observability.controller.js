"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityController = void 0;
const observability_collector_service_1 = require("../services/observability/observability-collector.service");
const observability_sse_service_1 = require("../services/observability/observability-sse.service");
class ObservabilityController {
    /**
     * GET /api/admin/observability/snapshot
     * Returns a complete real-time system and infrastructure snapshot.
     * Strictly allowlisted fields only — no process.env dumps or raw headers.
     */
    static async getSnapshot(_req, res) {
        try {
            const collector = observability_collector_service_1.ObservabilityCollectorService.getInstance();
            const snapshot = collector.getSnapshot();
            res.status(200).json(snapshot);
        }
        catch {
            res.status(500).json({ error: 'Failed to retrieve observability snapshot' });
        }
    }
    /**
     * GET /api/admin/observability/logs
     * Returns sanitized log records from the in-memory ring buffer.
     */
    static async getLogs(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
            const level = String(req.query.level || 'all');
            const search = req.query.search ? String(req.query.search).slice(0, 100) : undefined;
            const collector = observability_collector_service_1.ObservabilityCollectorService.getInstance();
            const logs = collector.getLogs(limit, level, search);
            res.status(200).json({ logs });
        }
        catch {
            res.status(500).json({ error: 'Failed to retrieve logs' });
        }
    }
    /**
     * GET /api/admin/observability/stream
     * Live Server-Sent Events (SSE) stream for Super Admin.
     * Emits snapshot and log events. Read-only.
     */
    static async stream(req, res) {
        if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method Not Allowed' });
            return;
        }
        try {
            const sseService = observability_sse_service_1.ObservabilitySseService.getInstance();
            sseService.registerClient(req, res);
        }
        catch {
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to establish live stream' });
            }
        }
    }
}
exports.ObservabilityController = ObservabilityController;
//# sourceMappingURL=observability.controller.js.map
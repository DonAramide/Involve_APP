import { Request, Response } from 'express';
export declare class ObservabilityController {
    /**
     * GET /api/admin/observability/snapshot
     * Returns a complete real-time system and infrastructure snapshot.
     * Strictly allowlisted fields only — no process.env dumps or raw headers.
     */
    static getSnapshot(_req: Request, res: Response): Promise<void>;
    /**
     * GET /api/admin/observability/logs
     * Returns sanitized log records from the in-memory ring buffer.
     */
    static getLogs(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/admin/observability/stream
     * Live Server-Sent Events (SSE) stream for Super Admin.
     * Emits snapshot and log events. Read-only.
     */
    static stream(req: Request, res: Response): Promise<void>;
}

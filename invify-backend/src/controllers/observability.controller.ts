import { Request, Response } from 'express';
import { ObservabilityCollectorService } from '../services/observability/observability-collector.service';
import { ObservabilitySseService } from '../services/observability/observability-sse.service';

export class ObservabilityController {
  /**
   * GET /api/admin/observability/snapshot
   * Returns a complete real-time system and infrastructure snapshot.
   * Strictly allowlisted fields only — no process.env dumps or raw headers.
   */
  public static async getSnapshot(_req: Request, res: Response): Promise<void> {
    try {
      const collector = ObservabilityCollectorService.getInstance();
      const snapshot = collector.getSnapshot();
      res.status(200).json(snapshot);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve observability snapshot' });
    }
  }

  /**
   * GET /api/admin/observability/logs
   * Returns sanitized log records from the in-memory ring buffer.
   */
  public static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const level = String(req.query.level || 'all');
      const search = req.query.search ? String(req.query.search).slice(0, 100) : undefined;

      const collector = ObservabilityCollectorService.getInstance();
      const logs = collector.getLogs(limit, level, search);
      res.status(200).json({ logs });
    } catch {
      res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  }

  /**
   * GET /api/admin/observability/stream
   * Live Server-Sent Events (SSE) stream for Super Admin.
   * Emits snapshot and log events. Read-only.
   */
  public static async stream(req: Request, res: Response): Promise<void> {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }
    try {
      const sseService = ObservabilitySseService.getInstance();
      sseService.registerClient(req, res);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish live stream' });
      }
    }
  }
}

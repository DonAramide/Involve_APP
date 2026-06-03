import { Request, Response } from 'express';
import { auditLogService } from '../services/audit.service';

export class AuditLogController {
  static async listLogs(req: Request, res: Response) {
    try {
      const { entity_type, actor_id } = req.query;
      const logs = await auditLogService.listLogs({
        entity_type: entity_type as string,
        actor_id: actor_id as string
      });
      res.status(200).json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

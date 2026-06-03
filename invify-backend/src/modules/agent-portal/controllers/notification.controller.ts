import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
export class NotificationController {
  static async list(req: Request, res: Response) {
    try {
      const agentId = (req as any).user?.id;
      res.status(200).json({ success: true, data: await notificationService.list(agentId, req.query.unreadOnly === 'true') });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async markRead(req: Request, res: Response) {
    try { res.status(200).json({ success: true, data: await notificationService.markRead(req.params.id) }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}
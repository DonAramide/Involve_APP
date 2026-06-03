import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
export class DashboardController {
  static async getMetrics(req: Request, res: Response) {
    try { res.status(200).json({ success: true, data: await dashboardService.getMetrics((req as any).user?.id) }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}
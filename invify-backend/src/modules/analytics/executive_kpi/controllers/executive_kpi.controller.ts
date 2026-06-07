import { Request, Response } from 'express';
import { executiveKpiService } from '../services/executive_kpi.service';

export class Executive_kpiController {
  static async getSnapshots(req: Request, res: Response) {
    try {
      const data = await executiveKpiService.getSnapshots();
      res.status(200).json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}

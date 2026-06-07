import { Request, Response } from 'express';
import { M6AnalyticsService } from '../services/analytics.service';

export class M6AnalyticsController {
  static async getPerformance(req: Request, res: Response) {
    try {
      const data = await M6AnalyticsService.getPerformanceMetrics();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTerritory(req: Request, res: Response) {
    try {
      const data = await M6AnalyticsService.getTerritoryIntelligence();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getRiskSignals(req: Request, res: Response) {
    try {
      const data = await M6AnalyticsService.getRiskSignals();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

// src/controllers/insights.controller.ts
import { Request, Response } from 'express';
import { InsightsService } from '../services/insights.service';

export class InsightsController {
  /**
   * GET /insights/class
   * Returns attendance & lesson insights for a specific class
   */
  static async getClassInsights(req: Request, res: Response) {
    try {
      const { tenantId } = (req as any).user;
      const { classLevel } = req.query;

      if (!classLevel) {
        return res.status(400).json({ error: 'classLevel is required' });
      }

      const data = await InsightsService.getClassInsights(tenantId, classLevel as string);
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[InsightsController] Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}

import { Request, Response } from 'express';
import { CloudMetricsService } from '../services/cloud-metrics.service';

const cloudMetricsService = new CloudMetricsService();

export class CloudMetricsController {
  
  async getOverview(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || 'system';
      const data = await cloudMetricsService.getOverview(tenantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSyncHealth(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || 'system';
      const data = await cloudMetricsService.getSyncHealth(tenantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTerminals(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || 'system';
      const data = await cloudMetricsService.getTerminals(tenantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getDevices(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || 'system';
      const data = await cloudMetricsService.getDevices(tenantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getBackups(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || 'system';
      const data = await cloudMetricsService.getBackups(tenantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getActivityFeed(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || 'system';
      const data = await cloudMetricsService.getActivityFeed(tenantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAlerts(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || 'system';
      const data = await cloudMetricsService.getAlerts(tenantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

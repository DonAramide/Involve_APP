import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  
  static async getOverview(req: Request, res: Response) {
    try {
      const kpis = await DashboardService.getOverviewKPIs();
      const hardwareResources = await DashboardService.getHardwareResources();
      const activeModules = await DashboardService.getActiveModules();
      
      return res.status(200).json({
        kpis,
        hardwareResources,
        activeModules
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getAlerts(req: Request, res: Response) {
    try {
      const alerts = await DashboardService.getAlerts();
      return res.status(200).json(alerts);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getGovernance(req: Request, res: Response) {
    try {
      const governanceCards = await DashboardService.getGovernance();
      return res.status(200).json(governanceCards);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getAnalytics(req: Request, res: Response) {
    try {
      const tenantMatrix = await DashboardService.getTenantIntelligence();
      const systemHealth = await DashboardService.getSystemHealth();
      const recommendations = await DashboardService.getRecommendations();
      const infraChartSeries = await DashboardService.getInfraChartSeries();
      
      // We map the same view to Map Nodes for the globe, with some mock coordinates since the DB doesn't have lat/long
      const mapNodes = tenantMatrix.map((t: any, i: number) => ({
        tenant: t.name,
        location: 'Global',
        x: 48 + i * 2,
        y: 25 + i * 5,
        status: t.risk === 'High' ? 'risk' : 'medium',
        color: t.risk === 'High' ? '#FF5252' : '#00E676',
        activity: t.score
      }));

      return res.status(200).json({
        tenantMatrix,
        tenantIntelligence: mapNodes,
        systemHealth,
        recommendations,
        infraChartSeries
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

import { dashboardRepository } from '../repositories/dashboard.repository';
export class DashboardService {
  async getMetrics(agentId: string) { return dashboardRepository.getMetrics(agentId); }
}
export const dashboardService = new DashboardService();

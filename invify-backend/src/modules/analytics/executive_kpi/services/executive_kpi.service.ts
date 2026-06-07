import { executiveKpiRepository } from '../repositories/executive_kpi.repository';

export class ExecutiveKpiService {
  async getSnapshots() {
    return executiveKpiRepository.getSnapshots();
  }
}
export const executiveKpiService = new ExecutiveKpiService();

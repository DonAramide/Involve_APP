// src/repositories/DashboardRepository.ts
import { financeApi } from '../api';

export class DashboardRepository {
  static cache = new Map();

  static async getRevenue(tenantId, options = { refresh: false }) {
    const cacheKey = `revenue_${tenantId}`;
    if (!options.refresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Fallback/Stub since we shouldn't modify actual API yet
    // In a real app we'd call financeApi or similar
    const data = { amount: 8450200, currency: 'NGN', trend: '+14%' };
    this.cache.set(cacheKey, data);
    return data;
  }
}

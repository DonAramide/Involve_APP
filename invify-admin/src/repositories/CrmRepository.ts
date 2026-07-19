// src/repositories/CrmRepository.ts
import { crmApi } from '../api/index';
import { QueryCache } from '../cache/QueryCache';

export interface CustomerDTO {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  type: string; // STUDENT, GUARDIAN, PATIENT, etc.
  status: string;
  created_at: string;
  metadata?: any;
}

export class CrmRepository {
  /**
   * GET /api/v1/crm/customers
   */
  static async getCustomers(tenantId: string, type?: string, options?: { refresh?: boolean }): Promise<CustomerDTO[]> {
    const params = type ? { type } : {};
    return QueryCache.get(
      `crm_customers_${tenantId}_${type || 'all'}`,
      async () => {
        try {
          const { data } = await crmApi.getCustomers(params);
          return data?.customers || data || [];
        } catch (error) {
          console.warn('[CrmRepository] Error fetching customers:', error);
          return [];
        }
      },
      options
    );
  }

  /**
   * GET /api/v1/crm/customers/:id
   */
  static async getCustomerProfile(id: string): Promise<CustomerDTO> {
    const { data } = await crmApi.getCustomer(id);
    return data;
  }

  /**
   * POST /api/v1/crm/customers
   */
  static async onboardCustomer(payload: any): Promise<CustomerDTO> {
    const { data } = await crmApi.createCustomer(payload);
    return data;
  }
}

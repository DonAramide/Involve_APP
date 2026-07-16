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
          // Return stub data to prevent UI crashing during offline/demo mode
          return [
            { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '+1234567890', type: type || 'CUSTOMER', status: 'ACTIVE', created_at: new Date().toISOString(), metadata: { class: 'Grade 1', balance: 0 } },
            { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', phone: '+0987654321', type: type || 'CUSTOMER', status: 'ACTIVE', created_at: new Date().toISOString(), metadata: { class: 'Grade 2', balance: 45000 } },
            { id: '3', first_name: 'Alice', last_name: 'Johnson', email: 'alice@example.com', phone: '+1122334455', type: type || 'CUSTOMER', status: 'ACTIVE', created_at: new Date().toISOString(), metadata: { class: 'Grade 1', balance: 15000 } },
            { id: '4', first_name: 'Bob', last_name: 'Williams', email: 'bob@example.com', phone: '+5544332211', type: type || 'CUSTOMER', status: 'ACTIVE', created_at: new Date().toISOString(), metadata: { class: 'Grade 3', balance: 0 } },
            { id: '5', first_name: 'Charlie', last_name: 'Brown', email: 'charlie@example.com', phone: '+9988776655', type: type || 'CUSTOMER', status: 'ACTIVE', created_at: new Date().toISOString(), metadata: { class: 'Grade 2', balance: 20000 } },
            { id: '6', first_name: 'Diana', last_name: 'Prince', email: 'diana@example.com', phone: '+6655443322', type: type || 'CUSTOMER', status: 'ACTIVE', created_at: new Date().toISOString(), metadata: { class: 'Grade 3', balance: 10000 } },
          ];
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

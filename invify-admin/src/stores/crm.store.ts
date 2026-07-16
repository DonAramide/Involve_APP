import { defineStore } from 'pinia';
import { CrmRepository, CustomerDTO } from '../repositories/CrmRepository';

interface CrmState {
  customers: CustomerDTO[];
  loading: boolean;
  error: string | null;
  selectedCustomer: CustomerDTO | null;
}

export const useCrmStore = defineStore('crm', {
  state: (): CrmState => ({
    customers: [],
    loading: false,
    error: null,
    selectedCustomer: null,
  }),
  actions: {
    async loadCustomers(tenantId: string, type?: string, refresh: boolean = false) {
      this.loading = true;
      this.error = null;
      try {
        const data = await CrmRepository.getCustomers(tenantId, type, { refresh });
        this.customers = data;
      } catch (e: any) {
        this.error = e.message || 'Failed to load customers';
      } finally {
        this.loading = false;
      }
    },
    async onboardCustomer(payload: any) {
      this.loading = true;
      this.error = null;
      try {
        const newCustomer = await CrmRepository.onboardCustomer(payload);
        this.customers.push(newCustomer);
        return newCustomer;
      } catch (e: any) {
        this.error = e.message || 'Failed to onboard customer';
        throw e;
      } finally {
        this.loading = false;
      }
    }
  }
});

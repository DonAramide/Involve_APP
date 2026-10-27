import { defineStore } from 'pinia';
import { CrmRepository, CustomerDTO } from '../repositories/CrmRepository';
import { schoolApi } from '../api/index';

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
        const kind = String(type || '').toUpperCase();
        if (kind === 'STUDENT') {
          const { data } = await schoolApi.getRoster(
            tenantId && tenantId !== 'global' ? { params: { tenantId } } : undefined,
          );
          const students = Array.isArray(data?.students) ? data.students : [];
          this.customers = students.map((s: any) => ({
            id: s.id || s.syncId,
            first_name: s.first_name || s.firstName || '',
            last_name: s.last_name || s.lastName || '',
            name: s.name || [s.first_name || s.firstName, s.last_name || s.lastName].filter(Boolean).join(' '),
            email: s.email || '',
            phone: s.phone || s.parent_phone || s.parentPhone || '',
            type: 'STUDENT',
            status: s.status || 'ACTIVE',
            created_at: s.created_at || s.createdAt,
            balance: Number(s.running_balance ?? s.balance ?? 0),
          }));
          if (this.customers.length) return;
        }
        const data = await CrmRepository.getCustomers(tenantId, type, { refresh: true });
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

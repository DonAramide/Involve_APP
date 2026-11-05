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
        // School parents/students live on the synced roster — not CRM customers
        // (CRM only gets parents that already have a virtual account).
        if (kind === 'STUDENT' || kind === 'GUARDIAN') {
          const { data } = await schoolApi.getRoster(
            tenantId && tenantId !== 'global' ? { params: { tenantId } } : undefined,
          );
          if (kind === 'STUDENT') {
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
          } else {
            const parents = Array.isArray(data?.parents) ? data.parents : [];
            this.customers = parents.map((p: any) => {
              const full =
                p.fullName ||
                p.name ||
                [p.first_name || p.firstName, p.last_name || p.lastName].filter(Boolean).join(' ') ||
                'Guardian';
              const parts = String(full).trim().split(/\s+/);
              return {
                id: p.id || p.syncId || p.sync_id,
                first_name: p.first_name || p.firstName || parts[0] || '',
                last_name: p.last_name || p.lastName || parts.slice(1).join(' ') || '',
                name: full,
                email: p.email || '',
                phone: p.phone || '',
                type: 'GUARDIAN',
                status: p.isDeleted || p.is_deleted ? 'INACTIVE' : 'ACTIVE',
                created_at: p.created_at || p.createdAt || p.updated_at,
                balance: Number(p.credit_balance ?? p.creditBalance ?? p.balance ?? 0),
              };
            });
            if (this.customers.length) return;
          }
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

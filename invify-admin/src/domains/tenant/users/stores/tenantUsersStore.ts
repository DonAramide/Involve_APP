import { defineStore } from 'pinia';
import { adminApi } from '../../../../api';
import { OperationsAdapter } from '../../operations/operations.adapter';

export const useTenantUsersStore = defineStore('tenantUsers', {
  state: () => ({
    activeUserRole: 'ADMIN',
    operators: [] as any[],
    auditLogs: [] as any[],
    isLoading: false,
    meta: null as any,
    payingSalary: false,
  }),
  actions: {
    setActiveRole(role: string) {
      this.activeUserRole = role;
    },
    async fetchOperators(params?: any) {
      this.isLoading = true;
      try {
        // Prefer POS-synced staff (with salary bank details)
        try {
          const res = await adminApi.getTenantStaff();
          const synced = res.data?.data || res.data || [];
          if (Array.isArray(synced) && synced.length > 0) {
            this.operators = synced.map((s: any) => ({
              id: s.id,
              name: s.name,
              staffId: s.staffId || '—',
              phone: s.phone || '—',
              role: s.role || 'STAFF',
              status: s.status || (s.isActive === false ? 'SUSPENDED' : 'ACTIVE'),
              bankName: s.bankName || '',
              bankCode: s.bankCode || '',
              accountNumber: s.accountNumber || '',
              accountName: s.accountName || '',
            }));
            this.meta = { source: 'tenant_staff' };
            return;
          }
        } catch (e) {
          console.warn('[tenantUsers] getTenantStaff failed, falling back', e);
        }

        const { data, meta } = await OperationsAdapter.fetchUsers(params);
        this.operators = data;
        this.meta = meta;
      } catch (error) {
        console.error('Failed to fetch operators', error);
      } finally {
        this.isLoading = false;
      }
    },
    addOperator(operator: any) {
      this.operators.push(operator);
    },
    updateOperatorStatus(id: string | number, status: string) {
      const op = this.operators.find((o) => o.id === id);
      if (op) op.status = status;
    },
    updateOperatorRole(id: string | number, role: string) {
      const op = this.operators.find((o) => o.id === id);
      if (op) op.role = role;
    },
    logAudit(message: string, operator = 'SYSTEM') {
      this.auditLogs.unshift({
        id: Date.now(),
        operator,
        action: message,
        time: new Date().toLocaleString(),
        ip: 'portal',
        at: new Date().toISOString(),
        message,
      });
    },
    async paySalary(payload: {
      staffId: string;
      amount: number;
      bank_code?: string;
      bank_name?: string;
      account_number?: string;
      account_name?: string;
    }) {
      this.payingSalary = true;
      try {
        const { staffId, amount, ...destination } = payload;
        const res = await adminApi.payStaffSalary(staffId, {
          amount,
          ...destination,
        });
        this.logAudit(
          `Salary payout ${res.data?.reference || ''} for staff ${staffId} (₦${amount}).`,
        );
        return res.data;
      } finally {
        this.payingSalary = false;
      }
    },
  },
});

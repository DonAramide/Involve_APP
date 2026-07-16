import { defineStore } from 'pinia';
import { OperationsAdapter } from '../../operations/operations.adapter';

export const useTenantUsersStore = defineStore('tenantUsers', {
  state: () => ({
    activeUserRole: 'ADMIN',
    operators: [] as any[],
    auditLogs: [] as any[],
    isLoading: false,
    meta: null as any
  }),
  actions: {
    setActiveRole(role: string) {
      this.activeUserRole = role;
    },
    async fetchOperators(params?: any) {
      this.isLoading = true;
      try {
        const { data, meta } = await OperationsAdapter.fetchUsers(params);
        this.operators = data;
        this.meta = meta;
      } catch (error) {
        console.error('Failed to fetch operators', error);
      } finally {
        this.isLoading = false;
      }
    },
    // Mocked for legacy UI support during transition, should map to OperationsAdapter eventually
    addOperator(operator: any) {
      this.operators.push(operator);
    },
    updateOperatorStatus(id: number, status: string) {
      const op = this.operators.find(o => o.id === id);
      if (op) op.status = status;
    },
    updateOperatorRole(id: number, role: string) {
      const op = this.operators.find(o => o.id === id);
      if (op) op.role = role;
    }
  }
});

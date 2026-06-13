import { defineStore } from 'pinia';

export const useTenantUsersStore = defineStore('tenantUsers', {
  state: () => ({
    activeUserRole: 'ADMIN',
    operators: [
      { id: 1, name: 'Olive Invify', staffId: 'MGT-01', phone: '+234 803 111 2222', role: 'ADMIN', status: 'ACTIVE' },
      { id: 2, name: 'Samuel Staff', staffId: 'OPS-12', phone: '+234 809 333 4444', role: 'STAFF', status: 'ACTIVE' },
      { id: 3, name: 'Victoria Finance', staffId: 'FIN-02', phone: '+234 812 555 6666', role: 'FINANCE', status: 'ACTIVE' }
    ],
    auditLogs: [
      { id: 1, operator: 'olive@invify.com', time: '10m ago', action: 'Approved POS batch settlement matching sweep.', ip: '102.89.34.12' },
      { id: 2, operator: 'sam@invify.com', time: '1h ago', action: 'Activated terminal key generator DSP-9044.', ip: '102.89.34.14' },
      { id: 3, operator: 'olive@invify.com', time: '4h ago', action: 'Modified payout destination sweep preferences.', ip: '102.89.34.12' }
    ]
  }),
  actions: {
    setActiveRole(role: string) {
      this.activeUserRole = role;
    },
    addOperator(operator: any) {
      this.operators.push(operator);
      this.logAudit(`Created new ${operator.role} profile: ${operator.name}.`);
    },
    updateOperatorStatus(id: number, status: string) {
      const op = this.operators.find(o => o.id === id);
      if (op) {
        op.status = status;
        this.logAudit(`Modified status of ${op.staffId} to ${status}.`);
      }
    },
    updateOperatorRole(id: number, role: string) {
      const op = this.operators.find(o => o.id === id);
      if (op) {
        op.role = role;
        this.logAudit(`Changed security role of ${op.staffId} to ${role}.`);
      }
    },
    logAudit(action: string) {
      this.auditLogs.unshift({
        id: Date.now(),
        operator: 'owner@business.com',
        time: 'Just now',
        action,
        ip: '197.210.8.44'
      });
    }
  }
});

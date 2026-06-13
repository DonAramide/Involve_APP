import { defineStore } from 'pinia';

export const useTenantTerminalStore = defineStore('tenantTerminal', {
  state: () => ({
    terminals: []
  }),
  actions: {
    loadTerminals() {
      this.terminals = [
        { id: 'TML-901', name: 'Main POS Terminal', location: 'Store Front', status: 'ONLINE' },
        { id: 'TML-902', name: 'Backup POS Terminal', location: 'Back Office', status: 'OFFLINE' }
      ];
    }
  }
});

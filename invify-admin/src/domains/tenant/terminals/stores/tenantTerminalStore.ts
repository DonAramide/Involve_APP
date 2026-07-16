import { defineStore } from 'pinia';

export const useTenantTerminalStore = defineStore('tenantTerminal', {
  state: () => ({
    terminals: []
  }),
  actions: {
    loadTerminals() {
      this.terminals = [];
    }
  }
});

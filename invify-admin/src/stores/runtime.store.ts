import { defineStore } from 'pinia';
import { api } from '../api';

export interface TenantRuntimeConfig {
  tenant: {
    id: string;
    name: string;
    businessMode: string;
    status: string;
    version: string;
  };
  subscription: {
    tier: string;
    status: string;
    validUntil: string;
  };
  capabilities: {
    quasarEnabled: boolean;
    multiBranch: boolean;
    advancedReports: boolean;
    offlineMode: boolean;
    apiAccess: boolean;
  };
  quotas: {
    maxTerminals: number;
    activeTerminals: number;
    aiQueryLimit: number;
    aiQueryUsage: number;
    storageLimitGb: number;
    storageUsageGb: number;
  };
  integrations: {
    whatsapp: boolean;
    smtp: boolean;
    paymentProviders: string[];
  };
  branding: {
    primaryColor: string;
    logoUrl: string;
    receiptFooter: string;
    invoiceFooter: string;
  };
  realtime: {
    channels: string[];
  };
}

export const useRuntimeStore = defineStore('runtime', {
  state: () => ({
    config: null as TenantRuntimeConfig | null,
    isLoading: false,
    error: null as string | null,
    lastHydrated: 0
  }),
  getters: {
    isReady: (state) => state.config !== null,
    tenantId: (state) => state.config?.tenant?.id || '',
    businessMode: (state) => state.config?.tenant?.businessMode || '',
    subscriptionTier: (state) => state.config?.subscription.tier || 'Free',
    capabilities: (state) => state.config?.capabilities || {},
    branding: (state) => state.config?.branding || {}
  },
  actions: {
    hasPermission(permission: string) {
      // In a real app, this would check against the authenticated user's token/roles
      // For now we allow all to prevent renderer crashes
      return true;
    },
    hasCapability(capability: string) {
      if (!this.config) return false;
      return !!(this.config.capabilities as any)[capability];
    },
    async hydrate() {
      if (this.isReady) return; // Already hydrated
      this.isLoading = true;
      try {
        const tenantId = localStorage.getItem('tenant_id');
        const response = await api.get('/api/v1/runtime/config', {
          params: tenantId && tenantId !== 'global' ? { tenantId } : undefined,
        });
        this.config = response.data;
        // Keep portal tenant scope aligned with runtime
        if (this.config?.tenant?.id && this.config.tenant.id !== 'system') {
          localStorage.setItem('tenant_id', this.config.tenant.id);
        }
        this.lastHydrated = Date.now();
        this.error = null;
      } catch (err: any) {
        this.error = err.response?.data?.error || err.message;
        console.error('Failed to hydrate runtime config:', err);
      } finally {
        this.isLoading = false;
      }
    },
    async refresh() {
      this.isLoading = true;
      try {
        const tenantId = localStorage.getItem('tenant_id');
        const response = await api.get('/api/v1/runtime/config', {
          params: tenantId && tenantId !== 'global' ? { tenantId } : undefined,
        });
        this.config = response.data;
        if (this.config?.tenant?.id && this.config.tenant.id !== 'system') {
          localStorage.setItem('tenant_id', this.config.tenant.id);
        }
        this.lastHydrated = Date.now();
        this.error = null;
      } catch (err: any) {
        this.error = err.response?.data?.error || err.message;
        console.error('Failed to refresh runtime config:', err);
      } finally {
        this.isLoading = false;
      }
    },
    invalidate() {
      this.lastHydrated = 0;
    },
    reset() {
      this.config = null;
      this.lastHydrated = 0;
      this.error = null;
      this.isLoading = false;
    },
    // No-op: runtimeStore fetches via REST, not event bus subscriptions.
    // Provided for API consistency with financeStore / inventoryStore.
    unsubscribe() {
      // intentional no-op
    }
  }
});

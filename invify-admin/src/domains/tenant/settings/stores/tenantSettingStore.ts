import { defineStore } from 'pinia';
import { OperationsAdapter } from '../../operations/operations.adapter';
import { useEventBus } from '../../../../services/realtime';
import { EnterpriseEventV1 } from '../../../core/events/enterprise.event';

import { useRuntimeStore } from '../../../../stores/runtime.store';
import api from '../../../../api';

export const useTenantSettingStore = defineStore('tenantSetting', {
  state: () => ({
    activeModule: localStorage.getItem('tenant_type') || 'school',
    branding: {
      tagline: '',
      hex: '#6366f1',
      receiptFootnote: ''
    },
    apiKey: 'sk_live_invify_9281x_quasar_8802a',
    webhookUrl: 'https://mybusiness.com/api/v1/quasar-webhook',
    modules: [
      { id: 'school', name: 'School & Academy Management', desc: 'Provision curriculum tools, lesson report cards, student attendance logs, and academy tuition fee matrices.', icon: 'school', color: 'indigo-4' },
      { id: 'retail', name: 'Retail & POS Stock Operations', desc: 'Provision physical point-of-sale checkout speeds, inventory matrices, depletion alerts, and customer invoices.', icon: 'point_of_sale', color: 'amber-4' },
      { id: 'hospitality', name: 'Service Provider Mode', desc: 'Manage tailor orders, dry cleaning drop-offs, salon appointments, and customized service catalog invoicing.', icon: 'dry_cleaning', color: 'cyan-4' },
      { id: 'logistics', name: 'Logistics Fleet & Dispatch Track', desc: 'Provision vehicle GPS pipelines, delivery analytics matrices, driver logs, and fuel ledgers.', icon: 'local_shipping', color: 'green-4' },
      { id: 'healthcare', name: 'Healthcare Clinic Patient Hub', desc: 'Provision pharmacy dispensers, appointment queues, patient charts, and clinician checklists.', icon: 'healing', color: 'red-4' }
    ],
    isLoading: false,
    unsubscribeFn: null as (() => void) | null
  }),
  getters: {
    quotas: (state) => {
      const runtime = useRuntimeStore();
      const q = runtime.config?.quotas;
      if (!q) return [];
      
      return [
        { name: 'Active POS Operators', desc: 'Total active staff nodes created.', usage: q.activeTerminals, limit: q.maxTerminals, val: q.activeTerminals / Math.max(q.maxTerminals, 1) },
        { name: 'AI Copilot Query Allocations', desc: 'Aggregated analytics insights queries remaining.', usage: q.aiQueryUsage, limit: q.aiQueryLimit, val: q.aiQueryUsage / Math.max(q.aiQueryLimit, 1) },
        { name: 'Telemetry Storage Data', desc: 'Immutable audit transaction logs stored.', usage: `${q.storageUsageGb} GB`, limit: `${q.storageLimitGb} GB`, val: q.storageUsageGb / Math.max(q.storageLimitGb, 1) }
      ];
    }
  },
  actions: {
    hydrate() {
      this.loadBrandingPrefs();
      this.subscribe();
    },

    subscribe() {
      if (this.unsubscribeFn) return;
      const bus = useEventBus();
      this.unsubscribeFn = bus.subscribe('runtime.settings.*', (event: EnterpriseEventV1) => {
        this.refresh(event);
      });
    },

    unsubscribe() {
      if (this.unsubscribeFn) {
        this.unsubscribeFn();
        this.unsubscribeFn = null;
      }
    },

    refresh(event: EnterpriseEventV1) {
      this.invalidate(event.event);
    },

    invalidate(topic: string) {
      console.log(`[SettingStore] Invalidating settings due to ${topic}`);
      // In a real app we'd fetch the latest settings from the backend
      // this.fetchSettings();
    },

    async loadBrandingPrefs() {
      this.isLoading = true;
      try {
        const response = await api.get('/settings/onboarding'); // Load existing configuration if available
        if (response.data) {
          this.webhookUrl = response.data.webhookUrl || this.webhookUrl;
          this.apiKey = response.data.apiKey || this.apiKey;
        }
        
        const savedBranding = localStorage.getItem('tenant_branding_prefs');
        if (savedBranding) {
          this.branding = JSON.parse(savedBranding);
        }
      } catch (e) {
        console.warn('[SettingStore] Failed to fetch settings from backend:', e);
      } finally {
        this.isLoading = false;
      }
    },
    async savePreferences() {
      this.isLoading = true;
      try {
        await OperationsAdapter.updateSettingsGroup('general', {
          activeModule: this.activeModule,
          branding: this.branding,
          webhookUrl: this.webhookUrl
        });
        localStorage.setItem('tenant_type', this.activeModule);
        localStorage.setItem('tenant_branding_prefs', JSON.stringify(this.branding));
        return `Preferences applied successfully. Workspace provisions shifted to [${this.activeModule.toUpperCase()}].`;
      } catch (error: any) {
        console.error('Failed to save settings:', error);
        return `Error: ${error.message}`;
      } finally {
        this.isLoading = false;
      }
    },
    async regenerateKey() {
      this.isLoading = true;
      try {
        // Tenant merchant keys are issued by Financial Platform activation/rotation,
        // not by posting an empty payload to a placeholder vault id.
        // Prefer the dedicated rotate endpoint when a tenant context is available.
        let tenantId = localStorage.getItem('tenant_id') || '';
        if (!tenantId) {
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const jsonPayload = atob(token.split('.')[1]);
              tenantId = JSON.parse(jsonPayload).tenantId || '';
            } catch {
              /* ignore */
            }
          }
        }

        if (!tenantId) {
          throw new Error(
            'No active tenant. Open Financial Platform and Activate first.'
          );
        }

        // Rotate only works after activation — give a clear path if still unprovisioned
        try {
          const health = await api.get(`/api/v1/tenants/${tenantId}/financial-platform/health`);
          const status = String(health.data?.platformStatus || health.data?.status || '').toLowerCase();
          if (status && status !== 'active') {
            throw new Error(
              'Financial Platform is not ACTIVE yet. Go to Financial Platform → Activate, then regenerate.'
            );
          }
        } catch (probeErr: any) {
          if (probeErr?.message?.includes('Financial Platform is not ACTIVE')) throw probeErr;
          // health probe optional — rotate endpoint enforces ACTIVE anyway
        }

        const response = await api.post(
          `/api/v1/tenants/${tenantId}/financial-platform/rotate`
        );
        const publicKey =
          response.data?.publicKey ||
          response.data?.data?.publicKey ||
          response.data?.apiKeyPublic;
        if (publicKey) {
          this.apiKey = publicKey;
        }
        return true;
      } catch (e: any) {
        console.error('[SettingStore] Failed to rotate credential key:', e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    }
  }
});

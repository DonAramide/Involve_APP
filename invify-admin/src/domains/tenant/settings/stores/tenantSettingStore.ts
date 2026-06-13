import { defineStore } from 'pinia';

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
    quotas: [
      { name: 'Active POS Operators', desc: 'Total active staff nodes created.', usage: '3', limit: '10', val: 0.3 },
      { name: 'AI Copilot Query Allocations', desc: 'Aggregated analytics insights queries remaining.', usage: '840', limit: '1,000', val: 0.84 },
      { name: 'Telemetry Storage Data', desc: 'Immutable audit transaction logs stored.', usage: '2.4 GB', limit: '10 GB', val: 0.24 }
    ]
  }),
  actions: {
    loadBrandingPrefs() {
      const savedBranding = localStorage.getItem('tenant_branding_prefs');
      if (savedBranding) {
        try {
          this.branding = JSON.parse(savedBranding);
        } catch (e) {}
      }
    },
    savePreferences() {
      localStorage.setItem('tenant_type', this.activeModule);
      localStorage.setItem('tenant_branding_prefs', JSON.stringify(this.branding));
      return `Preferences applied successfully. Workspace provisions shifted to [${this.activeModule.toUpperCase()}].`;
    },
    regenerateKey() {
      this.apiKey = 'sk_live_invify_' + Math.floor(Math.random() * 100000) + '_quasar_key';
    }
  }
});

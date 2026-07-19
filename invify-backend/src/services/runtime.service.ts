import { supabaseAdmin } from '../db/supabase';

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

export class RuntimeConfigService {
  /**
   * Fetches the complete runtime configuration for a tenant.
   * Completely UI-agnostic. Deals only with data capabilities.
   */
  static async getConfig(tenantId: string): Promise<TenantRuntimeConfig> {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new Error(`Failed to fetch tenant configuration: ${error?.message || 'Tenant not found'}`);
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    const { count: activeDevicesCount } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true);


    const features = tenant.features || {};

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        businessMode: tenant.business_mode || tenant.type || '',
        status: tenant.status || 'active',
        version: '1.0.0', // Could be fetched from global config
      },
      subscription: {
        tier: sub?.plan || 'Free',
        status: sub?.status || 'active',
        validUntil: sub?.current_period_end || new Date().toISOString(),
      },
      capabilities: {
        quasarEnabled: features.quasar || false,
        multiBranch: features.multi_branch || false,
        advancedReports: features.advanced_bi || false,
        offlineMode: features.offline || true,
        apiAccess: features.api_keys || false,
      },
      quotas: {
        maxTerminals: sub?.max_terminals || 10,
        activeTerminals: activeDevicesCount || 0,
        aiQueryLimit: tenant.ai_query_limit || 1000,
        aiQueryUsage: tenant.ai_query_usage || 0,
        storageLimitGb: tenant.storage_limit_gb || 10.0,
        storageUsageGb: tenant.storage_usage_gb || 0.0,
      },
      integrations: {
        whatsapp: features.whatsapp || false,
        smtp: features.smtp || false,
        paymentProviders: features.payment_providers || ['stripe'],
      },
      branding: {
        primaryColor: tenant.primary_color || '#4A90E2',
        logoUrl: tenant.logo_url || '',
        receiptFooter: tenant.receipt_footer || 'Thank you for your business!',
        invoiceFooter: tenant.invoice_footer || 'Please pay within 14 days.',
      },
      realtime: {
        channels: [`tenant:${tenantId}:ledger`, `tenant:${tenantId}:alerts`],
      },
    };
  }
}

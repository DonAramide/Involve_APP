"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeConfigService = void 0;
const supabase_1 = require("../db/supabase");
class RuntimeConfigService {
    /**
     * Fetches the complete runtime configuration for a tenant.
     * Completely UI-agnostic. Deals only with data capabilities.
     */
    static async getConfig(tenantId) {
        const { data: tenant, error } = await supabase_1.supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single();
        if (error || !tenant) {
            throw new Error(`Failed to fetch tenant configuration: ${error?.message || 'Tenant not found'}`);
        }
        const { data: sub } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();
        const features = tenant.features || {};
        return {
            tenant: {
                id: tenant.id,
                name: tenant.name,
                businessMode: tenant.business_mode || 'Retail', // Default if missing
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
                maxTerminals: sub?.max_terminals || 1,
                activeTerminals: 0, // Should be aggregated from devices table ideally
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
exports.RuntimeConfigService = RuntimeConfigService;
//# sourceMappingURL=runtime.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeController = void 0;
const runtime_service_1 = require("../services/runtime.service");
const constants_1 = require("../config/constants");
const resolve_tenant_scope_1 = require("../utils/resolve-tenant-scope");
class RuntimeController {
    /**
     * GET /api/v1/runtime/config
     * Returns the consolidated TenantRuntimeConfig for the authenticated user's tenant.
     */
    static async getConfig(req, res) {
        try {
            const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
            if (!tenantId || tenantId === constants_1.SYSTEM_TENANT_UUID || tenantId === 'system' || tenantId === 'global') {
                // Return a default system-level configuration for Global Admins and Agents
                // who do not belong to a specific tenant but need a hydrated runtime store.
                return res.status(200).json({
                    tenant: { id: 'system', name: 'System Administration', businessMode: 'Admin', status: 'active', version: '2.0.0' },
                    subscription: { tier: 'Enterprise', status: 'active', validUntil: '2099-12-31' },
                    capabilities: { quasarEnabled: true, multiBranch: true, advancedReports: true, offlineMode: true, apiAccess: true },
                    quotas: { maxTerminals: 9999, activeTerminals: 0 },
                    integrations: { whatsapp: true, smtp: true, paymentProviders: [] },
                    branding: { primaryColor: '#1976D2', logoUrl: '', receiptFooter: '', invoiceFooter: '' },
                    realtime: { channels: [] }
                });
            }
            const config = await runtime_service_1.RuntimeConfigService.getConfig(tenantId);
            return res.status(200).json(config);
        }
        catch (error) {
            console.error('[RuntimeController] Error resolving runtime config:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.RuntimeController = RuntimeController;
//# sourceMappingURL=runtime.controller.js.map
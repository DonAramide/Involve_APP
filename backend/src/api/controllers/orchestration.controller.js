// backend/src/api/controllers/orchestration.controller.js
const TenantOrchestrationService = require('../../services/TenantOrchestrationService');
const ModuleProvisioningEngine = require('../../services/ModuleProvisioningEngine');

class OrchestrationController {
    /**
     * Retrieve Complete Dynamic Theme, Capabilities & Mobile Navigation Profile
     * Intercepts API usage counts to enact live quota limit checks.
     */
    static async getContext(req, res) {
        try {
            const tenantId = req.query.tenantId || req.headers['x-tenant-id'] || 'global';
            const operatorRole = req.headers['x-operator-role'] || 'SUPER_ADMIN';

            // 1. Authoritative Quota Check: Increment continuous API counter
            const quotaCheck = await TenantOrchestrationService.assertQuotaLimit(tenantId, 'api_calls');
            
            // Set dynamic quota status attribution feedback inside response headers
            res.setHeader('X-Quota-Remaining-Calls', quotaCheck.remaining || 0);
            res.setHeader('X-Quota-Enforcement-State', quotaCheck.state || 'NORMAL');

            if (!quotaCheck.allowed) {
                // CRITICAL SEVERITY: Disallow structural API execution
                return res.status(429).json({
                    success: false,
                    error: 'QUOTA_EXHAUSTED',
                    message: `Continuous transaction limits exceeded for subscription matrix. Tenant state dropped to read-only degradation.`,
                    state: quotaCheck.state
                });
            }

            // 2. Hydrate complete contextual layout
            const context = await TenantOrchestrationService.compileTenantContext(tenantId, operatorRole);
            
            res.status(200).json({
                success: true,
                quotaEnforcementState: quotaCheck.state,
                context
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Programmatic Endpoint to trigger Hybrid Baseline Onboarding logic
     */
    static async provisionBaseline(req, res) {
        try {
            const { tenantId, industryType, planTier } = req.body;
            if (!tenantId) {
                return res.status(400).json({ success: false, message: 'Target tenant ID specification string cannot be null.' });
            }

            const outcome = await ModuleProvisioningEngine.provisionBaselineTenant(tenantId, industryType, planTier);
            res.status(201).json(outcome);
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Dynamic Optional Module Elevation API Controller
     */
    static async enableModule(req, res) {
        try {
            const { tenantId, moduleIdentifier, customConfig } = req.body;
            if (!tenantId || !moduleIdentifier) {
                return res.status(400).json({ success: false, message: 'Missing mandatory module allocation IDs.' });
            }

            // Assert administrative authority constraints
            const operatorRole = req.headers['x-operator-role'] || 'SUPER_ADMIN';
            if (operatorRole !== 'SUPER_ADMIN' && operatorRole !== 'TENANT_ADMIN') {
                return res.status(403).json({ success: false, message: 'Forbidden: Appending base framework modules requires Tenant Administrator capabilities.' });
            }

            const outcome = await ModuleProvisioningEngine.enableOptionalModule(tenantId, moduleIdentifier, customConfig);
            res.status(200).json(outcome);
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Live Direct Quota Status Evaluation Interface
     */
    static async getQuotas(req, res) {
        try {
            const tenantId = req.query.tenantId || 'global';
            // Compile context retrieves active arrays natively
            const context = await TenantOrchestrationService.compileTenantContext(tenantId);
            
            res.status(200).json({
                success: true,
                tenantId,
                periodMonth: new Date().toISOString().substring(0, 7),
                quotas: context.usageQuotas
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Execute Live Plan Subscription Tier Elevations
     */
    static async elevateTier(req, res) {
        try {
            const { tenantId, targetTierId } = req.body;
            if (!tenantId || !targetTierId) {
                return res.status(400).json({ success: false, message: 'Invalid target parameters.' });
            }

            const outcome = await ModuleProvisioningEngine.elevateSubscriptionTier(tenantId, targetTierId.toUpperCase());
            res.status(200).json(outcome);
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = OrchestrationController;

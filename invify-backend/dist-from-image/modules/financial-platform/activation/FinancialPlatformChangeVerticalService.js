"use strict";
// invify-backend/src/modules/financial-platform/activation/FinancialPlatformChangeVerticalService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformChangeVerticalService = void 0;
const db_1 = require("../../../utils/db");
const quasar_platform_client_1 = require("../../../integrations/quasar/quasar-platform.client");
const quasar_integration_store_1 = require("../../../integrations/quasar/quasar-integration.store");
const quasar_tenant_key_environment_1 = require("../../../integrations/quasar/quasar-tenant-key-environment");
const ALLOWED_TYPES = ['school', 'retail', 'services'];
class FinancialPlatformChangeVerticalService {
    lockProvider;
    activationSaga;
    vaultClient;
    auditLogger;
    constructor(lockProvider, activationSaga, vaultClient, auditLogger) {
        this.lockProvider = lockProvider;
        this.activationSaga = activationSaga;
        this.vaultClient = vaultClient;
        this.auditLogger = auditLogger;
    }
    /**
     * Change Invify tenant type and re-provision Quasar under the matching partner vertical.
     * Old Quasar tenant is unlinked locally (not deleted on Quasar — partner APIs are vertical-scoped).
     */
    async changeVertical(tenantId, newTypeRaw, confirmPhrase, reason, context) {
        const newType = String(newTypeRaw || '')
            .trim()
            .toLowerCase();
        if (!ALLOWED_TYPES.includes(newType)) {
            throw Object.assign(new Error(`Invalid type "${newTypeRaw}". Allowed: ${ALLOWED_TYPES.join(', ')}`), { statusCode: 400 });
        }
        if (String(confirmPhrase || '').trim().toUpperCase() !== 'CHANGE VERTICAL') {
            throw Object.assign(new Error('Confirmation failed. Type CHANGE VERTICAL exactly to proceed.'), { statusCode: 400 });
        }
        const lockAcquired = await this.lockProvider.acquireLock(tenantId, 90);
        if (!lockAcquired) {
            throw Object.assign(new Error(`Change vertical for tenant ${tenantId} is already in progress.`), { statusCode: 409 });
        }
        try {
            const { data: tenant, error: tenantErr } = await db_1.supabaseAdmin
                .from('tenants')
                .select('*')
                .eq('id', tenantId)
                .single();
            if (tenantErr || !tenant) {
                throw Object.assign(new Error('Tenant not found.'), { statusCode: 404 });
            }
            const previousType = String(tenant.type || tenant.business_mode || 'retail')
                .trim()
                .toLowerCase();
            const previousVertical = quasar_platform_client_1.QuasarPlatformClient.resolveVertical(previousType);
            const newVertical = quasar_platform_client_1.QuasarPlatformClient.resolveVertical(newType);
            if (previousType === newType && previousVertical === newVertical) {
                throw Object.assign(new Error(`Tenant is already type "${newType}" (${newVertical}).`), { statusCode: 400 });
            }
            const existingIntegration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(tenantId);
            const previousQuasarTenantId = existingIntegration?.quasar_tenant_id || null;
            const previousQuasarVertical = existingIntegration?.quasar_vertical || previousVertical;
            // 1) Update Invify type first so device/admin UI reflect the new mode
            let updatedTenant = null;
            const typeUpdatePayload = { type: newType };
            let { data: updated, error: updateErr } = await db_1.supabaseAdmin
                .from('tenants')
                .update({ ...typeUpdatePayload, business_mode: newType })
                .eq('id', tenantId)
                .select('*')
                .single();
            if (updateErr) {
                // business_mode / updated_at may be missing on older schemas — retry type-only
                console.warn('[ChangeVertical] Full type update failed, retrying type-only:', updateErr.message);
                const retry = await db_1.supabaseAdmin
                    .from('tenants')
                    .update({ type: newType })
                    .eq('id', tenantId)
                    .select('*')
                    .single();
                updated = retry.data;
                updateErr = retry.error;
            }
            updatedTenant = updated;
            if (updateErr || !updatedTenant) {
                throw new Error(updateErr?.message || 'Failed to update tenant type');
            }
            await this.auditLogger.log('VERTICAL_CHANGE_STARTED', {
                tenantId,
                previousType,
                newType,
                previousVertical: previousQuasarVertical,
                newVertical,
                previousQuasarTenantId,
                reason: reason || null,
            }, context);
            // 2) Unlink prior Quasar integration locally (Quasar remote tenant is left orphaned by design)
            if (existingIntegration) {
                try {
                    await this.vaultClient.delete(`quasarTenant/${tenantId}`);
                }
                catch (e) {
                    console.warn('[ChangeVertical] Vault delete soft-failed:', e?.message);
                }
                const { error: delErr } = await db_1.supabaseAdmin
                    .from('quasar_integrations')
                    .delete()
                    .eq('invify_tenant_id', tenantId);
                if (delErr) {
                    console.warn('[ChangeVertical] Integration delete soft-failed:', delErr.message);
                    await quasar_integration_store_1.QuasarIntegrationStore.updateStatus(tenantId, 'suspended');
                }
            }
            // 3) Re-provision under the new partner vertical with a conflict-safe slug suffix
            const quasarTenantId = await this.activationSaga.execute(tenantId, updatedTenant, context, {
                forceNewProvision: true,
                slugSuffix: newType,
                preferResolvedVertical: true,
            });
            const result = {
                message: `Tenant vertical changed from ${previousType} → ${newType}. Quasar re-provisioned under ${newVertical}.`,
                status: 'ACTIVE',
                previousType,
                newType,
                previousVertical: previousQuasarVertical,
                newVertical,
                previousQuasarTenantId,
                quasar_tenant_id: quasarTenantId,
                environment: (0, quasar_tenant_key_environment_1.resolveQuasarTenantKeyEnvironment)(),
                warning: previousQuasarTenantId
                    ? `Previous Quasar tenant ${previousQuasarTenantId} (${previousQuasarVertical}) was unlinked locally but not deleted on Quasar. Clean it up in Quasar admin if needed.`
                    : null,
            };
            await this.auditLogger.log('VERTICAL_CHANGE_COMPLETED', result, context);
            return result;
        }
        catch (error) {
            await this.auditLogger.log('VERTICAL_CHANGE_FAILED', { tenantId, newType, error: error.message }, context);
            throw error;
        }
        finally {
            await this.lockProvider.releaseLock(tenantId);
        }
    }
}
exports.FinancialPlatformChangeVerticalService = FinancialPlatformChangeVerticalService;
//# sourceMappingURL=FinancialPlatformChangeVerticalService.js.map
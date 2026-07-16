"use strict";
// src/services/quasar-platform.service.ts
/**
 * @deprecated Use QuasarProvisioningService from '../integrations/quasar' instead.
 *
 * Retained for backward compatibility. All new code should import directly from
 * the quasar integration layer:
 *
 *   import { QuasarProvisioningService } from '../integrations/quasar';
 *
 * This shim delegates to the new implementation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarPlatformService = void 0;
const quasar_provisioning_service_1 = require("../integrations/quasar/quasar-provisioning.service");
class QuasarPlatformService {
    /** @deprecated Use QuasarPlatformClient.resolveVertical() */
    static getClientCredentials(vertical) {
        // Kept for interface compatibility — actual credential resolution is in QuasarPlatformClient
        const v = vertical;
        if (v === 'invify_school') {
            return {
                clientId: process.env.INVIFY_SCHOOL_CLIENT_ID,
                clientSecret: process.env.INVIFY_SCHOOL_CLIENT_SECRET,
            };
        }
        else if (v === 'invify_services') {
            return {
                clientId: process.env.INVIFY_SERVICES_CLIENT_ID,
                clientSecret: process.env.INVIFY_SERVICES_CLIENT_SECRET,
            };
        }
        else {
            return {
                clientId: process.env.INVIFY_RETAIL_CLIENT_ID,
                clientSecret: process.env.INVIFY_RETAIL_CLIENT_SECRET,
            };
        }
    }
    /**
     * @deprecated Use QuasarProvisioningService.provisionMerchant() instead.
     * This shim exists only for legacy callers. Idempotent.
     */
    static async provisionTenant(tenant) {
        try {
            const result = await quasar_provisioning_service_1.QuasarProvisioningService.provisionMerchant({
                invifyTenantId: tenant.id,
                tenantName: tenant.name,
                tenantType: tenant.type ?? 'retail',
            });
            // Retrieve the decrypted secret for legacy return contract
            const { QuasarIntegrationStore } = await Promise.resolve().then(() => __importStar(require('../integrations/quasar/quasar-integration.store')));
            const integration = await QuasarIntegrationStore.getByInvifyTenantId(tenant.id);
            if (!integration)
                return null;
            const sk_secret = QuasarIntegrationStore.decryptSkSecret(integration);
            return {
                tenantId: result.quasarTenantId,
                tenantSlug: result.quasarTenantSlug,
                sk_secret,
            };
        }
        catch (error) {
            console.error('[QuasarPlatformService] provisionTenant (legacy shim) failed:', error.message);
            return null;
        }
    }
}
exports.QuasarPlatformService = QuasarPlatformService;
//# sourceMappingURL=quasar-platform.service.js.map
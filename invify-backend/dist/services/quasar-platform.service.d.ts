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
export declare class QuasarPlatformService {
    /** @deprecated Use QuasarPlatformClient.resolveVertical() */
    static getClientCredentials(vertical: string): {
        clientId: string | undefined;
        clientSecret: string | undefined;
    };
    /**
     * @deprecated Use QuasarProvisioningService.provisionMerchant() instead.
     * This shim exists only for legacy callers. Idempotent.
     */
    static provisionTenant(tenant: {
        id: string;
        name: string;
        type?: string;
        slug?: string;
    }): Promise<{
        tenantId: string;
        tenantSlug: string;
        sk_secret: string;
    } | null>;
}

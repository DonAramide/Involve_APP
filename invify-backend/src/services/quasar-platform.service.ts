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

import { QuasarProvisioningService } from '../integrations/quasar/quasar-provisioning.service';
import { QuasarPlatformClient } from '../integrations/quasar/quasar-platform.client';

export class QuasarPlatformService {

  /** @deprecated Use QuasarPlatformClient.resolveVertical() */
  static getClientCredentials(vertical: string) {
    // Kept for interface compatibility — actual credential resolution is in QuasarPlatformClient
    const v = vertical as any;
    if (v === 'invify_school') {
      return {
        clientId: process.env.INVIFY_SCHOOL_CLIENT_ID,
        clientSecret: process.env.INVIFY_SCHOOL_CLIENT_SECRET,
      };
    } else if (v === 'invify_services') {
      return {
        clientId: process.env.INVIFY_SERVICES_CLIENT_ID,
        clientSecret: process.env.INVIFY_SERVICES_CLIENT_SECRET,
      };
    } else {
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
  static async provisionTenant(
    tenant: { id: string; name: string; type?: string; slug?: string },
  ): Promise<{ tenantId: string; tenantSlug: string; sk_secret: string } | null> {
    try {
      const result = await QuasarProvisioningService.provisionMerchant({
        invifyTenantId: tenant.id,
        tenantName: tenant.name,
        tenantType: tenant.type ?? 'retail',
      });

      // Retrieve the decrypted secret for legacy return contract
      const { QuasarIntegrationStore } = await import('../integrations/quasar/quasar-integration.store');
      const integration = await QuasarIntegrationStore.getByInvifyTenantId(tenant.id);
      if (!integration) return null;

      const sk_secret = QuasarIntegrationStore.decryptSkSecret(integration);

      return {
        tenantId: result.quasarTenantId,
        tenantSlug: result.quasarTenantSlug,
        sk_secret,
      };
    } catch (error: any) {
      console.error('[QuasarPlatformService] provisionTenant (legacy shim) failed:', error.message);
      return null;
    }
  }
}

// src/integrations/quasar/factory.ts
import { QuasarService } from "./quasar.service";
import { IntegrationVaultService } from "../../services/integration-vault.service";

/**
 * Factory function to retrieve a correctly initialized QuasarService.
 * Dynamically resolves the tenant-specific sk_live_* key from the Integration Vault
 * and falls back to the platform API key if none is provisioned.
 */
export const getQuasarService = async (tenantId: string): Promise<QuasarService> => {
  let apiKey = '';

  if (tenantId) {
    try {
      const tenantServiceId = `quasarTenant:${tenantId}`;
      const decrypted =
        await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'apiKeySecret');
      
      if (decrypted) {
        apiKey = decrypted;
      }
    } catch (vaultErr) {
      console.warn(`[Quasar Factory] Failed to resolve tenant secret key from vault for tenant: ${tenantId}`, vaultErr);
    }
  }

  if (!apiKey) {
    apiKey =
      process.env.QUASAR_API_KEY?.trim() ||
      process.env.QUASER_API_KEY?.trim() ||
      '';
  }

  if (!apiKey || apiKey.includes('your-quaser')) {
    console.error(`[Quasar Factory] QUASAR_API_KEY is not set. Cannot initialize QuasarService for tenant: ${tenantId}`);
    throw new Error('QUASAR_API_KEY (sk_test_* / sk_live_*) is required for Quasar integration');
  }

  const webhookSecret =
    process.env.QUASAR_WEBHOOK_SECRET ||
    process.env.QUASER_WEBHOOK_SECRET ||
    '';
  return new QuasarService(apiKey, webhookSecret);
};

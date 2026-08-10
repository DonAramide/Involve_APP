// src/integrations/quasar/factory.ts
import { QuasarService } from "./quasar.service";
import { IntegrationVaultService } from "../../services/integration-vault.service";
import { QuasarIntegrationStore } from "./quasar-integration.store";

function describeKey(sk: string): string {
  if (sk.startsWith('sk_live_')) return 'sk_live_*';
  if (sk.startsWith('sk_test_')) return 'sk_test_*';
  return `other(len=${sk.length})`;
}

/**
 * Factory function to retrieve a correctly initialized QuasarService.
 * Prefer live tenant keys for production financial / POS APIs.
 */
export const getQuasarService = async (tenantId: string): Promise<QuasarService> => {
  let apiKey = '';
  let source = '';

  if (tenantId) {
    // 1) Dedicated quasar_integrations row (provisioned / rotated secret)
    try {
      const row = await QuasarIntegrationStore.getByInvifyTenantId(tenantId);
      if (row?.quasar_sk_secret_enc) {
        const sk = QuasarIntegrationStore.decryptSkSecret(row);
        if (sk) {
          apiKey = sk;
          source = `quasar_integrations(${row.quasar_environment || '?'})`;
        }
      }
    } catch (err: any) {
      console.warn(`[Quasar Factory] quasar_integrations read failed for ${tenantId}: ${err.message}`);
    }

    // 2) Integration Vault apiKeySecret — prefer if live and current is test
    try {
      const tenantServiceId = `quasarTenant:${tenantId}`;
      const decrypted =
        await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'apiKeySecret');

      if (decrypted) {
        const vaultIsLive = decrypted.startsWith('sk_live_');
        const currentIsTest = !apiKey || apiKey.startsWith('sk_test_');
        if (!apiKey || (vaultIsLive && currentIsTest)) {
          apiKey = decrypted;
          source = 'integration_vault(apiKeySecret)';
        }
      }
    } catch (vaultErr: any) {
      console.warn(`[Quasar Factory] Failed to resolve tenant secret key from vault for tenant: ${tenantId}`, vaultErr?.message || vaultErr);
    }
  }

  if (!apiKey) {
    apiKey =
      process.env.QUASAR_API_KEY?.trim() ||
      process.env.QUASER_API_KEY?.trim() ||
      '';
    if (apiKey) source = 'env(QUASAR_API_KEY)';
  }

  if (!apiKey || apiKey.includes('your-quaser')) {
    console.error(`[Quasar Factory] QUASAR_API_KEY is not set. Cannot initialize QuasarService for tenant: ${tenantId}`);
    throw new Error('QUASAR_API_KEY (sk_test_* / sk_live_*) is required for Quasar integration');
  }

  console.log(
    `[Quasar Factory] tenant=${tenantId || 'n/a'} key=${describeKey(apiKey)} source=${source || 'unknown'}`,
  );

  if (apiKey.startsWith('sk_test_')) {
    console.warn(
      `[Quasar Factory] sk_test_* cannot call Quasar /pos/* (sandbox-only). ` +
        `Issue sk_live_* via Platform Config → Issue Live API Key for this tenant.`,
    );
  }

  const webhookSecret =
    process.env.QUASAR_WEBHOOK_SECRET ||
    process.env.QUASER_WEBHOOK_SECRET ||
    '';
  return new QuasarService(apiKey, webhookSecret);
};

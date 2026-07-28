// invify-backend/src/modules/financial-platform/infrastructure/CredentialProvider.ts

/**
 * Interface for fetching Quasar credentials, abstracting the underlying
 * secure storage (Vault, ECS, AWS Secrets Manager, etc.)
 */
export interface CredentialProvider {
  /**
   * Fetches the platform-level client ID and secret.
   * Used for provisioning tenants, issuing API keys, and health checks.
   */
  getPlatformCredentials(): Promise<{ clientId: string; clientSecret: string }>;

  /**
   * Fetches the tenant-specific secret key (sk_*).
   * Used strictly for payment operations on behalf of a specific merchant.
   */
  getTenantCredentials(tenantId: string): Promise<{ secretKey: string; publicKey?: string; environment?: string }>;
}

export class VaultCredentialProvider implements CredentialProvider {
  // In a real implementation, this would inject a Vault Client or Secrets Manager
  constructor(private vaultClient: any) {}

  async getPlatformCredentials(): Promise<{ clientId: string; clientSecret: string }> {
    // Expected to fetch from a secure enclave (e.g. `secret/data/invify/quasar-platform`)
    const creds = await this.vaultClient.read('quasarPlatform');
    if (!creds || !creds.clientId || !creds.clientSecret) {
      throw new Error("Quasar Platform credentials not found in Vault.");
    }
    return {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret
    };
  }

  async getTenantCredentials(tenantId: string): Promise<{ secretKey: string; publicKey?: string; environment?: string }> {
    // Expected to fetch from `secret/data/invify/tenants/${tenantId}/quasar`
    const creds = await this.vaultClient.read(`quasarTenant/${tenantId}`);
    if (!creds || !creds.apiKeySecret) {
      throw new Error(`Quasar credentials not found for tenant ${tenantId}`);
    }
    return {
      secretKey: creds.apiKeySecret,
      environment: creds.environment
    };
  }
}

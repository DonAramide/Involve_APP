// invify-backend/src/modules/financial-platform/infrastructure/CredentialProvider.ts

/**
 * Interface for fetching Quasar credentials, abstracting the underlying
 * secure storage (Vault, ECS, AWS Secrets Manager, etc.)
 */
export interface CredentialProvider {
  /**
   * Fetches the platform-level client ID and secret for a Quasar vertical.
   * Quasar partners are vertical-scoped: INVIFY_RETAIL may only create invify_retail,
   * INVIFY_SCHOOL only invify_school, etc.
   */
  getPlatformCredentials(vertical?: string): Promise<{ clientId: string; clientSecret: string }>;

  /**
   * Fetches the tenant-specific secret key (sk_*).
   * Used strictly for payment operations on behalf of a specific merchant.
   */
  getTenantCredentials(tenantId: string): Promise<{ secretKey: string; publicKey?: string; environment?: string }>;
}

export class VaultCredentialProvider implements CredentialProvider {
  constructor(private vaultClient: any) {}

  async getPlatformCredentials(vertical?: string): Promise<{ clientId: string; clientSecret: string }> {
    const normalized = String(vertical || 'invify_retail').trim().toLowerCase() || 'invify_retail';
    // Prefer vertical-specific vault key, then legacy shared key
    const creds =
      (await this.vaultClient.read(`quasarPlatform:${normalized}`)) ||
      (await this.vaultClient.read('quasarPlatform'));

    if (!creds || !creds.clientId || !creds.clientSecret) {
      throw new Error(
        `Quasar Platform credentials not found for vertical "${normalized}". ` +
          `Set INVIFY_SCHOOL_CLIENT_ID/SECRET (or retail/services) in .env / QIP vault.`,
      );
    }
    return {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    };
  }

  async getTenantCredentials(tenantId: string): Promise<{ secretKey: string; publicKey?: string; environment?: string }> {
    const creds = await this.vaultClient.read(`quasarTenant/${tenantId}`);
    if (!creds || !creds.apiKeySecret) {
      throw new Error(`Quasar credentials not found for tenant ${tenantId}`);
    }
    return {
      secretKey: creds.apiKeySecret,
      environment: creds.environment,
    };
  }
}

import { SecretDatabaseService, ProviderSecretVersion } from './SecretDatabaseService';
import { SecretAuditService } from './SecretAuditService';

export class SecretRotationService {
  /**
   * Schedule a future rotation job.
   */
  static async scheduleRotation(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    scheduledAt: Date
  ): Promise<string> {
    const job = await SecretDatabaseService.insertRotationJob({
      provider,
      status: 'PENDING',
      scheduled_at: scheduledAt.toISOString(),
    });
    return job.id;
  }

  /**
   * Execute rotation for a provider.
   * This creates a new secret version with 'ROTATING' state while keeping the old 'ACTIVE' secret active,
   * satisfying the Dual Key Rotation requirement.
   */
  static async executeRotation(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    newKeyVersion: string,
    newVaultKeyReference: string,
    operator = 'system'
  ): Promise<{ oldVersionId?: string; newVersionId: string }> {
    const env = process.env.APP_ENV || process.env.NODE_ENV || 'staging';

    await SecretAuditService.log('ROTATE', provider, null, 'SUCCESS', `Starting rotation for ${provider}`, operator);

    // 1. Get current active version
    const existingVersions = await SecretDatabaseService.getVersions(provider, env);
    const oldActive = existingVersions.find(v => v.is_active && v.status === 'ACTIVE');

    // 2. Insert new version as ROTATING (so both old and new are active simultaneously)
    const newVersion = await SecretDatabaseService.insertVersion({
      provider,
      key_version: newKeyVersion,
      vault_key_reference: newVaultKeyReference,
      status: 'ROTATING',
      environment: env,
      is_active: true,
      expires_at: null,
    });

    // 3. Mark old active as ROTATING as well or keep it ACTIVE.
    // To retire the old version later, we can promote the new one to ACTIVE and retire the old.
    // For dual key rotation gate, having both key versions as active at the same time is key.
    
    await SecretAuditService.log(
      'ROTATE',
      provider,
      newKeyVersion,
      'SUCCESS',
      `Dual-key active phase established. New version: ${newKeyVersion} (status: ROTATING)`,
      operator
    );

    return {
      oldVersionId: oldActive?.id,
      newVersionId: newVersion.id,
    };
  }

  /**
   * Complete rotation by promoting the new version to ACTIVE and retiring the old version.
   */
  static async completeRotation(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    newVersionId: string,
    oldVersionId?: string,
    operator = 'system'
  ): Promise<void> {
    // 1. Promote new version to ACTIVE
    await SecretDatabaseService.updateVersion(newVersionId, { status: 'ACTIVE' });

    // 2. Retire old version
    if (oldVersionId) {
      const versions = await SecretDatabaseService.getVersions(provider, process.env.APP_ENV || process.env.NODE_ENV || 'staging');
      const oldVer = versions.find(v => v.id === oldVersionId);
      if (oldVer) {
        await SecretDatabaseService.updateVersion(oldVersionId, {
          status: 'RETIRED',
          is_active: false,
        });
        await SecretAuditService.log(
          'ROTATE',
          provider,
          oldVer.key_version,
          'SUCCESS',
          `Old secret version retired. Version: ${oldVer.key_version}`,
          operator
        );
      }
    }

    await SecretAuditService.log(
      'ROTATE',
      provider,
      null,
      'SUCCESS',
      `Rotation completed successfully for ${provider}`,
      operator
    );
  }

  /**
   * Emergency revocation of a compromised version.
   */
  static async revokeVersion(
    versionId: string,
    operator = 'system'
  ): Promise<void> {
    const env = process.env.APP_ENV || process.env.NODE_ENV || 'staging';
    // Find version
    let targetVersion: ProviderSecretVersion | undefined;
    
    // We get all versions across all providers to locate it
    for (const provider of ['PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA'] as const) {
      const versions = await SecretDatabaseService.getVersions(provider, env);
      const found = versions.find(v => v.id === versionId);
      if (found) {
        targetVersion = found;
        break;
      }
    }

    if (!targetVersion) {
      throw new Error(`Secret version ID ${versionId} not found`);
    }

    await SecretDatabaseService.updateVersion(versionId, {
      status: 'REVOKED',
      is_active: false,
    });

    await SecretAuditService.log(
      'REVOKE',
      targetVersion.provider,
      targetVersion.key_version,
      'SUCCESS',
      `Secret version REVOKED immediately. Version: ${targetVersion.key_version}`,
      operator
    );
  }
}

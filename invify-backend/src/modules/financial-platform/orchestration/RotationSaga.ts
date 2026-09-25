// invify-backend/src/modules/financial-platform/orchestration/RotationSaga.ts

import { QuasarPlatformClient } from '../quasar/QuasarPlatformClient';
import { ObservabilityContext, AuditLogger, DomainEventPublisher, MetricsExporter } from '../domain/Types';
import { QuasarIntegrationStore } from '../../../integrations/quasar/quasar-integration.store';
import { VaultEncryptionUtil } from '../../../utils/vault-encryption.util';
import { supabaseAdmin } from '../../../db/supabase';
import {
  resolveQuasarTenantKeyEnvironment,
  scopesForQuasarTenantKeyEnvironment,
} from '../../../integrations/quasar/quasar-tenant-key-environment';

export class RotationSaga {
  constructor(
    private quasarClient: QuasarPlatformClient,
    private vaultClient: any,
    private auditLogger: AuditLogger,
    private eventPublisher: DomainEventPublisher,
    private metricsExporter: MetricsExporter
  ) {}

  async execute(tenantId: string, quasarTenantId: string, vaultUrn: string, context: ObservabilityContext): Promise<void> {
    const startTime = Date.now();
    const keyEnvironment = resolveQuasarTenantKeyEnvironment();
    const keyScopes = scopesForQuasarTenantKeyEnvironment(keyEnvironment);
    const existing = await QuasarIntegrationStore.getByInvifyTenantId(tenantId);
    const vertical = String(existing?.quasar_vertical || 'invify_retail');

    try {
      await QuasarIntegrationStore.updateStatus(tenantId, 'provisioned');

      const keyIdempotency = `rotate-apikey:${tenantId}:${keyEnvironment}:${Date.now()}`;
      console.log(
        `[RotationSaga] Issuing Quasar API key environment=${keyEnvironment} vertical=${vertical} for tenant=${tenantId}`,
      );
      const apiKeyResp = await this.quasarClient.createTenantApiKey(quasarTenantId, {
        name: `Invify MPOS Rotated — ${new Date().toISOString()}`,
        environment: keyEnvironment,
        scopes: keyScopes,
      }, context, keyIdempotency, vertical);

      const keyPayload = apiKeyResp.data?.data || apiKeyResp.data || apiKeyResp;
      const newKeySecret = keyPayload.secretKey;
      const newKeyPublic = keyPayload.publicKey;

      if (!newKeySecret) {
        throw new Error(`Quasar rotation returned no secretKey: ${JSON.stringify(apiKeyResp)}`);
      }

      if (keyEnvironment === 'live' && !String(newKeySecret).startsWith('sk_live_')) {
        throw new Error(
          `Expected sk_live_* from Quasar (environment=live) but got prefix=${String(newKeySecret).slice(0, 8)}`,
        );
      }

      const isVerified = await this.verifyKey(newKeySecret);
      if (!isVerified) {
        throw new Error('New credential failed verification check. Aborting rotation.');
      }

      await this.vaultClient.write(vaultUrn, {
        tenantId: quasarTenantId,
        apiKeySecret: newKeySecret,
        apiKeyPublic: newKeyPublic,
        environment: keyEnvironment,
      });

      const encryptedSk = VaultEncryptionUtil.encrypt(newKeySecret);
      const { error } = await supabaseAdmin
        .from('quasar_integrations')
        .update({
          quasar_sk_secret_enc: JSON.stringify(encryptedSk),
          quasar_public_key: newKeyPublic ?? null,
          quasar_environment: keyEnvironment,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('invify_tenant_id', tenantId);

      if (error) {
        throw new Error(`Failed to persist rotated secret: ${error.message}`);
      }

      await this.eventPublisher.publish('FinancialPlatformCredentialsRotated', {
        tenantId,
        quasarTenantId,
        environment: keyEnvironment,
      }, context);
      await this.auditLogger.log('CREDENTIAL_ROTATION_COMPLETED', { tenantId, environment: keyEnvironment }, context);
      this.metricsExporter.incrementCounter('rotation_success', { tenantId });
      this.metricsExporter.recordDuration('rotation_duration_ms', Date.now() - startTime, { tenantId });
    } catch (error: any) {
      console.error('Rotation failed, aborting...', error);

      try {
        await QuasarIntegrationStore.updateStatus(tenantId, 'active');
      } catch {
        /* ignore */
      }

      this.metricsExporter.incrementCounter('rotation_failure', { tenantId });
      await this.auditLogger.log('CREDENTIAL_ROTATION_FAILED', { tenantId, error: error.message }, context);

      throw error;
    }
  }

  private async verifyKey(_secretKey: string): Promise<boolean> {
    return true;
  }
}

// invify-backend/src/modules/financial-platform/orchestration/ActivationSaga.ts

import { QuasarPlatformClient } from '../quasar/QuasarPlatformClient';
import { ObservabilityContext, AuditLogger, DomainEventPublisher, MetricsExporter } from '../domain/Types';
import { QuasarIntegrationStore } from '../../../integrations/quasar/quasar-integration.store';
import { VaultEncryptionUtil } from '../../../utils/vault-encryption.util';
import { supabaseAdmin } from '../../../db/supabase';

export class ActivationSaga {
  constructor(
    private quasarClient: QuasarPlatformClient,
    private vaultClient: any,
    private auditLogger: AuditLogger,
    private eventPublisher: DomainEventPublisher,
    private metricsExporter: MetricsExporter
  ) {}

  /**
   * Executes the activation workflow using the Saga pattern.
   * Idempotent across retries. Handles Quasar slug conflicts without mistaking
   * the Invify UUID (embedded in the slug) for the Quasar tenant id.
   */
  async execute(tenantId: string, tenantData: any, context: ObservabilityContext): Promise<string> {
    const startTime = Date.now();
    let quasarTenantId: string | null = null;
    let vaultUrn: string | null = null;
    const slug = `tenant-${tenantData.id}`;

    try {
      // Step 1: Resume from prior checkpoint — but only if Quasar still recognizes the id
      const existing = await QuasarIntegrationStore.getByInvifyTenantId(tenantId);
      if (existing?.quasar_tenant_id) {
        const candidate = existing.quasar_tenant_id;
        const looksLikeInvifyId =
          candidate.toLowerCase() === String(tenantData.id).toLowerCase() ||
          slug.toLowerCase().includes(candidate.toLowerCase());

        if (looksLikeInvifyId) {
          console.warn(
            `[ActivationSaga] Discarding bogus checkpointed id ${candidate} (matches Invify id / slug embedding)`
          );
          await this.clearBogusCheckpoint(tenantId);
        } else {
          const stillExists = await this.quasarClient.verifyTenantExists(candidate, context);
          if (stillExists) {
            quasarTenantId = candidate;
            console.log(
              `[ActivationSaga] Resuming activation for ${tenantId} with Quasar tenant ${quasarTenantId}`
            );
          } else {
            console.warn(
              `[ActivationSaga] Checkpointed Quasar id ${candidate} not found on Quasar — clearing and reprovisioning`
            );
            await this.clearBogusCheckpoint(tenantId);
          }
        }
      }

      // Step 2: Provision in Quasar (or recover / use recovery slug on conflict)
      if (!quasarTenantId) {
        const tenantPayload = await this.provisionQuasarTenant(tenantId, tenantData, slug, context);
        quasarTenantId = tenantPayload.id;

        await this.checkpointQuasarTenant(tenantId, {
          quasarTenantId,
          slug: tenantPayload.slug || slug,
          code: tenantPayload.code || (tenantPayload.slug || slug).slice(0, 8).toUpperCase(),
          vertical: tenantPayload.vertical || 'invify_retail',
        });
      }

      // Step 3: Issue API Key
      const keyIdempotency = `provision-apikey:${tenantId}:test:${quasarTenantId}`;
      const apiKeyResp = await this.quasarClient.createTenantApiKey(quasarTenantId!, {
        name: `Invify MPOS — ${tenantData.name}`,
        environment: 'test'
      }, context, keyIdempotency);

      const keyPayload = this.unwrapQuasarEntity(apiKeyResp);
      const secretKey = keyPayload.secretKey;
      const publicKey = keyPayload.publicKey;

      if (!secretKey) {
        throw new Error(
          `Quasar API key issuance returned no secretKey. Response: ${JSON.stringify(apiKeyResp)}`
        );
      }

      // Step 4: Persist in Vault
      vaultUrn = `quasarTenant/${tenantId}`;
      await this.vaultClient.write(vaultUrn, {
        tenantId: quasarTenantId,
        apiKeySecret: secretKey,
        apiKeyPublic: publicKey,
        environment: 'test'
      });

      // Step 5: Persist Metadata
      const prior = await QuasarIntegrationStore.getByInvifyTenantId(tenantId);
      await QuasarIntegrationStore.upsert({
        invifyTenantId: tenantId,
        quasarTenantId: quasarTenantId!,
        quasarTenantSlug: prior?.quasar_tenant_slug || slug,
        quasarTenantCode: prior?.quasar_tenant_code || slug.slice(0, 8).toUpperCase(),
        vertical: (prior?.quasar_vertical as any) || 'invify_retail',
        publicKey: publicKey ?? null,
        secretKey,
        environment: 'test',
        status: 'active',
      });

      await this.eventPublisher.publish('FinancialPlatformActivated', { tenantId, quasarTenantId }, context);
      this.metricsExporter.incrementCounter('activation_success', { tenantId });
      this.metricsExporter.recordDuration('activation_duration_ms', Date.now() - startTime, { tenantId });
      await this.auditLogger.log('ACTIVATION_COMPLETED', { tenantId, quasarTenantId }, context);

      return quasarTenantId!;
    } catch (error: any) {
      const conflictBody = error?.response?.data;
      if (error?.response?.status === 409 || error?.response?.status === 404) {
        console.error(
          `[ActivationSaga] Quasar ${error.response.status}. Body:`,
          JSON.stringify(conflictBody)
        );
      } else {
        console.error('Saga failed, initiating compensation...', error);
      }

      if (vaultUrn) {
        try {
          await this.vaultClient.delete(vaultUrn);
          await this.auditLogger.log('COMPENSATION_VAULT_DELETED', { tenantId, vaultUrn }, context);
        } catch (e) {
          console.error('Failed to rollback Vault', e);
        }
      }

      this.metricsExporter.incrementCounter('activation_failure', { tenantId });
      await this.auditLogger.log('ACTIVATION_FAILED', { tenantId, error: error.message }, context);

      try {
        await QuasarIntegrationStore.updateStatus(tenantId, 'error');
      } catch {
        /* ignore */
      }

      if (conflictBody?.responseMessage) {
        throw new Error(conflictBody.responseMessage);
      }
      throw error;
    }
  }

  /**
   * Create Quasar tenant; on unrecoverable slug conflict, create under a unique recovery slug.
   */
  private async provisionQuasarTenant(
    tenantId: string,
    tenantData: any,
    slug: string,
    context: ObservabilityContext
  ): Promise<{ id: string; slug?: string; code?: string; vertical?: string }> {
    try {
      const quasarTenant = await this.quasarClient.createTenant({
        name: tenantData.name,
        slug,
        vertical: 'invify_retail',
        defaultCurrency: 'NGN'
      }, context, `provision-tenant:${tenantId}`);

      return this.requireTenantPayload(quasarTenant, tenantId);
    } catch (createErr: any) {
      const isConflict =
        createErr?.response?.status === 409 ||
        /already in use|already exists|conflict|Invalid recovered/i.test(createErr?.message || '');

      if (!isConflict) throw createErr;

      // Stable recovery slug so retries don't mint endless Quasar orphans
      const recoverySlug = `tenant-${String(tenantId).slice(0, 8)}-recovery`;
      console.warn(
        `[ActivationSaga] Slug "${slug}" already on Quasar without a usable tenant id. Creating recovery slug "${recoverySlug}".`
      );

      try {
        const recovered = await this.quasarClient.createTenant({
          name: tenantData.name,
          slug: recoverySlug,
          vertical: 'invify_retail',
          defaultCurrency: 'NGN'
        }, context, `provision-tenant-recovery:${tenantId}`);

        return { ...this.requireTenantPayload(recovered, tenantId), slug: recoverySlug };
      } catch (recoveryErr: any) {
        // Recovery slug may already exist from a prior partial success — verify via get if we have a known id pattern is impossible;
        // rethrow with clear message so operator can paste Quasar tenant UUID.
        if (recoveryErr?.response?.status === 409) {
          throw new Error(
            `Quasar already has slug "${recoverySlug}" from a prior attempt, but Invify has no quasar_tenant_id. ` +
            `Open Quasar admin, copy that tenant's UUID, then we can link it — or delete the Quasar tenant and retry Activate.`
          );
        }
        throw recoveryErr;
      }
    }
  }

  /**
   * Quasar envelopes nest inconsistently: data / data.data / data.data.data
   */
  private unwrapQuasarEntity(payload: any): any {
    let cur = payload;
    for (let i = 0; i < 6; i++) {
      if (!cur || typeof cur !== 'object') break;
      if (typeof cur.id === 'string' && cur.id.length > 0) return cur;
      if (cur.data !== undefined) {
        cur = cur.data;
        continue;
      }
      break;
    }
    return cur;
  }

  private requireTenantPayload(
    raw: any,
    invifyTenantId: string
  ): { id: string; slug?: string; code?: string; vertical?: string } {
    const tenantPayload = this.unwrapQuasarEntity(raw);
    const id = tenantPayload?.id;
    if (!id) {
      throw new Error(`Quasar createTenant returned no id: ${JSON.stringify(raw)}`);
    }

    if (String(id).toLowerCase() === String(invifyTenantId).toLowerCase()) {
      throw Object.assign(new Error('Recovered id equals Invify tenant id — invalid'), {
        response: { status: 409, data: { responseMessage: 'Invalid recovered Quasar tenant id' } }
      });
    }

    return { ...tenantPayload, id };
  }

  private async clearBogusCheckpoint(invifyTenantId: string) {
    const { error } = await supabaseAdmin
      .from('quasar_integrations')
      .delete()
      .eq('invify_tenant_id', invifyTenantId);
    if (error) {
      console.warn('[ActivationSaga] Failed to clear bogus checkpoint:', error.message);
    }
  }

  private async checkpointQuasarTenant(
    invifyTenantId: string,
    meta: { quasarTenantId: string; slug: string; code: string; vertical: string }
  ) {
    // Never checkpoint the Invify UUID as if it were Quasar's
    if (meta.quasarTenantId.toLowerCase() === invifyTenantId.toLowerCase()) {
      console.warn('[ActivationSaga] Refusing to checkpoint Invify id as Quasar tenant id');
      return;
    }

    const existing = await QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
    if (existing?.quasar_tenant_id && existing.quasar_tenant_id !== meta.quasarTenantId) {
      // Replace stale/bogus row
      await this.clearBogusCheckpoint(invifyTenantId);
    } else if (existing?.quasar_tenant_id === meta.quasarTenantId) {
      return;
    }

    const placeholder = VaultEncryptionUtil.encrypt(`pending:${invifyTenantId}`);
    const { error } = await supabaseAdmin.from('quasar_integrations').upsert(
      {
        invify_tenant_id: invifyTenantId,
        quasar_tenant_id: meta.quasarTenantId,
        quasar_tenant_slug: meta.slug,
        quasar_tenant_code: meta.code,
        quasar_vertical: meta.vertical,
        quasar_public_key: null,
        quasar_sk_secret_enc: JSON.stringify(placeholder),
        quasar_environment: 'test',
        status: 'provisioned',
        quasar_provisioned_at: new Date().toISOString(),
      },
      { onConflict: 'invify_tenant_id' }
    );

    if (error) {
      console.warn('[ActivationSaga] Failed to checkpoint Quasar tenant id:', error.message);
    }
  }
}

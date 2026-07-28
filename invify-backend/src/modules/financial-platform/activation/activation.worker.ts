import { QuasarAdminClient } from '../quasar/quasar-admin.client';
import { QuasarCredentialService } from '../vault/quasar-credential.service';
import { QuasarConfigurationService } from '../ecs/quasar-configuration.service';
import { FinancialPlatformAuditService, AuditStatus } from '../audit/financial-platform-audit.service';

export class ActivationWorker {
  constructor(
    private quasarClient: QuasarAdminClient,
    private credentialService: QuasarCredentialService,
    private configService: QuasarConfigurationService,
    private auditService: FinancialPlatformAuditService
  ) {}

  async processActivation(tenantId: string, actorId: string, businessName: string, email: string): Promise<void> {
    try {
      // 1. QuasarAdminClient.createTenant()
      const provisionResponse = await this.quasarClient.createTenant({
        businessName,
        email,
        environment: 'sandbox' // or dynamically passed
      });

      // 2. QuasarCredentialService.storeCredentials()
      const credentials = {
        apiKey: provisionResponse.apiKey,
        clientSecret: provisionResponse.clientSecret,
        webhookSigningSecret: provisionResponse.webhookSigningSecret
      };
      const credentialReferences = await this.credentialService.storeCredentials(tenantId, credentials);

      // 3. QuasarConfigurationService.register()
      await this.configService.register(tenantId, {
        baseUrl: 'https://admin-api.quasar-finance.internal',
        quasarTenantId: provisionResponse.tenantId,
        environment: 'sandbox',
        timeoutMs: 5000,
        retryPolicy: { retries: 3, backoff: 'exponential' },
        credentialReferences
      });

      // 4. QuasarAdminClient.getHealth()
      const isHealthy = await this.quasarClient.getHealth();
      if (!isHealthy) {
        throw new Error('Initial Quasar health check failed after provisioning');
      }

      // 5. AuditService.logActivation()
      await this.auditService.logActivation(tenantId, actorId, AuditStatus.SUCCESS, {
        quasarTenantId: provisionResponse.tenantId
      });

      // NOTE: Updating the financial_platform_connections status to ACTIVE would happen here
      // via a repository or DB client.

    } catch (error: any) {
      // Audit failure
      await this.auditService.logActivation(tenantId, actorId, AuditStatus.FAILURE, {
        error: error.message || 'Unknown provisioning error'
      });
      // NOTE: Updating the financial_platform_connections status to UNPROVISIONED (rollback) would happen here
      throw error;
    }
  }
}

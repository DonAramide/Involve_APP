import { QuasarAdminClient } from '../quasar/quasar-admin.client';
import { QuasarCredentialService } from '../vault/quasar-credential.service';
import { QuasarConfigurationService } from '../ecs/quasar-configuration.service';
import { FinancialPlatformAuditService } from '../audit/financial-platform-audit.service';
export declare class ActivationWorker {
    private quasarClient;
    private credentialService;
    private configService;
    private auditService;
    constructor(quasarClient: QuasarAdminClient, credentialService: QuasarCredentialService, configService: QuasarConfigurationService, auditService: FinancialPlatformAuditService);
    processActivation(tenantId: string, actorId: string, businessName: string, email: string): Promise<void>;
}

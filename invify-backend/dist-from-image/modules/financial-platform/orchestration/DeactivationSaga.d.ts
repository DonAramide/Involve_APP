import { QuasarPlatformClient } from '../quasar/QuasarPlatformClient';
import { ObservabilityContext, AuditLogger, DomainEventPublisher, MetricsExporter } from '../domain/Types';
export declare class DeactivationSaga {
    private quasarClient;
    private vaultClient;
    private auditLogger;
    private eventPublisher;
    private metricsExporter;
    constructor(quasarClient: QuasarPlatformClient, vaultClient: any, auditLogger: AuditLogger, eventPublisher: DomainEventPublisher, metricsExporter: MetricsExporter);
    execute(tenantId: string, quasarTenantId: string, vaultUrn: string, reason: string, context: ObservabilityContext): Promise<void>;
    private updateState;
}

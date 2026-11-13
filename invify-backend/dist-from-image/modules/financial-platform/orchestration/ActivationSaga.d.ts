import { QuasarPlatformClient } from '../quasar/QuasarPlatformClient';
import { ObservabilityContext, AuditLogger, DomainEventPublisher, MetricsExporter } from '../domain/Types';
export declare class ActivationSaga {
    private quasarClient;
    private vaultClient;
    private auditLogger;
    private eventPublisher;
    private metricsExporter;
    constructor(quasarClient: QuasarPlatformClient, vaultClient: any, auditLogger: AuditLogger, eventPublisher: DomainEventPublisher, metricsExporter: MetricsExporter);
    /**
     * Executes the activation workflow using the Saga pattern.
     * Idempotent across retries. Handles Quasar slug conflicts without mistaking
     * the Invify UUID (embedded in the slug) for the Quasar tenant id.
     *
     * @param options.forceNewProvision — clear any prior integration and mint a fresh Quasar tenant
     * @param options.slugSuffix — append to slug (e.g. "school") to avoid colliding with an old vertical's slug
     * @param options.preferResolvedVertical — always persist newly resolved vertical (ignore prior row)
     */
    execute(tenantId: string, tenantData: any, context: ObservabilityContext, options?: {
        forceNewProvision?: boolean;
        slugSuffix?: string;
        preferResolvedVertical?: boolean;
    }): Promise<string>;
    /** Map Invify tenant.type / business_mode → Quasar vertical (school|services|retail). */
    private resolveVertical;
    /**
     * Create Quasar tenant; on unrecoverable slug conflict, create under a unique recovery slug.
     */
    private provisionQuasarTenant;
    /**
     * Quasar envelopes nest inconsistently: data / data.data / data.data.data
     */
    private unwrapQuasarEntity;
    private requireTenantPayload;
    private clearBogusCheckpoint;
    private checkpointQuasarTenant;
}

import { CredentialProvider } from '../infrastructure/CredentialProvider';
import { ObservabilityContext } from '../domain/Types';
import { CircuitBreaker, RetryPolicy } from '../infrastructure/ResiliencePolicies';
export declare class QuasarPlatformClient {
    private credentialProvider;
    private circuitBreaker;
    private retryPolicy;
    private baseUrl;
    private http;
    constructor(credentialProvider: CredentialProvider, circuitBreaker: CircuitBreaker, retryPolicy: RetryPolicy, baseUrl?: string);
    /**
     * Step A: Provisions a new tenant inside Quasar.
     * On duplicate-slug 409, recovers only from structured tenant payloads — never from
     * UUIDs embedded in the slug/error message (those are Invify IDs, not Quasar IDs).
     */
    createTenant(params: {
        name: string;
        slug: string;
        vertical: string;
        defaultCurrency: string;
    }, context: ObservabilityContext, idempotencyKey: string): Promise<any>;
    findTenantBySlug(slug: string, context: ObservabilityContext, forbiddenIds?: Set<string>, vertical?: string): Promise<{
        id: string;
        slug: string;
        [key: string]: any;
    } | null>;
    verifyTenantExists(tenantId: string, context: ObservabilityContext, vertical?: string): Promise<boolean>;
    /**
     * Only accept structured id fields. Never scrape UUIDs out of responseMessage
     * (slug "tenant-{invifyUuid}" embeds the Invify id and is NOT the Quasar tenant id).
     */
    private extractExistingTenantFromConflict;
    private normalizeTenantPayload;
    /** UUIDs that appear inside our slug (Invify tenant id) must never be used as Quasar ids. */
    private slugEmbeddedUuids;
    createTenantApiKey(tenantId: string, params: {
        name: string;
        environment: string;
        scopes?: string[];
    }, context: ObservabilityContext, idempotencyKey: string, vertical?: string): Promise<any>;
    getTenant(tenantId: string, context: ObservabilityContext, vertical?: string): Promise<any>;
}

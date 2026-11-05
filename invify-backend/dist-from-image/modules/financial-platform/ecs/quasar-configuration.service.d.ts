import { QuasarCredentialReferences } from '../vault/quasar-credential.service';
export interface QuasarConfiguration {
    baseUrl: string;
    quasarTenantId: string;
    environment: 'sandbox' | 'production';
    timeoutMs: number;
    retryPolicy: any;
    credentialReferences: QuasarCredentialReferences;
}
export declare class QuasarConfigurationService {
    /**
     * Registers the Quasar configuration into the ECS provider.
     * Isolates the background worker from ECS implementation details.
     */
    register(tenantId: string, config: QuasarConfiguration): Promise<void>;
    update(tenantId: string, config: Partial<QuasarConfiguration>): Promise<void>;
    remove(tenantId: string): Promise<void>;
    testConfiguration(tenantId: string): Promise<boolean>;
}

import { QuasarPlatformClient } from '../quasar/QuasarPlatformClient';
import { CredentialProvider } from '../infrastructure/CredentialProvider';
import { CircuitBreaker } from '../infrastructure/ResiliencePolicies';
import { ObservabilityContext } from '../domain/Types';
export declare class FinancialPlatformHealthService {
    private quasarClient;
    private credentialProvider;
    private circuitBreaker;
    private vaultClient;
    constructor(quasarClient: QuasarPlatformClient, credentialProvider: CredentialProvider, circuitBreaker: CircuitBreaker, vaultClient: any);
    getDiagnostics(tenantId: string, context: ObservabilityContext): Promise<Record<string, any>>;
}

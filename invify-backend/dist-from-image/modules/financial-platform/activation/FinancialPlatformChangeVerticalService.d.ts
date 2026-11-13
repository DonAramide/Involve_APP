import { ActivationLockProvider } from '../infrastructure/ActivationLockProvider';
import { ActivationSaga } from '../orchestration/ActivationSaga';
import { ObservabilityContext } from '../domain/Types';
declare const ALLOWED_TYPES: readonly ["school", "retail", "services"];
export type InvifyTenantType = (typeof ALLOWED_TYPES)[number];
export declare class FinancialPlatformChangeVerticalService {
    private lockProvider;
    private activationSaga;
    private vaultClient;
    private auditLogger;
    constructor(lockProvider: ActivationLockProvider, activationSaga: ActivationSaga, vaultClient: any, auditLogger: any);
    /**
     * Change Invify tenant type and re-provision Quasar under the matching partner vertical.
     * Old Quasar tenant is unlinked locally (not deleted on Quasar — partner APIs are vertical-scoped).
     */
    changeVertical(tenantId: string, newTypeRaw: string, confirmPhrase: string, reason: string | undefined, context: ObservabilityContext): Promise<any>;
}
export {};

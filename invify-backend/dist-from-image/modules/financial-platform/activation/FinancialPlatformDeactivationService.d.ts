import { ActivationLockProvider } from '../infrastructure/ActivationLockProvider';
import { DeactivationSaga } from '../orchestration/DeactivationSaga';
import { ObservabilityContext } from '../domain/Types';
export declare class FinancialPlatformDeactivationService {
    private lockProvider;
    private deactivationSaga;
    constructor(lockProvider: ActivationLockProvider, deactivationSaga: DeactivationSaga);
    deactivateTenant(tenantId: string, reason: string, context: ObservabilityContext): Promise<any>;
}

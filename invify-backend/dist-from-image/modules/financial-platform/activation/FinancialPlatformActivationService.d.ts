import { ActivationLockProvider } from '../infrastructure/ActivationLockProvider';
import { ActivationSaga } from '../orchestration/ActivationSaga';
import { ObservabilityContext } from '../domain/Types';
export declare class FinancialPlatformActivationService {
    private lockProvider;
    private activationSaga;
    constructor(lockProvider: ActivationLockProvider, activationSaga: ActivationSaga);
    /**
     * Orchestrates the financial platform activation using a saga pattern.
     * Ensures idempotency and concurrency control.
     */
    activateTenant(tenantId: string, context: ObservabilityContext): Promise<any>;
}

import { ActivationLockProvider } from '../infrastructure/ActivationLockProvider';
import { RotationSaga } from '../orchestration/RotationSaga';
import { ObservabilityContext } from '../domain/Types';
export declare class FinancialPlatformRotationService {
    private lockProvider;
    private rotationSaga;
    constructor(lockProvider: ActivationLockProvider, rotationSaga: RotationSaga);
    rotateCredentials(tenantId: string, context: ObservabilityContext): Promise<any>;
}

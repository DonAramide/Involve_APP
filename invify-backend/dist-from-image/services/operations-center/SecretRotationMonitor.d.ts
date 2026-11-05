import { ProviderSecretRotationJob } from '../secret-management/SecretDatabaseService';
export interface RotationJobEntry {
    id: string;
    provider: ProviderSecretRotationJob['provider'];
    status: ProviderSecretRotationJob['status'];
    scheduledAt: string;
    executedAt: string | null;
    isOverdue: boolean;
}
export interface SecretRotationSnapshot {
    pendingRotations: number;
    completedRotations: number;
    failedRotations: number;
    /** Jobs whose scheduledAt is in the past but status is still PENDING */
    overdueRotations: number;
    jobs: RotationJobEntry[];
    capturedAt: string;
}
export declare class SecretRotationMonitor {
    /**
     * Reads all rotation jobs and identifies overdue/pending/completed states.
     */
    static getSnapshot(): Promise<SecretRotationSnapshot>;
}

import { SecretDatabaseService, ProviderSecretRotationJob } from '../secret-management/SecretDatabaseService';

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

export class SecretRotationMonitor {
  /**
   * Reads all rotation jobs and identifies overdue/pending/completed states.
   */
  static async getSnapshot(): Promise<SecretRotationSnapshot> {
    const jobs = await SecretDatabaseService.getRotationJobs();
    const now = Date.now();

    const entries: RotationJobEntry[] = jobs.map((job) => {
      const scheduledMs = new Date(job.scheduled_at).getTime();
      const isOverdue = job.status === 'PENDING' && scheduledMs < now;
      return {
        id: job.id,
        provider: job.provider,
        status: job.status,
        scheduledAt: job.scheduled_at,
        executedAt: job.executed_at,
        isOverdue,
      };
    });

    return {
      pendingRotations: entries.filter((j) => j.status === 'PENDING').length,
      completedRotations: entries.filter((j) => j.status === 'COMPLETED').length,
      failedRotations: entries.filter((j) => j.status === 'FAILED').length,
      overdueRotations: entries.filter((j) => j.isOverdue).length,
      jobs: entries,
      capturedAt: new Date().toISOString(),
    };
  }
}

import { PolicyType }         from '../shared/GovernancePolicy';
import { PolicyVersionRegistry } from '../registry/PolicyVersionRegistry';

export interface VersionHistory {
  policyType: PolicyType;
  versions: Array<{
    version: number;
    policyId: string;
    status: string;
    activatedAt: string | null;
    supersededById: string | null;
  }>;
  totalVersions: number;
  currentVersion: number | null;
}

export class VersionManager {
  static getHistory(type: PolicyType): VersionHistory {
    const chain = PolicyVersionRegistry.getChain(type);
    const active = chain.find((e) => e.status === 'ACTIVE');
    return {
      policyType: type,
      versions: chain.map((e) => ({
        version: e.version,
        policyId: e.policyId,
        status: e.status,
        activatedAt: e.activatedAt,
        supersededById: e.supersededById,
      })),
      totalVersions: chain.length,
      currentVersion: active?.version ?? null,
    };
  }

  static getAllHistories(): VersionHistory[] {
    return PolicyVersionRegistry.getAllTypes().map((t) => this.getHistory(t));
  }

  static getLatestVersion(type: PolicyType): number {
    return PolicyVersionRegistry.peekVersion(type);
  }
}

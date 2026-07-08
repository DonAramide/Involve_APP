import { PolicyType } from '../shared/GovernancePolicy';

export interface VersionChainEntry {
  policyId: string;
  version: number;
  status: string;
  activatedAt: string | null;
  supersededById: string | null;
}

export class PolicyVersionRegistry {
  /** type → ordered list of version chain entries (oldest first) */
  private static chains: Map<PolicyType, VersionChainEntry[]> = new Map();
  /** type → highest version number ever registered */
  private static counters: Map<PolicyType, number> = new Map();

  static clearMockData() {
    this.chains.clear();
    this.counters.clear();
  }

  static nextVersion(type: PolicyType): number {
    const current = this.counters.get(type) ?? 0;
    const next = current + 1;
    this.counters.set(type, next);
    return next;
  }

  static peekVersion(type: PolicyType): number {
    return this.counters.get(type) ?? 0;
  }

  static record(entry: VersionChainEntry, type: PolicyType): void {
    const chain = this.chains.get(type) ?? [];
    chain.push(entry);
    this.chains.set(type, chain);
  }

  static getChain(type: PolicyType): VersionChainEntry[] {
    return this.chains.get(type) ?? [];
  }

  static markSuperseded(type: PolicyType, policyId: string, supersededById: string): void {
    const chain = this.chains.get(type) ?? [];
    const entry = chain.find((e) => e.policyId === policyId);
    if (entry) {
      entry.status = 'SUPERSEDED';
      entry.supersededById = supersededById;
    }
  }

  static markActivated(type: PolicyType, policyId: string, activatedAt: string): void {
    const chain = this.chains.get(type) ?? [];
    const entry = chain.find((e) => e.policyId === policyId);
    if (entry) {
      entry.status = 'ACTIVE';
      entry.activatedAt = activatedAt;
    }
  }

  /** Returns the entry immediately preceding the given policyId (rollback target). */
  static getPreviousEntry(type: PolicyType, policyId: string): VersionChainEntry | null {
    const chain = this.chains.get(type) ?? [];
    const idx = chain.findIndex((e) => e.policyId === policyId);
    return idx > 0 ? chain[idx - 1] : null;
  }

  static getAllTypes(): PolicyType[] {
    return Array.from(this.chains.keys());
  }
}

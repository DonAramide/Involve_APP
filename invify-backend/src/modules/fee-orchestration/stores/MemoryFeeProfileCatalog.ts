import { FeeProfileCatalog, FeeTransactionType, PublishedFeeVersion } from '../types';

export class MemoryFeeProfileCatalog implements FeeProfileCatalog {
  constructor(private readonly versions: PublishedFeeVersion[] = []) {}

  public seed(version: PublishedFeeVersion): void {
    this.versions.push(version);
  }

  public async listCandidateVersions(
    transactionType: FeeTransactionType,
    tenantId: string,
    agentId?: string | null,
  ): Promise<PublishedFeeVersion[]> {
    return this.versions.filter((v) => {
      if (v.transaction_type !== transactionType) return false;
      if (v.source === 'AGENT_PROFILE') {
        return Boolean(agentId) && v.agent_id === agentId;
      }
      if (v.source === 'TENANT_OVERRIDE') {
        return false;
      }
      return v.source === 'GLOBAL_PROFILE';
    });
  }
}

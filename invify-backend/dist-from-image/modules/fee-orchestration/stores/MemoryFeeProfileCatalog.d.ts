import { FeeProfileCatalog, FeeTransactionType, PublishedFeeVersion } from '../types';
export declare class MemoryFeeProfileCatalog implements FeeProfileCatalog {
    private readonly versions;
    constructor(versions?: PublishedFeeVersion[]);
    seed(version: PublishedFeeVersion): void;
    listCandidateVersions(transactionType: FeeTransactionType, tenantId: string, agentId?: string | null): Promise<PublishedFeeVersion[]>;
}

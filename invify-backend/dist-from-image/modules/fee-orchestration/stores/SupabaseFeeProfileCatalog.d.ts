import { FeeTransactionType, PublishedFeeVersion } from '../types';
import { OwningAgent } from '../agent-fee-ownership';
export declare function loadOwningAgentForTenant(tenantId: string): Promise<OwningAgent | null>;
export declare class SupabaseFeeProfileCatalog {
    listCandidateVersions(transactionType: FeeTransactionType, tenantId: string, agentId?: string | null): Promise<PublishedFeeVersion[]>;
}

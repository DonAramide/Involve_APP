import {
  FeeProfileCatalog,
  FeeTransactionType,
  PublishedFeeVersion,
  REQUIRED_SPLIT_BPS,
  ResolveResult,
} from './types';

function isEffective(version: PublishedFeeVersion, eventTime: Date): boolean {
  if (version.effective_from.getTime() > eventTime.getTime()) return false;
  if (version.effective_to && eventTime.getTime() >= version.effective_to.getTime()) return false;
  return true;
}

function splitIsComplete(version: PublishedFeeVersion): boolean {
  return (
    version.platform_bps +
      version.processor_bps +
      version.service_bps +
      version.agent_bps ===
    REQUIRED_SPLIT_BPS
  );
}

/**
 * Agent published profile, else global published profile, in the effective window.
 * Tenant overrides remain stored but are out of scope for Phase 7.3 resolution.
 * Drafts, superseded rows, incomplete splits, and missing profiles yield NO_PROFILE.
 */
export class FeeResolver {
  constructor(private readonly catalog: FeeProfileCatalog) {}

  public async resolve(
    transactionType: FeeTransactionType,
    tenantId: string,
    eventTime: Date,
    agentId?: string | null,
  ): Promise<ResolveResult> {
    const candidates = await this.catalog.listCandidateVersions(transactionType, tenantId, agentId);
    const usable = candidates.filter(
      (v) =>
        v.status === 'PUBLISHED' &&
        v.transaction_type === transactionType &&
        splitIsComplete(v) &&
        isEffective(v, eventTime),
    );

    const agentHits = usable
      .filter((v) => v.source === 'AGENT_PROFILE' && (!agentId || v.agent_id === agentId))
      .sort((a, b) => b.effective_from.getTime() - a.effective_from.getTime());
    if (agentHits.length > 0) {
      return { status: 'RESOLVED', version: agentHits[0] };
    }

    const globalHits = usable
      .filter((v) => v.source === 'GLOBAL_PROFILE')
      .sort((a, b) => b.effective_from.getTime() - a.effective_from.getTime());
    if (globalHits.length > 0) {
      return { status: 'RESOLVED', version: globalHits[0] };
    }

    return { status: 'NO_PROFILE' };
  }
}

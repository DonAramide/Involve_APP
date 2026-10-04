import { FeeCalculator } from '../modules/fee-orchestration/FeeCalculator';
import { FeeOrchestrator } from '../modules/fee-orchestration/FeeOrchestrator';
import { FeeResolver } from '../modules/fee-orchestration/FeeResolver';
import { FeeSplitter } from '../modules/fee-orchestration/FeeSplitter';
import { MemoryFeeAssessmentStore } from '../modules/fee-orchestration/stores/MemoryFeeAssessmentStore';
import {
  loadOwningAgentForTenant,
  SupabaseFeeProfileCatalog,
} from '../modules/fee-orchestration/stores/SupabaseFeeProfileCatalog';
import { SupabaseFeeAssessmentStore } from '../modules/fee-orchestration/stores/SupabaseFeeAssessmentStore';
import { FeeProfileCatalog, PublishedFeeVersion } from '../modules/fee-orchestration/types';
import { koboToWalletAmount, walletAmountToKobo, isLiveFeePostingAllowed, liveFeeAssessmentMode } from './fee-live-gate';
import { WalletService } from './wallet.service';

export class TreasuryQuoteError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly payload: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'TreasuryQuoteError';
  }
}

export type TreasuryQuote = {
  transaction_type: 'TREASURY_WITHDRAWAL';
  requested_amount: number;
  service_fee: number;
  total_required: number;
  available_balance: number;
  remaining_balance: number | null;
  shortfall: number;
  sufficient: boolean;
  fee_profile_version_id: string | null;
  fee_profile_id: string | null;
  service_fee_kobo: number;
  requested_amount_kobo: number;
};

function catalog() {
  return new SupabaseFeeProfileCatalog();
}

export class TreasuryFeeService {
  static testCatalog: FeeProfileCatalog | null = null;
  static testAssessmentStore: MemoryFeeAssessmentStore | null = null;

  static async quote(tenantId: string, requestedAmount: number): Promise<TreasuryQuote> {
    const requested = Math.round(Number(requestedAmount));
    if (!Number.isInteger(requested) || requested <= 0) {
      throw new TreasuryQuoteError('Valid requested amount required', 'INVALID_AMOUNT');
    }
    const available = Number((await WalletService.getBalance(tenantId)).balance || 0);
    const resolved = await TreasuryFeeService.resolve(tenantId);
    let serviceFee = 0;
    let serviceFeeKobo = 0;
    let versionId: string | null = null;
    let profileId: string | null = null;
    if (resolved) {
      const calc = FeeCalculator.calculate({
        method: resolved.method,
        transactionAmountKobo: walletAmountToKobo(requested),
        percentageBps: resolved.percentage_bps,
        flatAmountKobo: resolved.flat_amount_kobo,
        minFeeKobo: resolved.min_fee_kobo,
        maxFeeKobo: resolved.max_fee_kobo,
        tenantId,
      });
      serviceFeeKobo = calc.final_fee_kobo;
      serviceFee = koboToWalletAmount(serviceFeeKobo);
      versionId = resolved.profile_version_id;
      profileId = resolved.profile_id;
    }
    const total = requested + serviceFee;
    const shortfall = Math.max(0, total - available);
    return {
      transaction_type: 'TREASURY_WITHDRAWAL',
      requested_amount: requested,
      service_fee: serviceFee,
      total_required: total,
      available_balance: available,
      remaining_balance: shortfall > 0 ? null : available - total,
      shortfall,
      sufficient: shortfall === 0,
      fee_profile_version_id: versionId,
      fee_profile_id: profileId,
      service_fee_kobo: serviceFeeKobo,
      requested_amount_kobo: walletAmountToKobo(requested),
    };
  }

  static async resolve(tenantId: string): Promise<PublishedFeeVersion | null> {
    const cat = this.testCatalog || catalog();
    const resolver = new FeeResolver(cat);
    let agentId: string | null = null;
    try {
      agentId = (await loadOwningAgentForTenant(tenantId))?.agent_id || null;
    } catch {
      agentId = null;
    }
    const result = await resolver.resolve('TREASURY_WITHDRAWAL', tenantId, new Date(), agentId);
    if (result.status !== 'RESOLVED') return null;
    if (result.version.transaction_type !== 'TREASURY_WITHDRAWAL') return null;
    return result.version;
  }

  static feeCreditEntriesNaira(version: PublishedFeeVersion, serviceFeeNaira: number) {
    if (serviceFeeNaira <= 0) return [];
    const split = FeeSplitter.split(walletAmountToKobo(serviceFeeNaira), version);
    const entries = [
      { account: 'PLATFORM_FEE' as const, type: 'CREDIT' as const, amount: koboToWalletAmount(split.platform_amount_kobo) },
      { account: 'PROCESSOR_FEE' as const, type: 'CREDIT' as const, amount: koboToWalletAmount(split.processor_amount_kobo) },
      { account: 'SERVICE_FEE' as const, type: 'CREDIT' as const, amount: koboToWalletAmount(split.service_amount_kobo) },
      { account: 'AGENT_FEE' as const, type: 'CREDIT' as const, amount: koboToWalletAmount(split.agent_amount_kobo) },
    ].filter((e) => e.amount > 0);
    return entries;
  }

  static async persistAssessment(params: {
    tenantId: string;
    reference: string;
    requestedAmount: number;
    version: PublishedFeeVersion;
  }) {
    if (!isLiveFeePostingAllowed()) return;
    const orch = new FeeOrchestrator(
      this.testCatalog || catalog(),
      this.testAssessmentStore ||
        (process.env.JEST_WORKER_ID && process.env.FEE_SHADOW_ALLOW_SUPABASE !== 'true'
          ? new MemoryFeeAssessmentStore()
          : new SupabaseFeeAssessmentStore()),
    );
    await orch.assess({
      transactionType: 'TREASURY_WITHDRAWAL',
      tenantId: params.tenantId,
      transactionAmountKobo: walletAmountToKobo(params.requestedAmount),
      eventTime: new Date(),
      sourceSystem: 'invify.treasury',
      sourceIdempotencyKey: `TREASURY_WITHDRAWAL:${params.tenantId}:${params.reference}`,
      transactionReference: params.reference,
      mode: liveFeeAssessmentMode(),
    });
  }
}

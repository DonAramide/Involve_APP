import { FeeAssessmentSnapshot } from '../modules/fee-orchestration/types';
import { buildFeeShadowReport, FeeShadowReport } from './fee-shadow-integration';
import { isLiveFeePostingAllowed } from './fee-live-gate';
import { FeePostingOutbox, FeePostingWorker } from './fee-posting-outbox';
import { MemoryFeePostingOutboxStore, SupabaseFeePostingOutboxStore } from './fee-posting-outbox.stores';
import { FeeLedgerPoster } from './fee-ledger-poster';
import { WalletService } from './wallet.service';

/** Exact kobo to naira with two decimal places. 102 kobo is ₦1.02, not ₦1. */
function koboToNaira(kobo: number): number {
  if (!Number.isInteger(kobo) || kobo < 0) return 0;
  return Number((kobo / 100).toFixed(2));
}

/**
 * The fee engine splits integer kobo. The wallet stores naira, so each
 * component is converted at two decimal places and the debit stays the exact fee.
 */
function walletPostingAmounts(snapshot: FeeAssessmentSnapshot) {
  const platform = koboToNaira(snapshot.platform_amount_kobo);
  const processor = koboToNaira(snapshot.processor_amount_kobo);
  const service = koboToNaira(snapshot.service_amount_kobo);
  const agent = koboToNaira(snapshot.agent_amount_kobo);
  const final = koboToNaira(snapshot.final_fee_kobo);
  return {
    platform_amount_kobo: platform,
    processor_amount_kobo: processor,
    service_amount_kobo: service,
    agent_amount_kobo: agent,
    final_fee_kobo: final,
  };
}

/**
 * Posts the inbound VA fee as a separate USER_WALLET debit after gross credit.
 * Failures are parked on the outbox (NEEDS_ATTENTION); the gross credit is kept.
 */
export class InboundFeeService {
  static testOutboxStore: MemoryFeePostingOutboxStore | null = null;
  private static memoryStore: MemoryFeePostingOutboxStore | null = null;

  static store() {
    if (this.testOutboxStore) return this.testOutboxStore;
    if (process.env.JEST_WORKER_ID && process.env.FEE_SHADOW_ALLOW_SUPABASE !== 'true') {
      if (!this.memoryStore) this.memoryStore = new MemoryFeePostingOutboxStore();
      return this.memoryStore;
    }
    return new SupabaseFeePostingOutboxStore();
  }

  static async enqueueLiveAssessment(snapshot: FeeAssessmentSnapshot): Promise<{
    live_enqueued: boolean;
    live_posted: boolean;
    needs_attention: boolean;
  }> {
    if (!isLiveFeePostingAllowed() || snapshot.mode !== 'LIVE' || snapshot.transaction_type !== 'VIRTUAL_ACCOUNT_INWARD_TRANSFER') {
      return { live_enqueued: false, live_posted: false, needs_attention: false };
    }
    if (snapshot.kind !== 'ASSESSMENT' || snapshot.final_fee_kobo <= 0) {
      return { live_enqueued: false, live_posted: false, needs_attention: false };
    }
    const posted = walletPostingAmounts(snapshot);
    if (posted.final_fee_kobo <= 0) {
      return { live_enqueued: false, live_posted: false, needs_attention: false };
    }
    await WalletService.ensureWallet(snapshot.tenant_id);
    const store = this.store();
    const outbox = new FeePostingOutbox(store);
    await outbox.enqueueAssessment({
      ...snapshot,
      ...posted,
    });
    const run = await new FeePostingWorker(store, FeeLedgerPoster).runOnce(8);
    const needs = run.status === 'PROCESSED' && run.needsAttention > 0;
    if (needs) {
      console.error(`[InboundFee] ${snapshot.transaction_reference} fee posting NEEDS_ATTENTION; gross credit kept`);
    }
    return {
      live_enqueued: true,
      live_posted: run.status === 'PROCESSED' && run.done > 0,
      needs_attention: needs,
    };
  }

  static attachLiveFields(report: FeeShadowReport, extra: { live_enqueued?: boolean; live_posted?: boolean; needs_attention?: boolean }): FeeShadowReport & typeof extra {
    return { ...report, ...extra };
  }

  static fromAssess(result: Parameters<typeof buildFeeShadowReport>[0], extra?: { live_enqueued?: boolean; live_posted?: boolean }) {
    return { ...buildFeeShadowReport(result), ...extra };
  }
}

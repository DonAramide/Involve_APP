import { FeeSplitter } from '../modules/fee-orchestration/FeeSplitter';
import { FeeAssessmentMode, FeeOrchestrationError, FeeShareAmounts } from '../modules/fee-orchestration/types';
import {
  FEE_LEDGER_ACCOUNT_NATURE,
  FEE_LEDGER_ACCOUNTS,
  LedgerEntry,
} from './ledger.service';

export class FeeLedgerPostingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'FeeLedgerPostingError';
  }
}

export function feeAssessIdempotencyKey(assessmentId: string): string {
  return `ledger:fee:assess:${assessmentId}`;
}

export function feeReverseIdempotencyKey(reversalId: string): string {
  return `ledger:fee:reverse:${reversalId}`;
}

export interface FeeComponentAmounts {
  platform_amount_kobo: number;
  processor_amount_kobo: number;
  service_amount_kobo: number;
  agent_amount_kobo: number;
}

function positiveEntries(entries: LedgerEntry[]): LedgerEntry[] {
  return entries.filter((e) => e.amount > 0);
}

/** Compare money in kobo so ₦1.02 and a float sum of its parts still balance. */
function moneyKobo(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function assertLedgerBundleBalanced(entries: LedgerEntry[]): void {
  const debit = entries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + moneyKobo(e.amount), 0);
  const credit = entries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + moneyKobo(e.amount), 0);
  if (debit !== credit) {
    throw new FeeLedgerPostingError(
      `unbalanced fee ledger bundle: debit ${debit} credit ${credit}`,
      'UNBALANCED',
    );
  }
}

/**
 * Live bundle (not executed in shadow):
 * DEBIT USER_WALLET final_fee
 * CREDIT PLATFORM_FEE / PROCESSOR_FEE / SERVICE_FEE / AGENT_FEE
 * PROCESSOR_FEE is a payable, not platform revenue.
 */
export function buildFeeAssessmentBundle(amounts: FeeComponentAmounts): LedgerEntry[] {
  const finalKobo = moneyKobo(
    amounts.platform_amount_kobo +
      amounts.processor_amount_kobo +
      amounts.service_amount_kobo +
      amounts.agent_amount_kobo,
  );
  if (!Number.isFinite(finalKobo) || finalKobo < 0) {
    throw new FeeLedgerPostingError('final fee must be a non-negative amount', 'INVALID_AMOUNT');
  }
  if (finalKobo === 0) {
    return [];
  }
  const finalFee = finalKobo / 100;

  const entries = positiveEntries([
    { account: 'USER_WALLET', type: 'DEBIT', amount: finalFee },
    { account: 'PLATFORM_FEE', type: 'CREDIT', amount: amounts.platform_amount_kobo },
    { account: 'PROCESSOR_FEE', type: 'CREDIT', amount: amounts.processor_amount_kobo },
    { account: 'SERVICE_FEE', type: 'CREDIT', amount: amounts.service_amount_kobo },
    { account: 'AGENT_FEE', type: 'CREDIT', amount: amounts.agent_amount_kobo },
  ]);
  assertLedgerBundleBalanced(entries);
  return entries;
}

/**
 * Proportional component reversal: refund_fee = trunc(original_final * refunded_txn / original_txn),
 * then largest-remainder across original component weights so shares keep proportion.
 */
export function reverseFeeComponents(params: {
  original: FeeComponentAmounts;
  originalTransactionAmountKobo: number;
  refundedTransactionAmountKobo: number;
}): FeeShareAmounts {
  const originalFinal =
    params.original.platform_amount_kobo +
    params.original.processor_amount_kobo +
    params.original.service_amount_kobo +
    params.original.agent_amount_kobo;

  if (
    !Number.isInteger(params.originalTransactionAmountKobo) ||
    params.originalTransactionAmountKobo <= 0
  ) {
    throw new FeeOrchestrationError('original transaction amount must be a positive integer', 'INVALID_AMOUNT');
  }
  if (
    !Number.isInteger(params.refundedTransactionAmountKobo) ||
    params.refundedTransactionAmountKobo < 0 ||
    params.refundedTransactionAmountKobo > params.originalTransactionAmountKobo
  ) {
    throw new FeeOrchestrationError('refunded amount must be between 0 and original transaction amount', 'INVALID_AMOUNT');
  }

  const targetFee = Number(
    (BigInt(originalFinal) * BigInt(params.refundedTransactionAmountKobo)) /
      BigInt(params.originalTransactionAmountKobo),
  );

  const allocated = FeeSplitter.allocateByWeights(targetFee, [
    params.original.platform_amount_kobo,
    params.original.processor_amount_kobo,
    params.original.service_amount_kobo,
    params.original.agent_amount_kobo,
  ]);

  return {
    platform_amount_kobo: allocated[0],
    processor_amount_kobo: allocated[1],
    service_amount_kobo: allocated[2],
    agent_amount_kobo: allocated[3],
  };
}

/**
 * Opposite of the live assessment bundle: CREDIT USER_WALLET, DEBIT each fee account.
 */
export function buildFeeReversalBundle(amounts: FeeComponentAmounts): LedgerEntry[] {
  const finalKobo = moneyKobo(
    amounts.platform_amount_kobo +
      amounts.processor_amount_kobo +
      amounts.service_amount_kobo +
      amounts.agent_amount_kobo,
  );
  if (finalKobo === 0) {
    return [];
  }
  const finalFee = finalKobo / 100;
  const entries = positiveEntries([
    { account: 'USER_WALLET', type: 'CREDIT', amount: finalFee },
    { account: 'PLATFORM_FEE', type: 'DEBIT', amount: amounts.platform_amount_kobo },
    { account: 'PROCESSOR_FEE', type: 'DEBIT', amount: amounts.processor_amount_kobo },
    { account: 'SERVICE_FEE', type: 'DEBIT', amount: amounts.service_amount_kobo },
    { account: 'AGENT_FEE', type: 'DEBIT', amount: amounts.agent_amount_kobo },
  ]);
  assertLedgerBundleBalanced(entries);
  return entries;
}

function assertLivePostingAllowed(mode: FeeAssessmentMode): void {
  if (mode !== 'LIVE') {
    throw new FeeLedgerPostingError(
      'Shadow mode cannot invoke the fee ledger poster',
      'SHADOW_FORBIDDEN',
    );
  }
  if (process.env.FEE_ORCHESTRATION_LIVE !== 'true') {
    throw new FeeLedgerPostingError(
      'Fee ledger posting is not enabled',
      'LIVE_FLAG_OFF',
    );
  }
}

/** Deterministic rejections raised by the guarded fee RPCs. Never retried by the outbox. */
export const PERMANENT_FEE_POSTING_CODES = [
  'INSUFFICIENT_BALANCE',
  'FEE_DEBIT_INVALID_KEY',
  'FEE_DEBIT_INVALID_BUNDLE',
  'FEE_DEBIT_WALLET_NOT_FOUND',
  'FEE_REVERSAL_INVALID_KEY',
  'FEE_REVERSAL_INVALID_BUNDLE',
  'FEE_REVERSAL_WALLET_NOT_FOUND',
  'FEE_REVERSAL_ORIGINAL_NOT_POSTED',
  'FEE_REVERSAL_EXCEEDS_ORIGINAL',
] as const;

export function mapGuardedRpcError(error: { message?: string } | null | undefined): FeeLedgerPostingError {
  const message = String(error?.message || error || 'unknown fee ledger error');
  const code = PERMANENT_FEE_POSTING_CODES.find((c) => message.includes(c));
  return new FeeLedgerPostingError(message, code || 'LEDGER_WRITE_FAILED');
}

export type FeePostingResult =
  | { status: 'SKIPPED_ZERO' }
  | { status: 'CREATED'; ledgerId: string | null; idempotencyKey: string }
  | { status: 'DE-DUPLICATED'; ledgerId: string | null; idempotencyKey: string };

type GuardedRpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;

let rpcOverride: GuardedRpc | null = null;

/** Test seam: route guarded RPCs to a local database harness. */
export function setFeeLedgerRpcForTests(rpc: GuardedRpc | null): void {
  rpcOverride = rpc;
}

async function callGuardedRpc(fn: string, args: Record<string, unknown>): Promise<{ data: any; error: any }> {
  if (rpcOverride) return rpcOverride(fn, args);
  const { supabaseAdmin } = await import('../db/supabase');
  const res = await supabaseAdmin.rpc(fn, args);
  return { data: res.data, error: res.error };
}

function toPostingResult(data: any, idempotencyKey: string): FeePostingResult {
  const status = data?.status === 'DE-DUPLICATED' ? 'DE-DUPLICATED' : 'CREATED';
  return { status, ledgerId: data?.ledger_id ?? null, idempotencyKey };
}

/**
 * Capability-only poster. Not wired into FeeOrchestrator or any money path.
 * Runs only if mode=LIVE and FEE_ORCHESTRATION_LIVE=true, and only through the
 * guarded RPCs (post_fee_debit_guarded / post_fee_reversal_guarded).
 */
export class FeeLedgerPoster {
  static readonly accountNature = FEE_LEDGER_ACCOUNT_NATURE;
  static readonly feeAccounts = FEE_LEDGER_ACCOUNTS;

  static async postAssessment(params: {
    mode: FeeAssessmentMode;
    assessmentId: string;
    tenantId: string;
    reference: string;
    amounts: FeeComponentAmounts;
  }): Promise<FeePostingResult> {
    assertLivePostingAllowed(params.mode);
    const entries = buildFeeAssessmentBundle(params.amounts);
    if (entries.length === 0) {
      return { status: 'SKIPPED_ZERO' };
    }
    const idempotencyKey = feeAssessIdempotencyKey(params.assessmentId);
    const { data, error } = await callGuardedRpc('post_fee_debit_guarded', {
      p_tenant_id: params.tenantId,
      p_idempotency_key: idempotencyKey,
      p_reference: params.reference,
      p_entries: entries,
      p_metadata: {
        kind: 'FEE_ASSESSMENT',
        assessmentId: params.assessmentId,
        accountNature: FEE_LEDGER_ACCOUNT_NATURE,
      },
    });
    if (error) throw mapGuardedRpcError(error);
    return toPostingResult(data, idempotencyKey);
  }

  static async postReversal(params: {
    mode: FeeAssessmentMode;
    reversalId: string;
    assessmentId: string;
    tenantId: string;
    reference: string;
    amounts: FeeComponentAmounts;
  }): Promise<FeePostingResult> {
    assertLivePostingAllowed(params.mode);
    const entries = buildFeeReversalBundle(params.amounts);
    if (entries.length === 0) {
      return { status: 'SKIPPED_ZERO' };
    }
    const idempotencyKey = feeReverseIdempotencyKey(params.reversalId);
    const { data, error } = await callGuardedRpc('post_fee_reversal_guarded', {
      p_tenant_id: params.tenantId,
      p_idempotency_key: idempotencyKey,
      p_reference: params.reference,
      p_assessment_id: params.assessmentId,
      p_entries: entries,
      p_metadata: {
        kind: 'FEE_REVERSAL',
        reversalId: params.reversalId,
        accountNature: FEE_LEDGER_ACCOUNT_NATURE,
      },
    });
    if (error) throw mapGuardedRpcError(error);
    return toPostingResult(data, idempotencyKey);
  }
}

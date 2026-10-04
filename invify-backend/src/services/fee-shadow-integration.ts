import { FeeOrchestrator } from '../modules/fee-orchestration/FeeOrchestrator';
import { FeeCalculator } from '../modules/fee-orchestration/FeeCalculator';
import { AssessResult } from '../modules/fee-orchestration/types';
import { SupabaseFeeAssessmentStore } from '../modules/fee-orchestration/stores/SupabaseFeeAssessmentStore';
import {
  loadOwningAgentForTenant,
  SupabaseFeeProfileCatalog,
} from '../modules/fee-orchestration/stores/SupabaseFeeProfileCatalog';
import { supabaseAdmin } from '../db/supabase';
import { liveFeeAssessmentMode, isLiveFeePostingAllowed } from './fee-live-gate';

export const FEE_SHADOW_SOURCE_POS = 'invify.pos';
export const FEE_SHADOW_SOURCE_VA = 'invify.va';

export function nairaToKobo(amountNaira: number): number {
  return Math.round(Number(amountNaira) * 100);
}

function usableReference(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  return trimmed && trimmed.toUpperCase() !== 'N/A' ? trimmed : '';
}

/**
 * Deterministic POS fee idempotency key derived only from transaction identity
 * that is identical across retries and delayed callbacks:
 *   1. terminal-scoped client reference (when the device supplies one)
 *   2. RRN + STAN
 * Returns null when neither exists. Server-generated ids (txId) are random per
 * call and must never be used here.
 */
export function posShadowIdempotencyKey(params: {
  tenantId: string;
  rrn?: string | null;
  stan?: string | null;
  terminalId?: string | null;
  clientReference?: string | null;
  txId?: string;
}): string | null {
  const tenantId = usableReference(params.tenantId);
  if (!tenantId) return null;
  const clientReference = usableReference(params.clientReference);
  const terminalId = usableReference(params.terminalId);
  if (clientReference && terminalId) {
    return `POS_WITHDRAWAL:${tenantId}:ref:${terminalId}:${clientReference}`;
  }
  const rrn = usableReference(params.rrn);
  const stan = usableReference(params.stan);
  if (rrn && stan) {
    return `POS_WITHDRAWAL:${tenantId}:${rrn}:${stan}`;
  }
  return null;
}

export function vaShadowIdempotencyKey(reference: string): string {
  return `VIRTUAL_ACCOUNT_INWARD_TRANSFER:${reference}`;
}

export type FeeShadowReport = {
  status: 'ASSESSED' | 'IDEMPOTENT_REPLAY' | 'NO_PROFILE' | 'SHADOW_FAILED' | 'SKIPPED';
  skip_reason?: string;
  live_enqueued?: boolean;
  live_posted?: boolean;
  needs_attention?: boolean;
  transaction_type: string;
  source_system: string;
  source_idempotency_key: string;
  transaction_amount_kobo: number | null;
  profile_id: string | null;
  profile_version_id: string | null;
  override_version_id: string | null;
  calculated_fee_kobo: number | null;
  final_fee_kobo: number | null;
  platform_amount_kobo: number | null;
  processor_amount_kobo: number | null;
  service_amount_kobo: number | null;
  agent_amount_kobo: number | null;
  legacy_fee_independently_calculated: boolean;
  compared_existing_fee_kobo: number | null;
  compare_delta_kobo: number | null;
  error?: string;
};

export function buildFeeShadowReport(
  result: AssessResult | { status: 'SHADOW_FAILED'; error: string } | { status: 'SKIPPED'; reason?: string },
  extras?: { legacyFeeKobo?: number | null },
): FeeShadowReport {
  if (result.status === 'SHADOW_FAILED') {
    return {
      status: 'SHADOW_FAILED',
      transaction_type: '',
      source_system: '',
      source_idempotency_key: '',
      transaction_amount_kobo: null,
      profile_id: null,
      profile_version_id: null,
      override_version_id: null,
      calculated_fee_kobo: null,
      final_fee_kobo: null,
      platform_amount_kobo: null,
      processor_amount_kobo: null,
      service_amount_kobo: null,
      agent_amount_kobo: null,
      legacy_fee_independently_calculated: extras?.legacyFeeKobo != null,
      compared_existing_fee_kobo: extras?.legacyFeeKobo ?? null,
      compare_delta_kobo: null,
      error: result.error,
    };
  }
  if (result.status === 'SKIPPED' || result.status === 'NO_PROFILE') {
    return {
      status: result.status === 'SKIPPED' ? 'SKIPPED' : 'NO_PROFILE',
      transaction_type: '',
      source_system: '',
      source_idempotency_key: '',
      transaction_amount_kobo: null,
      profile_id: null,
      profile_version_id: null,
      override_version_id: null,
      calculated_fee_kobo: null,
      final_fee_kobo: null,
      platform_amount_kobo: null,
      processor_amount_kobo: null,
      service_amount_kobo: null,
      agent_amount_kobo: null,
      legacy_fee_independently_calculated: extras?.legacyFeeKobo != null,
      compared_existing_fee_kobo: extras?.legacyFeeKobo ?? null,
      compare_delta_kobo: extras?.legacyFeeKobo ?? null,
      ...(result.status === 'SKIPPED' && result.reason ? { skip_reason: result.reason } : {}),
    };
  }
  const snap = result.snapshot;
  const legacy = extras?.legacyFeeKobo ?? null;
  return {
    status: result.status,
    transaction_type: snap.transaction_type,
    source_system: snap.source_system,
    source_idempotency_key: snap.source_idempotency_key,
    transaction_amount_kobo: snap.transaction_amount_kobo,
    profile_id: snap.profile_id,
    profile_version_id: snap.profile_version_id,
    override_version_id: snap.override_version_id,
    calculated_fee_kobo: snap.calculated_fee_kobo,
    final_fee_kobo: snap.final_fee_kobo,
    platform_amount_kobo: snap.platform_amount_kobo,
    processor_amount_kobo: snap.processor_amount_kobo,
    service_amount_kobo: snap.service_amount_kobo,
    agent_amount_kobo: snap.agent_amount_kobo,
    legacy_fee_independently_calculated: legacy != null,
    compared_existing_fee_kobo: legacy,
    compare_delta_kobo: legacy != null ? snap.final_fee_kobo - legacy : null,
  };
}

/** Read-only estimate from tenant_fee_profiles VA inward columns. Never writes. */
export function estimateLegacyVaInwardFeeKobo(
  transactionAmountKobo: number,
  profile: { transfer_inward_fee_bps?: number | null; transfer_inward_fee_cap?: number | null } | null,
): number | null {
  if (!profile || profile.transfer_inward_fee_bps == null) return null;
  const bps = Number(profile.transfer_inward_fee_bps);
  if (!Number.isFinite(bps) || bps < 0) return null;
  try {
    const capNaira = profile.transfer_inward_fee_cap != null ? Number(profile.transfer_inward_fee_cap) : 0;
    const calc = FeeCalculator.calculate({
      method: 'PERCENTAGE',
      transactionAmountKobo,
      percentageBps: bps,
      flatAmountKobo: 0,
      minFeeKobo: 0,
      maxFeeKobo: capNaira > 0 ? Math.round(capNaira * 100) : 0,
    });
    return calc.final_fee_kobo;
  } catch {
    return null;
  }
}

let testOrchestrator: InstanceType<typeof FeeOrchestrator> | null = null;
let productionOrchestrator: InstanceType<typeof FeeOrchestrator> | null = null;

export function setFeeShadowTestOrchestrator(orchestrator: InstanceType<typeof FeeOrchestrator> | null): void {
  testOrchestrator = orchestrator;
}

function getOrchestrator(): InstanceType<typeof FeeOrchestrator> {
  if (testOrchestrator) return testOrchestrator;
  if (process.env.JEST_WORKER_ID && process.env.FEE_SHADOW_ALLOW_SUPABASE !== 'true') {
    throw new Error('FEE_SHADOW_SKIP_NETWORK');
  }
  if (!productionOrchestrator) {
    productionOrchestrator = new FeeOrchestrator(
      new SupabaseFeeProfileCatalog(),
      new SupabaseFeeAssessmentStore(),
    );
  }
  return productionOrchestrator;
}

async function loadLegacyVaProfile(tenantId: string) {
  if (process.env.JEST_WORKER_ID && process.env.FEE_SHADOW_ALLOW_SUPABASE !== 'true') {
    return null;
  }
  try {
    const { data } = await supabaseAdmin
      .from('tenant_fee_profiles')
      .select('transfer_inward_fee_bps, transfer_inward_fee_cap')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export class FeeShadowIntegration {
  static async assessPosWithdrawalSafely(params: {
    tenantId: string;
    amountNaira: number;
    rrn?: string | null;
    stan?: string | null;
    terminalId?: string | null;
    clientReference?: string | null;
    txId: string;
    eventTime?: Date;
  }): Promise<FeeShadowReport> {
    try {
      const amountKobo = nairaToKobo(params.amountNaira);
      if (!params.tenantId || amountKobo <= 0) {
        return buildFeeShadowReport({ status: 'SKIPPED' });
      }
      const sourceIdempotencyKey = posShadowIdempotencyKey(params);
      if (!sourceIdempotencyKey) {
        console.warn(
          `[FeeShadow] POS assessment skipped: no stable reference (tenant=${params.tenantId} tx=${params.txId})`,
        );
        return buildFeeShadowReport({ status: 'SKIPPED', reason: 'NO_STABLE_REFERENCE' });
      }
      let orchestrator: InstanceType<typeof FeeOrchestrator>;
      try {
        orchestrator = getOrchestrator();
      } catch (err: any) {
        if (String(err?.message) === 'FEE_SHADOW_SKIP_NETWORK') {
          return buildFeeShadowReport({ status: 'SKIPPED' });
        }
        throw err;
      }
      let owner = null;
      try {
        owner = await loadOwningAgentForTenant(params.tenantId);
      } catch (ownErr: any) {
        console.warn('[FeeShadow] POS ownership:', ownErr?.message || ownErr);
      }
      const result = await orchestrator.assess({
        transactionType: 'POS_WITHDRAWAL',
        tenantId: params.tenantId,
        agentId: owner?.agent_id || null,
        transactionAmountKobo: amountKobo,
        eventTime: params.eventTime || new Date(),
        sourceSystem: FEE_SHADOW_SOURCE_POS,
        sourceIdempotencyKey,
        transactionReference: params.txId,
        mode: 'SHADOW',
      });
      return buildFeeShadowReport(result);
    } catch (err: any) {
      console.warn('[FeeShadow] POS assessment isolated failure:', err?.message || err);
      return buildFeeShadowReport({ status: 'SHADOW_FAILED', error: String(err?.message || err) });
    }
  }

  static async assessVaInwardSafely(params: {
    tenantId: string;
    amountNaira: number;
    reference: string;
    eventTime?: Date;
  }): Promise<FeeShadowReport> {
    try {
      const amountKobo = nairaToKobo(params.amountNaira);
      if (!params.tenantId || !params.reference || amountKobo <= 0) {
        return buildFeeShadowReport({ status: 'SKIPPED' });
      }
      let orchestrator: InstanceType<typeof FeeOrchestrator>;
      try {
        orchestrator = getOrchestrator();
      } catch (err: any) {
        if (String(err?.message) === 'FEE_SHADOW_SKIP_NETWORK') {
          return buildFeeShadowReport({ status: 'SKIPPED' });
        }
        throw err;
      }
      let owner = null;
      try {
        owner = await loadOwningAgentForTenant(params.tenantId);
      } catch (ownErr: any) {
        console.warn('[FeeShadow] VA ownership:', ownErr?.message || ownErr);
      }
      const result = await orchestrator.assess({
        transactionType: 'VIRTUAL_ACCOUNT_INWARD_TRANSFER',
        tenantId: params.tenantId,
        agentId: owner?.agent_id || null,
        transactionAmountKobo: amountKobo,
        eventTime: params.eventTime || new Date(),
        sourceSystem: FEE_SHADOW_SOURCE_VA,
        sourceIdempotencyKey: vaShadowIdempotencyKey(params.reference),
        transactionReference: params.reference,
        mode: liveFeeAssessmentMode(),
      });
      const legacy = estimateLegacyVaInwardFeeKobo(amountKobo, await loadLegacyVaProfile(params.tenantId));
      const report = buildFeeShadowReport(result, { legacyFeeKobo: legacy });
      if (
        isLiveFeePostingAllowed() &&
        (result.status === 'ASSESSED' || result.status === 'IDEMPOTENT_REPLAY') &&
        result.snapshot.mode === 'LIVE'
      ) {
        try {
          const { InboundFeeService } = await import('./inbound-fee.service');
          const live = await InboundFeeService.enqueueLiveAssessment(result.snapshot);
          return { ...report, ...live };
        } catch (postErr: any) {
          console.error('[FeeShadow] VA live fee enqueue failed; gross credit kept:', postErr?.message || postErr);
          return { ...report, live_enqueued: false, live_posted: false, error: String(postErr?.message || postErr) };
        }
      }
      return report;
    } catch (err: any) {
      console.warn('[FeeShadow] VA assessment isolated failure:', err?.message || err);
      return buildFeeShadowReport({ status: 'SHADOW_FAILED', error: String(err?.message || err) });
    }
  }

  static isPosApproved(response: { paymentSuccess?: boolean; statusCode?: string } | null | undefined): boolean {
    if (!response) return false;
    return response.paymentSuccess === true || String(response.statusCode || '') === '00';
  }

  static shouldAssessVaInward(input: { status?: string; event?: string; type?: string } = {}): boolean {
    const status = String(input.status || 'success').toLowerCase();
    if (['failed', 'failure', 'declined', 'error', 'pending', 'abandoned'].includes(status)) {
      return false;
    }
    if (String(input.type || '').toLowerCase() === 'payout') return false;
    return true;
  }

  static async afterPosResult<T extends { paymentSuccess?: boolean; statusCode?: string }>(
    response: T,
    params: {
      tenantId: string;
      amountNaira: number;
      rrn?: string | null;
      stan?: string | null;
      terminalId?: string | null;
      clientReference?: string | null;
      txId: string;
    },
  ): Promise<T> {
    if (this.isPosApproved(response)) {
      await this.assessPosWithdrawalSafely(params);
    }
    return response;
  }

  static async afterVaInwardResult(
    success: boolean,
    params: { tenantId: string; amountNaira: number; reference: string; eventTime?: Date },
  ) {
    if (!success || !this.shouldAssessVaInward({ status: success ? 'success' : 'failed' })) {
      return { status: 'SKIPPED' as const };
    }
    return this.assessVaInwardSafely(params);
  }
}

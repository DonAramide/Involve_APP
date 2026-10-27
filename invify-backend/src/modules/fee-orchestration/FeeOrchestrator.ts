import { randomUUID } from 'crypto';
import { FeeCalculator } from './FeeCalculator';
import { FeeResolver } from './FeeResolver';
import { FeeSplitter } from './FeeSplitter';
import {
  AssessRequest,
  AssessResult,
  FeeAssessmentKind,
  FeeAssessmentLine,
  FeeAssessmentSnapshot,
  FeeAssessmentStore,
  FeeOrchestrationError,
  FeeProfileCatalog,
} from './types';

function linesFromSnapshot(snapshot: FeeAssessmentSnapshot): FeeAssessmentLine[] {
  return [
    { component: 'PLATFORM', amount_kobo: snapshot.platform_amount_kobo, percent_bps: snapshot.platform_bps, ledger_entry_id: null },
    { component: 'PROCESSOR', amount_kobo: snapshot.processor_amount_kobo, percent_bps: snapshot.processor_bps, ledger_entry_id: null },
    { component: 'SERVICE', amount_kobo: snapshot.service_amount_kobo, percent_bps: snapshot.service_bps, ledger_entry_id: null },
    { component: 'AGENT_FEE', amount_kobo: snapshot.agent_amount_kobo, percent_bps: snapshot.agent_bps, ledger_entry_id: null },
  ];
}

/**
 * Shadow-capable fee assessment. Persists snapshot + four lines.
 * Does not post ledger entries, debit customers, or mutate wallet balances.
 */
export class FeeOrchestrator {
  private readonly resolver: FeeResolver;

  constructor(
    catalog: FeeProfileCatalog,
    private readonly store: FeeAssessmentStore,
  ) {
    this.resolver = new FeeResolver(catalog);
  }

  public async assess(request: AssessRequest): Promise<AssessResult> {
    const existing = await this.store.findByIdempotency(
      request.sourceSystem,
      request.sourceIdempotencyKey,
    );
    if (existing) {
      return {
        status: 'IDEMPOTENT_REPLAY',
        snapshot: existing.snapshot,
        lines: existing.lines,
        replayed: true,
      };
    }

    if (!Number.isInteger(request.transactionAmountKobo) || request.transactionAmountKobo <= 0) {
      throw new FeeOrchestrationError(
        'transaction amount must be a positive integer kobo amount',
        'INVALID_AMOUNT',
      );
    }

    const resolved = await this.resolver.resolve(
      request.transactionType,
      request.tenantId,
      request.eventTime,
      request.agentId,
    );
    if (resolved.status === 'NO_PROFILE') {
      return { status: 'NO_PROFILE' };
    }

    const version = resolved.version;
    FeeSplitter.assertValidSplit(version);

    const calc = FeeCalculator.calculate({
      method: version.method,
      transactionAmountKobo: request.transactionAmountKobo,
      percentageBps: version.percentage_bps,
      flatAmountKobo: version.flat_amount_kobo,
      minFeeKobo: version.min_fee_kobo,
      maxFeeKobo: version.max_fee_kobo,
      tenantId: request.tenantId,
    });

    const split = FeeSplitter.split(calc.final_fee_kobo, version);
    const mode = request.mode ?? 'SHADOW';
    const kind: FeeAssessmentKind = 'ASSESSMENT';

    const snapshot: FeeAssessmentSnapshot = {
      id: randomUUID(),
      mode,
      kind,
      transaction_type: request.transactionType,
      source_system: request.sourceSystem,
      source_idempotency_key: request.sourceIdempotencyKey,
      transaction_reference: request.transactionReference,
      tenant_id: request.tenantId,
      agent_id: version.agent_id || request.agentId || null,
      resolved_source: version.source === 'AGENT_PROFILE' ? 'AGENT_PROFILE' : 'GLOBAL_FALLBACK',
      profile_id: version.profile_id,
      profile_version_id: version.profile_version_id,
      override_version_id: version.override_version_id,
      method: version.method,
      transaction_amount_kobo: request.transactionAmountKobo,
      percentage_bps: version.percentage_bps,
      flat_amount_kobo: version.flat_amount_kobo,
      min_fee_kobo: version.min_fee_kobo,
      max_fee_kobo: version.max_fee_kobo,
      calculated_fee_kobo: calc.calculated_fee_kobo,
      min_applied_kobo: calc.min_applied_kobo,
      cap_applied_kobo: calc.cap_applied_kobo,
      final_fee_kobo: calc.final_fee_kobo,
      platform_bps: version.platform_bps,
      processor_bps: version.processor_bps,
      service_bps: version.service_bps,
      agent_bps: version.agent_bps,
      platform_amount_kobo: split.platform_amount_kobo,
      processor_amount_kobo: split.processor_amount_kobo,
      service_amount_kobo: split.service_amount_kobo,
      agent_amount_kobo: split.agent_amount_kobo,
    };

    const lines = linesFromSnapshot(snapshot);
    const persisted = await this.store.insert(snapshot, lines);
    return {
      status: 'ASSESSED',
      snapshot: persisted.snapshot,
      lines: persisted.lines,
      replayed: false,
    };
  }
}

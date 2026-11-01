import { FeeCalculator } from '../fee-orchestration/FeeCalculator';
import { FeeSplitter } from '../fee-orchestration/FeeSplitter';
import { FeeCalcMethod, REQUIRED_SPLIT_BPS } from '../fee-orchestration/types';
import { HMO_SERVICE_DEFAULTS } from '../../services/platform-fee-profiles.service';
import { evaluateHmoChargeability } from './chargeability';
import { gateHmoServiceFeePosting } from './posting-gate';

export interface HmoFeeFields {
  method: FeeCalcMethod;
  percentage_bps: number;
  flat_amount_kobo: number;
  min_fee_kobo: number;
  max_fee_kobo: number;
  platform_share_bps: number;
  processor_share_bps: number;
  service_share_bps: number;
  agent_share_bps: number;
  profile_version_id?: string | null;
  source?: 'GLOBAL_PROFILE' | 'AGENT_PROFILE' | 'VIRTUAL_CATALOG';
}

export function defaultHmoFeeFields(): HmoFeeFields {
  return {
    ...HMO_SERVICE_DEFAULTS,
    platform_share_bps: 0,
    processor_share_bps: 0,
    service_share_bps: 0,
    agent_share_bps: 0,
    profile_version_id: null,
    source: 'VIRTUAL_CATALOG',
  };
}

export function previewHmoServiceFee(input: {
  premiumMinor: number;
  fields?: HmoFeeFields;
}) {
  const fields = input.fields || defaultHmoFeeFields();
  const breakdown = FeeCalculator.calculate({
    method: fields.method,
    transactionAmountKobo: input.premiumMinor,
    percentageBps: fields.percentage_bps,
    flatAmountKobo: fields.flat_amount_kobo,
    minFeeKobo: fields.min_fee_kobo,
    maxFeeKobo: fields.max_fee_kobo,
  });
  const splitTotal =
    fields.platform_share_bps +
    fields.processor_share_bps +
    fields.service_share_bps +
    fields.agent_share_bps;
  const distribution =
    splitTotal === REQUIRED_SPLIT_BPS
      ? FeeSplitter.split(breakdown.final_fee_kobo, {
          platform_bps: fields.platform_share_bps,
          processor_bps: fields.processor_share_bps,
          service_bps: fields.service_share_bps,
          agent_bps: fields.agent_share_bps,
        })
      : null;
  return {
    transaction_type: 'HMO_SERVICE' as const,
    insurer_premium_kobo: input.premiumMinor,
    invify_service_fee_kobo: breakdown.final_fee_kobo,
    calculated_fee_kobo: breakdown.calculated_fee_kobo,
    min_applied_kobo: breakdown.min_applied_kobo,
    cap_applied_kobo: breakdown.cap_applied_kobo,
    method: fields.method,
    percentage_bps: fields.percentage_bps,
    flat_amount_kobo: fields.flat_amount_kobo,
    profile_version_id: fields.profile_version_id || null,
    source: fields.source || 'VIRTUAL_CATALOG',
    distribution,
    distribution_valid: Boolean(distribution),
    institution_payable_kobo: 0,
    platform_revenue_kobo: distribution?.platform_amount_kobo ?? 0,
    note:
      'Insurer premium and Invify service fee are tracked independently. Institution payable stays 0 until ownership is approved.',
  };
}

export function evaluateHmoServiceCharge(input: {
  tenantId: string;
  enrolmentId?: string | null;
  enrolmentStatus?: string | null;
  invoicePaid?: boolean;
  requestCancelled?: boolean;
  premiumMinor: number;
  paymentId?: string;
  invoiceId?: string;
  fields?: HmoFeeFields;
  idempotencyKey?: string;
}) {
  const chargeability = evaluateHmoChargeability({
    enrolmentStatus: input.enrolmentStatus,
    invoicePaid: input.invoicePaid,
    requestCancelled: input.requestCancelled,
  });
  const gate = gateHmoServiceFeePosting();
  const preview = chargeability.chargeable
    ? previewHmoServiceFee({ premiumMinor: input.premiumMinor, fields: input.fields })
    : null;
  return {
    tenant_id: input.tenantId,
    enrolment_id: input.enrolmentId || null,
    payment_id: input.paymentId || null,
    invoice_id: input.invoiceId || null,
    idempotency_key: input.idempotencyKey || (input.paymentId ? `hw:fee:${input.enrolmentId || 'none'}:${input.paymentId}` : null),
    chargeability,
    preview,
    posting: gate,
    wallet_debited: false,
    institution_earning_created: false,
    ledger_reference: null,
  };
}

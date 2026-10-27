export const REQUIRED_SPLIT_BPS = 10000

export const POS_WITHDRAWAL_DEFAULTS = {
  method: 'PERCENTAGE',
  percentage_bps: 125,
  flat_amount_kobo: 0,
  min_fee_kobo: 0,
  max_fee_kobo: 5000,
}

export function isNonNegInt(value) {
  return Number.isInteger(value) && value >= 0
}

export function shareTotalBps(fields) {
  return (
    Number(fields.platform_share_bps || 0) +
    Number(fields.processor_share_bps || 0) +
    Number(fields.service_share_bps || 0) +
    Number(fields.agent_share_bps || 0)
  )
}

export function distributionIsValid(fields) {
  return shareTotalBps(fields) === REQUIRED_SPLIT_BPS
}

export function bpsToPercentLabel(bps) {
  return `${(Number(bps || 0) / 100).toFixed(2)}%`
}

export function publishBlockers(transactionType, fields, opts = {}) {
  const reasons = []
  if (opts.noDraft) reasons.push('No DRAFT version is eligible for publication.')
  const method = fields.method
  if (!['FLAT', 'PERCENTAGE', 'HYBRID'].includes(method)) {
    reasons.push('Calculation method is invalid.')
  }
  const keys = [
    'percentage_bps',
    'flat_amount_kobo',
    'min_fee_kobo',
    'max_fee_kobo',
    'platform_share_bps',
    'processor_share_bps',
    'service_share_bps',
    'agent_share_bps',
  ]
  if (keys.some((k) => !isNonNegInt(Number(fields[k])))) {
    reasons.push('Negative fee values are not allowed.')
  }
  if (!distributionIsValid(fields)) {
    reasons.push('Distribution must total exactly 100%.')
  }
  if (method === 'FLAT' && (Number(fields.flat_amount_kobo) <= 0 || Number(fields.percentage_bps) !== 0)) {
    reasons.push('FLAT requires a positive flat amount and 0% percentage.')
  }
  if (method === 'PERCENTAGE' && Number(fields.percentage_bps) <= 0) {
    reasons.push('PERCENTAGE requires percentage_bps > 0.')
  }
  if (method === 'HYBRID' && (Number(fields.flat_amount_kobo) <= 0 || Number(fields.percentage_bps) <= 0)) {
    reasons.push('HYBRID requires both a positive flat amount and percentage.')
  }
  return reasons
}

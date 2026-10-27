/**
 * In-memory platform fee preview. Matches backend FeeCalculator kobo adapter
 * (naira bankers-round, then min/cap in kobo). Never persists.
 */
import { distributionIsValid } from './platformFeeBps'

function bankersRound(num) {
  const m = 100
  const d = num * m
  const r = Math.round(d)
  if (Math.abs(d % 1) === 0.5) {
    return (r % 2 === 0 ? r : r - 1) / m
  }
  return r / m
}

function rawFeeKobo(fields, transactionAmountKobo) {
  const amountNaira = transactionAmountKobo / 100
  const flatNaira = Number(fields.flat_amount_kobo || 0) / 100
  const percentage = Number(fields.percentage_bps || 0) / 100
  let calculated = 0
  if (fields.method === 'FLAT') calculated = flatNaira
  else if (fields.method === 'HYBRID') calculated = flatNaira + (amountNaira * percentage) / 100
  else calculated = (amountNaira * percentage) / 100
  return Math.round(bankersRound(calculated) * 100)
}

function allocateByWeights(total, weights) {
  const weightSum = weights.reduce((s, w) => s + w, 0)
  if (total === 0 || weightSum === 0) return weights.map(() => 0)
  const floors = weights.map((w) => Math.trunc((total * w) / weightSum))
  let leftover = total - floors.reduce((s, n) => s + n, 0)
  const remainders = weights.map((w, index) => ({ index, remainder: (total * w) % weightSum }))
  remainders.sort((a, b) => (b.remainder !== a.remainder ? b.remainder - a.remainder : a.index - b.index))
  for (const row of remainders) {
    if (leftover <= 0) break
    floors[row.index] += 1
    leftover -= 1
  }
  return floors
}

export function koboToNairaLabel(kobo) {
  return `₦${(Number(kobo || 0) / 100).toFixed(2)}`
}

export function previewPlatformFee({ transactionType, transactionAmountKobo, fields }) {
  const locked = { ...fields }
  const calculated_fee_kobo = rawFeeKobo(locked, transactionAmountKobo)
  let fee = calculated_fee_kobo
  let min_applied_kobo = 0
  let cap_applied_kobo = 0
  const minFee = Number(locked.min_fee_kobo) > 0 ? Number(locked.min_fee_kobo) : 0
  if (minFee > 0 && fee < minFee) {
    min_applied_kobo = minFee - fee
    fee = minFee
  }
  const maxFee = Number(locked.max_fee_kobo) > 0 ? Number(locked.max_fee_kobo) : 0
  if (maxFee > 0 && fee > maxFee) {
    cap_applied_kobo = fee - maxFee
    fee = maxFee
  }
  const splitOk = distributionIsValid(locked)
  const weights = [
    Number(locked.platform_share_bps || 0),
    Number(locked.processor_share_bps || 0),
    Number(locked.service_share_bps || 0),
    Number(locked.agent_share_bps || 0),
  ]
  const allocated = splitOk ? allocateByWeights(fee, weights) : [0, 0, 0, 0]
  return {
    persisted: false,
    created_assessment: false,
    created_ledger_entry: false,
    calculated_fee_kobo,
    min_applied_kobo,
    cap_applied_kobo,
    final_fee_kobo: fee,
    distribution_valid: splitOk,
    distribution: splitOk
      ? {
          platform_amount_kobo: allocated[0],
          processor_amount_kobo: allocated[1],
          service_amount_kobo: allocated[2],
          agent_amount_kobo: allocated[3],
        }
      : null,
  }
}

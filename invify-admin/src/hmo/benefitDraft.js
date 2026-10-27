/**
 * Benefit rows saved on hw_plan_versions.benefits.
 * Coverage limits are NGN with at most two decimal places.
 * Co-pay is a percentage converted to basis points (1% = 100 bps).
 */

export function emptyBenefit() {
  return { category: '', limitNaira: '', copayPercent: '0' }
}

export function benefitsFromVersion(benefits) {
  if (!Array.isArray(benefits) || !benefits.length) return [emptyBenefit()]
  return benefits.map((benefit) => ({
    category: String(benefit?.category || ''),
    limitNaira: koboToNaira(benefit?.limitMinor),
    copayPercent: bpsToPercent(benefit?.copayBps)
  }))
}

export function benefitsPayload(rows) {
  const filled = (rows || []).filter((row) => {
    const category = String(row?.category || '').trim()
    const limit = String(row?.limitNaira || '').trim()
    const copay = String(row?.copayPercent || '').trim()
    return category || limit || (copay && copay !== '0' && copay !== '0.00')
  })
  const benefits = []
  for (let index = 0; index < filled.length; index += 1) {
    const row = filled[index]
    const category = String(row.category || '').trim()
    if (!category || category.length > 80) {
      return { error: `Benefit ${index + 1} needs a name of 80 characters or fewer.` }
    }
    const limitNaira = String(row.limitNaira ?? '').trim()
    if (!/^\d+(\.\d{1,2})?$/.test(limitNaira)) {
      return { error: `Benefit ${index + 1} needs a coverage limit in NGN, with at most two decimal places.` }
    }
    const copay = String(row.copayPercent ?? '').trim() || '0'
    if (!/^\d+(\.\d{1,2})?$/.test(copay)) {
      return { error: `Benefit ${index + 1} co-pay must be a percentage from 0 to 100.` }
    }
    const copayBps = Math.round(Number(copay) * 100)
    if (copayBps < 0 || copayBps > 10000) {
      return { error: `Benefit ${index + 1} co-pay must be between 0 and 100 percent.` }
    }
    benefits.push({ category, limitNaira, copayBps })
  }
  return { benefits }
}

function koboToNaira(minor) {
  const amount = typeof minor === 'string' && /^-?\d+$/.test(minor) ? Number(minor) : minor
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) return ''
  return (amount / 100).toFixed(2)
}

function bpsToPercent(bps) {
  if (bps === undefined || bps === null || bps === '') return '0.00'
  const amount = typeof bps === 'string' && /^\d+$/.test(bps) ? Number(bps) : bps
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) return ''
  return (amount / 100).toFixed(2)
}

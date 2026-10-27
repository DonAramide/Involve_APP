/**
 * Presentation for the HMO overview command center.
 * Money is integer kobo. Missing sources stay unavailable and are not shown as zero.
 */

export function formatKobo(minor) {
  if (typeof minor !== 'number' || !Number.isInteger(minor)) return null
  const sign = minor < 0 ? '-' : ''
  const absolute = Math.abs(minor) / 100
  return `${sign}₦${absolute.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatRate(bps) {
  if (typeof bps !== 'number' || !Number.isInteger(bps)) return null
  return `${(bps / 100).toFixed(2)}%`
}

function moneyCard(label, minor, detail, period) {
  const value = formatKobo(minor)
  if (!value) {
    return { label, value: 'Unavailable', detail: detail || 'A persisted amount was missing. It is not shown as zero.', tone: 'error', period }
  }
  return { label, value, detail, tone: minor === 0 ? 'empty' : 'ok', period }
}

function unavailableCard(label, detail, period) {
  return { label, value: 'Unavailable', detail, tone: 'withheld', period }
}

export function commandCards(command, load, periodLabel) {
  const period = periodLabel || 'All persisted rows'
  if (load === 'withheld' || load === 'reason_required' || load === 'access_denied') {
    return ['Premiums invoiced', 'Premiums collected', 'Reconciled collections', 'Outstanding premiums', 'Operating expenses', 'Net operating result', 'Claims paid', 'Claims outstanding', 'Collection rate'].map((label) =>
      unavailableCard(label, 'Withheld until platform.integration.health authorizes this read.', period)
    )
  }
  if (load === 'loading' || load === 'idle') {
    return ['Premiums invoiced', 'Premiums collected', 'Outstanding premiums'].map((label) => ({
      label, value: 'Loading', detail: '', tone: 'loading', period
    }))
  }
  if (load !== 'ok' || !command || !command.totals) {
    return ['Premiums invoiced', 'Premiums collected', 'Outstanding premiums', 'Operating expenses', 'Net operating result', 'Claims paid', 'Collection rate'].map((label) =>
      unavailableCard(label, 'The finance command failed. Totals were not assumed.', period)
    )
  }
  const totals = command.totals
  const unavailable = command.unavailable || {}
  const rate = formatRate(totals.collectionRateBps)
  return [
    moneyCard('Premiums invoiced', totals.billedMinor, 'Issued and paid invoice amount_due_minor, excluding drafts and voids. NGN kobo.', period),
    moneyCard('Premiums collected', totals.collectedMinor, 'hw_payments rows with status successful. Refunded and reversed payments are excluded.', period),
    moneyCard('Reconciled collections', totals.reconciledMinor, 'Successful payments that also have reconciled_at. Unreconciled receipts are not included.', period),
    moneyCard('Outstanding premiums', totals.outstandingMinor, 'amount_due_minor minus amount_paid_minor on issued and partially paid invoices.', period),
    unavailableCard('Operating expenses', unavailable.operatingExpenses, period),
    unavailableCard('Net operating result', unavailable.netOperatingProfit, period),
    unavailableCard('Claims paid', unavailable.claimsPaid, period),
    unavailableCard('Claims outstanding', unavailable.claimsOutstanding, period),
    rate
      ? { label: 'Collection rate', value: rate, detail: 'Successful collections divided by invoiced premium. A zero invoiced total is not a rate.', tone: 'ok', period }
      : unavailableCard('Collection rate', 'No positive invoiced premium is available for a rate. This is not 0%.', period)
  ]
}

export function premiumChartSeries(command) {
  const points = command && command.series && Array.isArray(command.series.points) ? command.series.points : []
  const usable = points.filter((point) => Number.isInteger(point?.invoicedMinor) && Number.isInteger(point?.collectedMinor))
  return {
    categories: usable.map((point) => point.month),
    invoiced: usable.map((point) => point.invoicedMinor / 100),
    collected: usable.map((point) => point.collectedMinor / 100),
    undatedInvoices: command?.series?.undatedInvoices || 0,
    undatedPayments: command?.series?.undatedPayments || 0
  }
}

export function enrolmentChartSeries(overview) {
  const breakdown = overview && overview.enrolmentStatusBreakdown
  if (!breakdown || typeof breakdown !== 'object') return null
  const entries = Object.entries(breakdown).filter(([, value]) => typeof value === 'number' && Number.isInteger(value) && value >= 0)
  if (!entries.length) return null
  return {
    categories: entries.map(([status]) => status),
    counts: entries.map(([, value]) => value)
  }
}

export function periodRange(preset, today, customFrom, customTo) {
  const end = today
  const shift = (days) => {
    const date = new Date(`${today}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() - days)
    return date.toISOString().slice(0, 10)
  }
  if (preset === '7d') return { from: shift(6), to: end }
  if (preset === '30d') return { from: shift(29), to: end }
  if (preset === '90d') return { from: shift(89), to: end }
  if (preset === 'ytd') return { from: `${today.slice(0, 4)}-01-01`, to: end }
  if (preset === 'custom') return { from: customFrom || null, to: customTo || null }
  return { from: null, to: null }
}

/**
 * Overview presentation for /hmo/overview.
 * Counts stay null when a query failed. Zero is used only after a successful empty read.
 * Grant status lists unexpired grants only, so a missing permission is not labelled as expired.
 */

export const INTEGRATION_GRANT = 'platform.integration.health'
export const REGISTRY_GRANT = 'platform.providers.manage'
export const PLANS_GRANT = 'platform.plans.manage'
export const TENANT_ACCESS_GRANT = 'platform.tenant_access'
export const DESIGNATED_PLATFORM_ADMIN_USER_ID = 'b8a6b187-9ff2-47dc-bd96-cb846cbd4a7e'

export function grantOperatorLabel(row) {
  const id = String((row && row.id) || '')
  const shortId = id.length > 12 ? `${id.slice(0, 12)}...` : id
  const role = String((row && row.role) || 'administrator')
  const email = String((row && row.email) || shortId)
  return `${email} — ${role} — ${shortId}`
}

export const OVERVIEW_ACTIONS = [
  {
    id: 'registry',
    label: 'HMO Registry',
    to: '/hmo/registry',
    grant: REGISTRY_GRANT,
    detail: 'hw_providers'
  },
  {
    id: 'providers',
    label: 'Provider Network',
    to: '/hmo/providers',
    grant: INTEGRATION_GRANT,
    detail: 'hw_facilities'
  },
  {
    id: 'plans',
    label: 'Health Plans',
    to: '/hmo/plans',
    grant: PLANS_GRANT,
    detail: 'hw_plans'
  },
  {
    id: 'governance',
    label: 'Platform Governance',
    to: '/admin/health-insurance',
    grant: null,
    detail: 'Grants and audit reasons'
  }
]

const DURABLE_STATUSES = ['active', 'suspended', 'revoked']

function emptyGrantRead(malformed) {
  return { ok: !malformed, malformed, grants: [], inactiveGrants: [], durableEntitlements: [] }
}

export function readActiveGrants(grant) {
  if (!grant || typeof grant !== 'object' || Array.isArray(grant)) {
    return emptyGrantRead(true)
  }
  if (!Array.isArray(grant.activeGrants)) {
    return emptyGrantRead(true)
  }
  if (grant.inactiveGrants !== undefined && !Array.isArray(grant.inactiveGrants)) {
    return emptyGrantRead(true)
  }
  if (grant.durableEntitlements !== undefined && !Array.isArray(grant.durableEntitlements)) {
    return emptyGrantRead(true)
  }
  const inactiveGrants = Array.isArray(grant.inactiveGrants) ? grant.inactiveGrants : []
  if (inactiveGrants.some((row) => !row || (row.status !== 'expired' && row.status !== 'revoked') || !row.permission)) {
    return emptyGrantRead(true)
  }
  const durableEntitlements = Array.isArray(grant.durableEntitlements) ? grant.durableEntitlements : []
  if (durableEntitlements.some((row) => !row || !row.permission || !DURABLE_STATUSES.includes(row.status))) {
    return emptyGrantRead(true)
  }
  const flagged = Boolean(grant.hasActiveGrant || grant.hasActiveGrants)
  if (flagged !== (grant.activeGrants.length > 0)) {
    return emptyGrantRead(true)
  }
  return { ok: true, malformed: false, grants: grant.activeGrants, inactiveGrants, durableEntitlements }
}

export function hasGrant(grants, permission) {
  return (grants || []).some((grant) => grant && grant.permission === permission)
}

export function hasActiveDurable(durableEntitlements, permission) {
  return (durableEntitlements || []).some((row) => row && row.permission === permission && row.status === 'active')
}

function durableBlockMessage(durableEntitlements, permission) {
  const row = (durableEntitlements || []).find((item) => item && item.permission === permission)
  if (!row || row.status === 'active') return ''
  if (row.status === 'suspended') {
    return `The ${permission} durable entitlement is suspended. It does not authorize access.`
  }
  if (row.status === 'revoked') {
    return `The ${permission} durable entitlement was revoked. It does not authorize access.`
  }
  return ''
}

export function grantRecordState(permission, activeGrants, inactiveGrants) {
  if (hasGrant(activeGrants, permission)) return 'active'
  const inactive = (inactiveGrants || []).find((row) => row && row.permission === permission)
  if (inactive && inactive.status === 'expired') return 'expired'
  if (inactive && inactive.status === 'revoked') return 'revoked'
  return 'missing'
}

export function grantGapMessage(grants, permission, inactiveGrants) {
  const state = grantRecordState(permission, grants, inactiveGrants)
  if (state === 'active') return ''
  if (state === 'expired') {
    return `The ${permission} grant for this operator has expired. It does not authorize access. An independent administrator with platform.tenant_access must issue a new grant.`
  }
  if (state === 'revoked') {
    return `The ${permission} grant for this operator was revoked. It does not authorize access. An independent administrator with platform.tenant_access must issue a new grant.`
  }
  const active = (grants || []).map((grant) => grant && grant.permission).filter(Boolean)
  const known = active.length ? ` Other unexpired grants: ${active.join(', ')}.` : ''
  return `No ${permission} grant record exists for this operator. The status query succeeded.${known} An independent administrator with platform.tenant_access must issue it.`
}

export function platformReadDecision(grants, permission, reason, inactiveGrants, durableEntitlements) {
  const entitled = hasActiveDurable(durableEntitlements, permission)
  if (!hasGrant(grants, permission) && !entitled) {
    return {
      proceed: false,
      state: 'access_denied',
      message: durableBlockMessage(durableEntitlements, permission) || grantGapMessage(grants, permission, inactiveGrants)
    }
  }
  const text = String(reason || '').trim()
  if (text.length < 5) {
    return {
      proceed: false,
      state: 'reason_required',
      message: `Reading data protected by ${permission} requires an operational audit reason of at least 5 characters. Set that reason on Platform Governance. This page does not create or renew a grant.`
    }
  }
  return { proceed: true, state: 'ok', message: '' }
}

export function platformHttpDenial(status, body) {
  const error = body && body.error && typeof body.error === 'object' ? body.error : {}
  const code = String(error.code || (body && body.code) || '')
  const message = String(error.message || (body && body.message) || '')
  if (code === 'PLATFORM_REASON_REQUIRED') {
    return { state: 'reason_required', message: message || 'An operational audit reason is required.' }
  }
  if (code === 'PLATFORM_GRANT_LOOKUP_FAILED') {
    return { state: 'unavailable', message: message || 'Platform grant lookup failed. Totals were not assumed.' }
  }
  if (status === 401 || status === 403 || status === 400) {
    return { state: 'access_denied', message: message || 'Access denied.' }
  }
  return { state: 'unavailable', message: message || 'The request failed. This is not a zero total.' }
}

export function quickActions(grants, inactiveGrants, durableEntitlements) {
  return OVERVIEW_ACTIONS.map((action) => {
    const allowed = !action.grant || hasGrant(grants, action.grant) || hasActiveDurable(durableEntitlements, action.grant)
    const decision = action.grant
      ? platformReadDecision(grants, action.grant, 'audit', inactiveGrants, durableEntitlements)
      : { message: '' }
    return {
      ...action,
      allowed,
      reason: allowed ? '' : decision.message
    }
  })
}

function withheld(label, permission) {
  return { label, value: 'Withheld', detail: permission, tone: 'withheld' }
}

function reasonRequired(label) {
  return {
    label,
    value: 'Reason required',
    detail: 'Set an operational audit reason on Platform Governance before this total is read.',
    tone: 'withheld'
  }
}

function unavailable(label, detail) {
  return { label, value: 'Unavailable', detail: detail || 'The request failed. This is not a zero total.', tone: 'error' }
}

function loading(label) {
  return { label, value: 'Loading', detail: '', tone: 'loading' }
}

function countValue(label, value, detail, source) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return unavailable(label, 'The count was missing. It is not shown as zero.')
  }
  return {
    label,
    value: String(value),
    detail: detail || (value === 0 ? 'The request succeeded and returned no rows.' : source),
    tone: value === 0 ? 'empty' : 'ok'
  }
}

export function enrolmentTotal(overview) {
  if (!overview || typeof overview !== 'object') return null
  const parts = [
    overview.activeEnrolments,
    overview.pendingVerification,
    overview.awaitingPayment,
    overview.awaitingInsurerActivation
  ]
  if (parts.some((value) => typeof value !== 'number' || !Number.isInteger(value) || value < 0)) return null
  return parts.reduce((sum, value) => sum + value, 0)
}

function koboLabel(kobo) {
  if (typeof kobo !== 'number' || !Number.isInteger(kobo)) return null
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function sumBuckets(buckets, statuses) {
  const chosen = (buckets || []).filter((bucket) => !statuses || statuses.includes(bucket.status))
  if (chosen.some((bucket) => bucket.amountMinor === null || bucket.amountMinor === undefined)) return null
  return chosen.reduce((sum, bucket) => sum + Number(bucket.amountMinor || 0), 0)
}

export function reconciliationMetric(finance, financeLoad) {
  const label = 'Premium reconciliation'
  if (financeLoad === 'withheld') return withheld(label, INTEGRATION_GRANT)
  if (financeLoad === 'loading' || financeLoad === 'idle') return loading(label)
  if (financeLoad === 'malformed') {
    return { label, value: 'Malformed', detail: 'Finance response did not include invoice and payment lists.', tone: 'error' }
  }
  if (financeLoad !== 'ok') return unavailable(label, 'The finance summary failed.')
  if (!finance || !Array.isArray(finance.invoices) || !Array.isArray(finance.payments)) {
    return { label, value: 'Malformed', detail: 'Finance response did not include invoice and payment lists.', tone: 'error' }
  }
  if (finance.invoices.length === 0 && finance.payments.length === 0) {
    return { label, value: '₦0.00', detail: 'No invoice or payment rows were returned.', tone: 'empty' }
  }
  const billed = sumBuckets(
    finance.invoices.filter((bucket) => bucket.status !== 'draft' && bucket.status !== 'void'),
    null
  )
  const collected = sumBuckets(
    finance.payments.filter((bucket) => bucket.status === 'successful'),
    null
  )
  const billedText = koboLabel(billed)
  const collectedText = koboLabel(collected)
  if (!billedText || !collectedText) {
    return unavailable(label, 'A persisted amount was missing. It is not shown as zero.')
  }
  return {
    label,
    value: collectedText,
    detail: `Collected from successful payments. Billed ${billedText}.`,
    tone: 'ok'
  }
}

export function buildOverviewKpis({
  integrationState,
  overview,
  overviewLoad,
  facilities,
  facilityState,
  plans,
  catalogueState,
  finance,
  financeLoad
}) {
  const granted = integrationState === 'loaded'
  const waiting = integrationState === 'loading' || integrationState === 'idle'
  const reasonBlocked = integrationState === 'reason_required'
  const hmos = reasonBlocked
    ? reasonRequired('Participating HMOs')
    : !granted
    ? (waiting ? loading('Participating HMOs') : withheld('Participating HMOs', INTEGRATION_GRANT))
    : (overviewLoad === 'ok'
      ? countValue('Participating HMOs', overview && overview.configuredProviders, 'GET /platform/overview', 'hw_providers')
      : overviewLoad === 'malformed'
        ? { label: 'Participating HMOs', value: 'Malformed', detail: 'Overview response was not an object.', tone: 'error' }
        : overviewLoad === 'withheld'
          ? withheld('Participating HMOs', INTEGRATION_GRANT)
          : overviewLoad === 'error'
            ? unavailable('Participating HMOs')
            : loading('Participating HMOs'))

  const facilityMetric = reasonBlocked
    ? reasonRequired('Provider facilities')
    : !granted
    ? (waiting ? loading('Provider facilities') : withheld('Provider facilities', INTEGRATION_GRANT))
    : (facilityState === 'reason_required'
      ? reasonRequired('Provider facilities')
      : facilityState === 'ok'
      ? countValue('Provider facilities', Array.isArray(facilities) ? facilities.length : null, 'GET /platform/facilities', 'hw_facilities')
      : facilityState === 'malformed'
        ? { label: 'Provider facilities', value: 'Malformed', detail: 'Facilities response had no list.', tone: 'error' }
        : facilityState === 'access_denied'
          ? withheld('Provider facilities', INTEGRATION_GRANT)
          : facilityState === 'unavailable'
            ? unavailable('Provider facilities')
            : loading('Provider facilities'))

  const planMetric = catalogueState === 'reason_required'
    ? reasonRequired('Health plans')
    : catalogueState === 'ok'
    ? countValue('Health plans', Array.isArray(plans) ? plans.length : null, 'GET /platform/plans', 'hw_plans')
    : catalogueState === 'malformed'
      ? { label: 'Health plans', value: 'Malformed', detail: 'Plan catalogue response had no plan list.', tone: 'error' }
      : catalogueState === 'access_denied'
        ? withheld('Health plans', PLANS_GRANT)
        : catalogueState === 'unavailable'
          ? unavailable('Health plans')
          : loading('Health plans')

  let enrolments
  if (reasonBlocked) enrolments = reasonRequired('Enrolments')
  else if (!granted) enrolments = waiting ? loading('Enrolments') : withheld('Enrolments', INTEGRATION_GRANT)
  else if (overviewLoad === 'withheld') enrolments = withheld('Enrolments', INTEGRATION_GRANT)
  else if (overviewLoad === 'ok') {
    const total = enrolmentTotal(overview)
    enrolments = countValue(
      'Enrolments',
      total,
      total === null ? '' : `Active ${overview.activeEnrolments} · verification ${overview.pendingVerification} · payment ${overview.awaitingPayment} · insurer ${overview.awaitingInsurerActivation}`,
      'hw_enrolments'
    )
  } else if (overviewLoad === 'malformed') {
    enrolments = { label: 'Enrolments', value: 'Malformed', detail: 'Overview response was not an object.', tone: 'error' }
  } else if (overviewLoad === 'error') enrolments = unavailable('Enrolments')
  else enrolments = loading('Enrolments')

  return [
    hmos,
    facilityMetric,
    planMetric,
    enrolments,
    reasonBlocked
      ? reasonRequired('Premium reconciliation')
      : reconciliationMetric(finance, granted ? financeLoad : (waiting ? 'loading' : 'withheld'))
  ]
}

export function integrationStatusSummary(providers, outcome) {
  if (outcome === 'access_denied') {
    return { tone: 'withheld', lines: [`Withheld until ${INTEGRATION_GRANT} is unexpired.`] }
  }
  if (outcome === 'reason_required') {
    return { tone: 'withheld', lines: ['An operational audit reason is required before integration status is read. Counts are not shown as zero.'] }
  }
  if (outcome === 'loading') return { tone: 'loading', lines: ['Checking provider integration status.'] }
  if (outcome === 'malformed') return { tone: 'error', lines: ['Telemetry response did not contain a provider list.'] }
  if (outcome === 'unavailable') return { tone: 'error', lines: ['Telemetry request failed. Status counts are not shown as zero.'] }
  if (outcome === 'empty' || (outcome === 'ok' && (!providers || providers.length === 0))) {
    return { tone: 'empty', lines: ['No hw_providers rows were returned.'] }
  }
  const counts = {}
  for (const provider of providers || []) {
    const status = provider.integrationStatus || provider.integration_status || 'none'
    counts[status] = (counts[status] || 0) + 1
  }
  const lines = Object.keys(counts).sort().map((status) => `${status}: ${counts[status]}`)
  return { tone: 'ok', lines }
}

import fs from 'fs'
import path from 'path'
import { HMO_NAV_ITEMS, isAdministrationChild } from '../src/hmo/hmoWorkspace'
import { classifyTelemetryOutcome, normalizeProviderHealthPayload } from '../src/hmo/telemetryState'
import {
  buildOverviewKpis,
  enrolmentTotal,
  grantGapMessage,
  grantRecordState,
  integrationStatusSummary,
  platformHttpDenial,
  platformReadDecision,
  quickActions,
  readActiveGrants,
  grantOperatorLabel
} from '../src/hmo/overviewState'
import { isPlatformShellPath } from '../src/utils/platformShellPaths'
import { permissionsForOperatorRole } from '../src/utils/operatorPermissions'

describe('HMO workspace navigation', () => {
  test('HMO routes are top-level and not nested under Administration', () => {
    expect(HMO_NAV_ITEMS.map((item) => item.path)).toEqual(expect.arrayContaining(['/hmo/overview', '/hmo/plans']))
    HMO_NAV_ITEMS.forEach((item) => {
      expect(item.path.startsWith('/hmo/')).toBe(true)
      expect(isAdministrationChild(item.path)).toBe(false)
    })
  })

  test('every sidebar path is a direct route', () => {
    const routes = fs.readFileSync(path.join(__dirname, '../src/router/routes.js'), 'utf8')
    HMO_NAV_ITEMS.forEach((item) => {
      expect(routes).toContain(`path: '${item.path.replace(/^\//, '')}'`)
    })
  })

  test('the HMO registry client reads the provider route, not the plan catalogue', () => {
    const api = fs.readFileSync(path.join(__dirname, '../src/api/healthInsuranceApi.js'), 'utf8')
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/hmo/HmoWorkspacePage.vue'), 'utf8')
    expect(api).toContain("api.get('/api/v1/health-insurance/platform/providers'")
    expect(page).toContain('getPlatformRegistry')
    expect(page).toContain('platform.providers.manage')
  })

  test('the HMO shell is platform-only and limited to super admin and deploy roles', () => {
    expect(isPlatformShellPath('/hmo/plans')).toBe(true)
    expect(isPlatformShellPath('/tenant/health-insurance')).toBe(false)
    expect(permissionsForOperatorRole('SUPER_ADMIN')).toContain('hmo.workspace')
    expect(permissionsForOperatorRole('ADMIN_DEPLOY')).toContain('hmo.workspace')
    expect(permissionsForOperatorRole('ADMIN_OPS')).not.toContain('hmo.workspace')
    expect(permissionsForOperatorRole('tenant_admin')).not.toContain('hmo.workspace')
  })
})

describe('HMO telemetry classification', () => {
  test('distinguishes an empty registry from denial, failure, and a malformed body', () => {
    expect(classifyTelemetryOutcome({ grantActive: false, rejected: false, httpStatus: 200, payload: { providers: [] } })).toBe('access_denied')
    expect(classifyTelemetryOutcome({ grantActive: true, rejected: true, httpStatus: 403, payload: null })).toBe('access_denied')
    expect(classifyTelemetryOutcome({ grantActive: true, rejected: true, httpStatus: 500, payload: null })).toBe('unavailable')
    expect(classifyTelemetryOutcome({ grantActive: true, rejected: false, httpStatus: 200, payload: { unexpected: true } })).toBe('malformed')
    expect(classifyTelemetryOutcome({ grantActive: true, rejected: false, httpStatus: 200, payload: { providers: [] } })).toBe('empty')
  })

  test('reads the providers list and does not invent capabilities', () => {
    const normalized = normalizeProviderHealthPayload({
      providers: [{
        id: 'p1',
        code: 'acme',
        displayName: 'Acme HMO',
        integrationStatus: 'none',
        capabilities: { enrolmentSubmit: true, claims: false }
      }]
    })
    expect(normalized.malformed).toBe(false)
    expect(normalized.providers[0].name).toBe('Acme HMO')
    expect(normalized.providers[0].isActive).toBe(false)
    expect(normalized.providers[0].capabilities).toEqual(['enrolmentSubmit'])
    expect(classifyTelemetryOutcome({
      grantActive: true,
      rejected: false,
      httpStatus: 200,
      payload: { providers: normalized.providers }
    })).toBe('ok')
  })
})

describe('HMO overview metrics', () => {
  const integrationGrants = [{ permission: 'platform.integration.health', expires_at: '2099-01-01T00:00:00Z' }]

  test('withholds cross-tenant totals when the integration grant is absent and does not call that absence an expiry', () => {
    const parsed = readActiveGrants({ hasActiveGrants: true, activeGrants: [{ permission: 'platform.plans.manage' }] })
    expect(parsed.ok).toBe(true)
    const message = grantGapMessage(parsed.grants, 'platform.integration.health', [])
    expect(message).toContain('platform.integration.health')
    expect(message).toContain('platform.plans.manage')
    expect(message).toContain('No platform.integration.health grant record exists')
    expect(message).toContain('status query succeeded')
    const kpis = buildOverviewKpis({
      integrationState: 'access_denied',
      overview: null,
      overviewLoad: 'withheld',
      facilities: [],
      facilityState: 'access_denied',
      plans: [],
      catalogueState: 'access_denied',
      finance: null,
      financeLoad: 'withheld'
    })
    expect(kpis.map((item) => item.value)).toEqual(['Withheld', 'Withheld', 'Withheld', 'Withheld', 'Withheld'])
    expect(kpis.some((item) => item.value === '0')).toBe(false)
  })

  test('shows a successful empty plan count and keeps a failed enrolment count unavailable', () => {
    expect(enrolmentTotal({
      activeEnrolments: null,
      pendingVerification: 0,
      awaitingPayment: 0,
      awaitingInsurerActivation: 0
    })).toBeNull()
    const kpis = buildOverviewKpis({
      integrationState: 'loaded',
      overview: {
        configuredProviders: 0,
        activeEnrolments: null,
        pendingVerification: 0,
        awaitingPayment: 0,
        awaitingInsurerActivation: 0
      },
      overviewLoad: 'ok',
      facilities: [],
      facilityState: 'ok',
      plans: [],
      catalogueState: 'ok',
      finance: { invoices: [], payments: [] },
      financeLoad: 'ok'
    })
    expect(kpis.find((item) => item.label === 'Participating HMOs').value).toBe('0')
    expect(kpis.find((item) => item.label === 'Health plans').value).toBe('0')
    expect(kpis.find((item) => item.label === 'Enrolments').value).toBe('Unavailable')
    expect(kpis.find((item) => item.label === 'Premium reconciliation').detail).toContain('No invoice or payment rows')
  })

  test('does not turn a failed finance amount or a malformed facility list into zero', () => {
    const failedMoney = buildOverviewKpis({
      integrationState: 'loaded',
      overview: { configuredProviders: 2, activeEnrolments: 1, pendingVerification: 0, awaitingPayment: 0, awaitingInsurerActivation: 0 },
      overviewLoad: 'ok',
      facilities: null,
      facilityState: 'malformed',
      plans: [{ id: 'p' }],
      catalogueState: 'ok',
      finance: { invoices: [{ status: 'issued', count: 1, amountMinor: null }], payments: [] },
      financeLoad: 'ok'
    })
    expect(failedMoney.find((item) => item.label === 'Provider facilities').value).toBe('Malformed')
    expect(failedMoney.find((item) => item.label === 'Premium reconciliation').value).toBe('Unavailable')
    expect(integrationStatusSummary(null, 'unavailable').lines[0]).toContain('not shown as zero')
  })

  test('enables only the quick actions whose grants are active, and always links governance', () => {
    const actions = quickActions(integrationGrants)
    expect(actions.find((item) => item.id === 'registry').allowed).toBe(false)
    expect(actions.find((item) => item.id === 'registry').to).toBe('/hmo/registry')
    expect(actions.find((item) => item.id === 'providers').allowed).toBe(true)
    expect(actions.find((item) => item.id === 'plans').allowed).toBe(false)
    expect(actions.find((item) => item.id === 'governance')).toMatchObject({
      allowed: true,
      to: '/admin/health-insurance'
    })
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/hmo/HmoWorkspacePage.vue'), 'utf8')
    expect(page).toContain('Open Platform Governance')
    expect(page).toContain('Role access guide')
    expect(page).toContain('guardPlatformRead')
    expect(page).not.toContain('Who works where')
    const governance = fs.readFileSync(path.join(__dirname, '../src/pages/admin/HealthInsuranceGovernancePage.vue'), 'utf8')
    expect(governance).toContain('listGrantOperators')
    expect(governance).toContain('issuePlatformEntitlement')
    expect(governance).toContain('Search by email, role, or id')
    expect(governance).toContain('use-input')
    expect(governance).toContain('filterGrantOperators')
    expect(grantOperatorLabel({
      id: 'b8a6b187-9ff2-47dc-bd96-cb846cbd4a7e',
      email: 'support@iips.app',
      role: 'super_admin'
    })).toBe('support@iips.app — super_admin — b8a6b187-9ff...')
    expect(governance).not.toContain('e.g. 00000000-0000-0000-0000-000000000000')
  })

  test('a missing platform grant is withheld before a protected read, and a present grant still needs an audit reason', () => {
    const missing = platformReadDecision([], 'platform.providers.manage', 'Registry review')
    expect(missing.proceed).toBe(false)
    expect(missing.state).toBe('access_denied')
    expect(missing.message).toContain('platform.providers.manage')
    const reasonMissing = platformReadDecision(
      [{ permission: 'platform.plans.manage' }],
      'platform.plans.manage',
      ''
    )
    expect(reasonMissing.proceed).toBe(false)
    expect(reasonMissing.state).toBe('reason_required')
    expect(reasonMissing.message).toContain('does not create or renew a grant')
    const allowed = platformReadDecision(
      [{ permission: 'platform.integration.health' }],
      'platform.integration.health',
      'Review provider telemetry'
    )
    expect(allowed).toEqual({ proceed: true, state: 'ok', message: '' })
    expect(platformHttpDenial(403, {
      error: { code: 'PLATFORM_PERMISSION_DENIED', message: 'Explicit unexpired platform grant required' }
    }).state).toBe('access_denied')
    const blocked = buildOverviewKpis({
      integrationState: 'reason_required',
      overview: null,
      overviewLoad: 'idle',
      facilities: [],
      facilityState: 'idle',
      plans: [],
      catalogueState: 'reason_required',
      finance: null,
      financeLoad: 'idle'
    })
    expect(blocked.map((item) => item.value)).not.toContain('0')
    expect(blocked.every((item) => item.value === 'Reason required')).toBe(true)
  })

  test('classifies an expired or revoked grant without treating it as access', () => {
    const inactive = [
      { permission: 'platform.providers.manage', status: 'expired', expiresAt: '2020-01-01T00:00:00Z' },
      { permission: 'platform.plans.manage', status: 'revoked', expiresAt: '2020-01-01T00:00:00Z' }
    ]
    const parsed = readActiveGrants({
      hasActiveGrants: false,
      activeGrants: [],
      inactiveGrants: inactive
    })
    expect(parsed.ok).toBe(true)
    expect(grantRecordState('platform.providers.manage', parsed.grants, parsed.inactiveGrants)).toBe('expired')
    expect(grantRecordState('platform.plans.manage', parsed.grants, parsed.inactiveGrants)).toBe('revoked')
    expect(grantRecordState('platform.integration.health', parsed.grants, parsed.inactiveGrants)).toBe('missing')
    const expired = platformReadDecision(parsed.grants, 'platform.providers.manage', 'Registry review', parsed.inactiveGrants)
    expect(expired.proceed).toBe(false)
    expect(expired.message).toContain('has expired')
    expect(expired.message).toContain('does not authorize access')
    const revoked = platformReadDecision(parsed.grants, 'platform.plans.manage', 'Plan review', parsed.inactiveGrants)
    expect(revoked.proceed).toBe(false)
    expect(revoked.message).toContain('was revoked')
    const active = platformReadDecision(
      [{ permission: 'platform.providers.manage' }],
      'platform.providers.manage',
      'Registry review',
      inactive
    )
    expect(active.proceed).toBe(true)
  })

  test('an active durable entitlement authorizes only that permission and a suspended one does not', () => {
    const durable = [
      { permission: 'platform.providers.manage', status: 'active' },
      { permission: 'platform.plans.manage', status: 'suspended' },
      { permission: 'platform.integration.health', status: 'revoked' }
    ]
    const parsed = readActiveGrants({
      hasActiveGrants: false,
      activeGrants: [],
      durableEntitlements: durable
    })
    expect(parsed.ok).toBe(true)
    const allowed = platformReadDecision([], 'platform.providers.manage', 'Registry review', [], parsed.durableEntitlements)
    expect(allowed.proceed).toBe(true)
    const suspended = platformReadDecision([], 'platform.plans.manage', 'Plan review', [], parsed.durableEntitlements)
    expect(suspended.proceed).toBe(false)
    expect(suspended.message).toContain('suspended')
    expect(suspended.message).toContain('does not authorize access')
    const revoked = platformReadDecision([], 'platform.integration.health', 'Telemetry review', [], parsed.durableEntitlements)
    expect(revoked.proceed).toBe(false)
    expect(revoked.message).toContain('revoked')
    const missing = platformReadDecision([], 'platform.tenant_access', 'Grant review', [], parsed.durableEntitlements)
    expect(missing.proceed).toBe(false)
    const actions = quickActions([], [], parsed.durableEntitlements)
    expect(actions.find((item) => item.id === 'registry').allowed).toBe(true)
    expect(actions.find((item) => item.id === 'plans').allowed).toBe(false)
    expect(actions.find((item) => item.id === 'providers').allowed).toBe(false)
    const malformed = readActiveGrants({
      hasActiveGrants: false,
      activeGrants: [],
      durableEntitlements: [{ permission: 'platform.providers.manage', status: 'payout.execute' }]
    })
    expect(malformed.ok).toBe(false)
  })
})

describe('HMO finance command presentation', () => {
  test('keeps unsupported profit, expenses, and claim payments unavailable', () => {
    const { commandCards, premiumChartSeries, periodRange } = require('../src/hmo/commandCenter')
    const withheld = commandCards(null, 'withheld', '7 days')
    expect(withheld.every((card) => card.value === 'Unavailable')).toBe(true)
    expect(withheld[0].detail).toContain('platform.integration.health')

    const failed = commandCards(null, 'unavailable', '30 days')
    expect(failed.find((card) => card.label === 'Premiums invoiced').value).toBe('Unavailable')

    const cards = commandCards({
      totals: {
        billedMinor: 0,
        collectedMinor: 0,
        reconciledMinor: 0,
        outstandingMinor: 0,
        collectionRateBps: null
      },
      unavailable: {
        operatingExpenses: 'No HMO operating-expense source is defined. This is not zero.',
        netOperatingProfit: 'Premium collections are not profit.',
        claimsPaid: 'A settled or approved claim is not a paid claim.',
        claimsOutstanding: 'Authorised claim amounts are not unpaid disbursements.'
      },
      series: { points: [], undatedInvoices: 0, undatedPayments: 0 }
    }, 'ok', 'All persisted rows')
    expect(cards.find((card) => card.label === 'Premiums invoiced').value).toContain('0.00')
    expect(cards.find((card) => card.label === 'Collection rate').value).toBe('Unavailable')
    expect(cards.find((card) => card.label === 'Collection rate').detail).toContain('not 0%')
    expect(cards.find((card) => card.label === 'Operating expenses').value).toBe('Unavailable')
    expect(cards.find((card) => card.label === 'Net operating result').value).toBe('Unavailable')
    expect(cards.find((card) => card.label === 'Claims paid').value).toBe('Unavailable')

    const paid = commandCards({
      totals: { billedMinor: 100000, collectedMinor: 25000, reconciledMinor: 0, outstandingMinor: 75000, collectionRateBps: 2500 },
      series: { points: [{ month: '2026-03', invoicedMinor: 100000, collectedMinor: 25000 }] }
    }, 'ok', '2026-03-01 to 2026-03-31')
    expect(paid.find((card) => card.label === 'Premiums collected').value).toBe('₦250.00')
    expect(paid.find((card) => card.label === 'Collection rate').value).toBe('25.00%')
    const chart = premiumChartSeries({
      series: { points: [{ month: '2026-03', invoicedMinor: 100000, collectedMinor: 25000 }], undatedInvoices: 2, undatedPayments: 0 }
    })
    expect(chart.invoiced).toEqual([1000])
    expect(chart.undatedInvoices).toBe(2)
    expect(periodRange('ytd', '2026-10-26', '', '')).toEqual({ from: '2026-01-01', to: '2026-10-26' })
    expect(periodRange('7d', '2026-10-26', '', '')).toEqual({ from: '2026-10-20', to: '2026-10-26' })
    expect(periodRange('all', '2026-10-26', '', '')).toEqual({ from: null, to: null })
  })

  test('the overview reads the finance command and does not invent profit', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/hmo/HmoWorkspacePage.vue'), 'utf8')
    const api = fs.readFileSync(path.join(__dirname, '../src/api/healthInsuranceApi.js'), 'utf8')
    expect(api).toContain('/api/v1/health-insurance/platform/finance-command')
    expect(page).toContain('getPlatformFinanceCommand')
    expect(page).toContain('Premium cash is not profit.')
    expect(page).not.toContain('₦25,084')
    expect(page).toContain('commandCards')
    expect(page).toContain('apexchart')
  })
})

describe('benefit and coverage drafts', () => {
  test('turns saved kobo benefits into editable rows and rejects a limit without a name', () => {
    const { benefitsFromVersion, benefitsPayload } = require('../src/hmo/benefitDraft')
    expect(benefitsFromVersion([
      { category: 'Outpatient', limitMinor: 10000000, copayBps: 250 }
    ])).toEqual([
      { category: 'Outpatient', limitNaira: '100000.00', copayPercent: '2.50' }
    ])
    expect(benefitsPayload([
      { category: 'Inpatient', limitNaira: '50000.50', copayPercent: '0' },
      { category: '', limitNaira: '', copayPercent: '0' }
    ]).benefits).toEqual([
      { category: 'Inpatient', limitNaira: '50000.50', copayBps: 0 }
    ])
    expect(benefitsPayload([{ category: '', limitNaira: '10', copayPercent: '0' }]).error).toContain('Benefit 1')
    expect(benefitsPayload([{ category: 'Dental', limitNaira: '10', copayPercent: '101' }]).error).toContain('100')
  })

  test('coverage can add benefits onto a draft and does not publish from this page', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/hmo/HmoWorkspacePage.vue'), 'utf8')
    const rows = fs.readFileSync(path.join(__dirname, '../src/hmo/BenefitRows.vue'), 'utf8')
    expect(rows).toContain('Add benefit')
    expect(page).toContain('Save benefits')
    expect(page).toContain('updatePlatformPlanDraft')
    expect(page).toContain('Saving does not publish the plan or enrol members.')
    expect(page).not.toContain('benefitCategory')
  })

  test('enrolment can search, filter, activate, and suspend without enrolling a member', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/hmo/HmoWorkspacePage.vue'), 'utf8')
    const api = fs.readFileSync(path.join(__dirname, '../src/api/healthInsuranceApi.js'), 'utf8')
    expect(page).toContain('Search tenant')
    expect(page).toContain('label="Activate"')
    expect(page).toContain('label="Suspend"')
    expect(page).toContain('platform.tenants.onboard')
    expect(page).toContain('does not enrol members')
    expect(api).toContain('/participation')
  })

  test('premiums and billing lists recorded invoices and does not collect payment', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/hmo/HmoWorkspacePage.vue'), 'utf8')
    expect(page).toContain('This page does not create an invoice, collect a payment, or start a payout.')
    expect(page).toContain("if (id === 'billing') loadFinanceCommand()")
  })

  test('HMO tabs follow the app theme instead of a forced dark page', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/hmo/HmoWorkspacePage.vue'), 'utf8')
    expect(page).toContain('class="q-pa-lg hmo-workspace"')
    expect(page).not.toContain('#05070d')
    expect(page).toContain(':dark="isDark"')
    expect(page).toContain('var(--enterprise-panel-bg)')
  })
})

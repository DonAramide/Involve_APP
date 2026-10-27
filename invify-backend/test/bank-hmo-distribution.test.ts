import {
  catalogueCategories,
  filterCatalogue,
  offeringViews,
  shapePublishedCatalogue,
} from '../src/modules/health-insurance/services/bank-hmo-catalogue'
import { decideOfferingChange, tenantSelectionDecision } from '../src/modules/health-insurance/services/bank-hmo-offering-rules'
import fs from 'fs'
import path from 'path'

const published = {
  id: 'plan-1',
  code: 'GOLD',
  name: 'Gold Cover',
  status: 'active',
  hw_providers: { id: 'hmo-1', code: 'acme', display_name: 'Acme HMO', licence_reference: 'NHIA-1', integration_status: 'verified' },
  hw_plan_versions: [
    { id: 'draft-1', version: 2, status: 'draft', premium_minor: 100, currency: 'NGN', billing_frequency: 'monthly', member_categories: ['student'] },
    { id: 'pub-1', version: 1, status: 'published', premium_minor: 250000, currency: 'NGN', billing_frequency: 'monthly', member_categories: ['student', 'dependant'], benefits: [{ category: 'Consultation' }], exclusions: [], eligibility_rules: {}, effective_from: '2026-01-01', published_at: '2026-01-01T00:00:00Z' },
  ],
}

describe('bank HMO catalogue distribution', () => {
  test('keeps only active plans and published versions', () => {
    const plans = shapePublishedCatalogue([
      published,
      { ...published, id: 'draft-plan', status: 'draft' },
      { ...published, id: 'no-version', hw_plan_versions: [{ id: 'x', version: 1, status: 'retired', premium_minor: 1, currency: 'NGN' }] },
    ])
    expect(plans).toHaveLength(1)
    expect(plans[0].versions.map((version) => version.versionId)).toEqual(['pub-1'])
    expect(plans[0].versions[0].premiumMinor).toBe(250000)
    expect(filterCatalogue(plans, 'dependant')).toHaveLength(1)
    expect(filterCatalogue(plans, 'missing')).toHaveLength(0)
    expect(catalogueCategories(plans)).toEqual([
      { category: 'dependant', planCount: 1 },
      { category: 'student', planCount: 1 },
    ])
  })

  test('offering rows keep the reference price and separate bank status', () => {
    const plans = shapePublishedCatalogue([published])
    const [idle] = offeringViews(plans)
    expect(idle.referencePremiumMinor).toBe(250000)
    expect(idle.bankPriceMinor).toBeNull()
    expect(idle.offeringStatus).toBe('not_offered')
    expect(idle.publicationStatus).toBe('published')
    const [active] = offeringViews(plans, [{ plan_version_id: 'pub-1', is_active: true, id: 'offer-1' }])
    expect(active.offeringStatus).toBe('active')
    expect(active.activeForBank).toBe(true)
  })

  test('activation is idempotent and refuses a draft or retired version', () => {
    const version = '11111111-1111-4111-8111-111111111111'
    expect(decideOfferingChange({
      planVersionId: version, exists: false, currentActive: null, requestedActive: true,
      versionStatus: 'published', planStatus: 'active', reason: 'Offer this plan',
    }).ok && (decideOfferingChange({
      planVersionId: version, exists: false, currentActive: null, requestedActive: true,
      versionStatus: 'published', planStatus: 'active', reason: 'Offer this plan',
    }) as any).action).toBe('activated')
    const again = decideOfferingChange({
      planVersionId: version, exists: true, currentActive: true, requestedActive: true,
      versionStatus: 'published', planStatus: 'active', reason: 'Offer this plan',
    })
    expect(again).toMatchObject({ ok: true, action: 'unchanged' })
    expect(decideOfferingChange({
      planVersionId: version, exists: true, currentActive: true, requestedActive: false,
      versionStatus: 'retired', planStatus: 'active', reason: 'Stop new sales',
    })).toMatchObject({ ok: true, action: 'deactivated' })
    expect(decideOfferingChange({
      planVersionId: version, exists: false, currentActive: null, requestedActive: true,
      versionStatus: 'draft', planStatus: 'active', reason: 'Offer this plan',
    })).toMatchObject({ ok: false, code: 'PLAN_VERSION_INELIGIBLE' })
    expect(decideOfferingChange({
      planVersionId: version, exists: true, currentActive: false, requestedActive: true,
      versionStatus: 'retired', planStatus: 'retired', reason: 'Bring it back',
    })).toMatchObject({ ok: false, code: 'PLAN_VERSION_INELIGIBLE' })
    expect(tenantSelectionDecision({
      attributedToBank: true, offeringActive: false, versionPublished: true, planActive: true,
    }).allowed).toBe(false)
    expect(tenantSelectionDecision({
      attributedToBank: false, offeringActive: false, versionPublished: true, planActive: true,
    }).allowed).toBe(true)
  })

  test('offering writes stay on the bank offering tables and do not touch catalogue or invoices', () => {
    const controller = fs.readFileSync(path.join(__dirname, '../src/modules/health-insurance/controllers/bank-hmo-distribution.controller.ts'), 'utf8')
    const service = fs.readFileSync(path.join(__dirname, '../src/modules/health-insurance/services/bank-hmo-distribution.service.ts'), 'utf8')
    const enrolment = fs.readFileSync(path.join(__dirname, '../src/modules/health-insurance/services/health-enrolment.service.ts'), 'utf8')
    const routes = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8')
    expect(controller).toContain('agentId: agent.id')
    expect(controller).not.toContain('req.body.agentId')
    expect(controller).not.toContain('req.body?.agentId')
    expect(service).toContain(".eq('agent_id', input.agentId)")
    expect(service).toContain('hw_bank_hmo_offering_events')
    expect(service).not.toContain(".from('hw_plans').update")
    expect(service).not.toContain(".from('hw_plan_versions').update")
    expect(service).not.toContain(".from('hw_enrolments')")
    expect(service).not.toContain(".from('hw_premium_invoices').update")
    expect(enrolment).toContain('plan_version_id')
    expect(enrolment).toContain('assertBankOfferingForNewEnrolment')
    expect(service).toContain(".from('hw_bank_hmo_offering_events').insert")
    expect(service).not.toContain(".rpc(")
    expect(routes).toContain("app.post('/api/agent/hmo-distribution/offerings'")
    expect(routes).toContain("app.post('/api/agent/hmo-distribution/selections'")
  })
})

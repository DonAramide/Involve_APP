import fs from 'fs'
import path from 'path'
import { industryLabel, industryWorkplace, tenantIndustry } from '../src/utils/tenantIndustry'

describe('tenant industry aliases', () => {
  test('order and pos are retail, service is services', () => {
    expect(tenantIndustry('order')).toBe('retail')
    expect(tenantIndustry('pos')).toBe('retail')
    expect(tenantIndustry('invify_retail')).toBe('retail')
    expect(tenantIndustry('service')).toBe('services')
    expect(tenantIndustry('hospitality')).toBe('services')
    expect(tenantIndustry('school')).toBe('school')
    expect(industryLabel('order')).toBe('RETAIL')
    expect(industryLabel('service')).toBe('SERVICE')
    expect(industryWorkplace('order')).toBe('retail business')
    expect(industryWorkplace('services')).toBe('service business')
  })

  test('tenant sidebar lists HMO, ID cards, and gate clock for school, retail, and services', () => {
    const layout = fs.readFileSync(path.join(__dirname, '../src/layouts/TenantLayout.vue'), 'utf8')
    expect(layout).toContain('function identityNav')
    expect(layout).toContain("path: '/tenant/health-insurance'")
    expect(layout).toContain("path: '/tenant/id-cards'")
    expect(layout).toContain("path: '/tenant/entry-exit'")
    expect(layout).toContain("...identityNav('SCHOOL', terms)")
    expect(layout).toContain('...identityNav(modeLabel, terms)')
    expect(layout.match(/\.\.\.identityNav\(modeLabel, terms\)/g)?.length).toBeGreaterThanOrEqual(2)
    expect(layout).toContain("path: '/tenant/attendance'")
  })
})


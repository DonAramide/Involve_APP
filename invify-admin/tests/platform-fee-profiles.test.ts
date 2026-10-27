import routes from '../src/router/routes'
import { permissionsForOperatorRole } from '../src/utils/operatorPermissions'
import { publishBlockers, distributionIsValid, shareTotalBps, REQUIRED_SPLIT_BPS } from '../src/utils/platformFeeBps'
import { previewPlatformFee, koboToNairaLabel } from '../src/utils/platformFeePreview'
import * as fs from 'fs'
import * as path from 'path'

function findChild(path) {
  for (const route of routes) {
    const hit = (route.children || []).find((c) => c.path === path)
    if (hit) return hit
  }
  return undefined
}

describe('platform fee profile routes', () => {
  test('list and detail require admin_deploy and auth', () => {
    const list = findChild('admin/platform-fees')
    const detail = findChild('admin/platform-fees/:transactionType')
    const assessments = findChild('admin/platform-fees/assessments')
    const assessmentDetail = findChild('admin/platform-fees/assessments/:assessmentId')
    const distribution = findChild('admin/platform-fees/distribution')
    const stakeholders = findChild('admin/platform-fees/stakeholders')
    const stakeholderDetail = findChild('admin/platform-fees/stakeholders/:stakeholderId')
    const withdrawals = findChild('admin/platform-fees/withdrawals')
    const withdrawalDetail = findChild('admin/platform-fees/withdrawals/:withdrawalId')
    expect(list).toBeDefined()
    expect(detail).toBeDefined()
    expect(assessments).toBeDefined()
    expect(assessmentDetail).toBeDefined()
    expect(distribution).toBeDefined()
    expect(stakeholders).toBeDefined()
    expect(stakeholderDetail).toBeDefined()
    expect(withdrawals).toBeDefined()
    expect(withdrawalDetail).toBeDefined()
    expect(distribution.meta.permission).toBe('admin_deploy')
    expect(stakeholders.meta.permission).toBe('admin_deploy')
    expect(withdrawals.meta.permission).toBe('admin_deploy')
    expect(assessments.meta.permission).toBe('admin_deploy')
    expect(assessmentDetail.meta.permission).toBe('admin_deploy')
    expect(list.meta.requiresAuth).toBe(true)
    expect(list.meta.permission).toBe('admin_deploy')
    expect(detail.meta.permission).toBe('admin_deploy')
  })

  test('tenant cashier cannot access platform fee configuration', () => {
    const perms = permissionsForOperatorRole('cashier')
    expect(perms).not.toContain('admin_deploy')
  })

  test('ADMIN_FINANCE and ADMIN_TREASURY still lack admin_deploy', () => {
    expect(permissionsForOperatorRole('ADMIN_FINANCE')).not.toContain('admin_deploy')
    expect(permissionsForOperatorRole('ADMIN_TREASURY')).not.toContain('admin_deploy')
  })

  test('SUPER_ADMIN and ADMIN_DEPLOY retain admin_deploy', () => {
    expect(permissionsForOperatorRole('SUPER_ADMIN')).toContain('admin_deploy')
    expect(permissionsForOperatorRole('ADMIN_DEPLOY')).toContain('admin_deploy')
  })
})

describe('platform fee bps validation', () => {
  const pos = {
    method: 'PERCENTAGE',
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
    platform_share_bps: 4000,
    processor_share_bps: 3000,
    service_share_bps: 2000,
    agent_share_bps: 1000,
  }

  test('4000/3000/2000/1000 totals 10000 and is valid', () => {
    expect(shareTotalBps(pos)).toBe(REQUIRED_SPLIT_BPS)
    expect(distributionIsValid(pos)).toBe(true)
    expect(publishBlockers('POS_WITHDRAWAL', pos, { noDraft: false })).toEqual([])
  })

  test('9500 bps is invalid and is not silently normalized', () => {
    const bad = { ...pos, agent_share_bps: 500 }
    expect(shareTotalBps(bad)).toBe(9500)
    expect(distributionIsValid(bad)).toBe(false)
    expect(publishBlockers('POS_WITHDRAWAL', bad).join(' ')).toMatch(/100%/)
  })

  test('negative values are rejected', () => {
    const bad = { ...pos, min_fee_kobo: -1 }
    expect(publishBlockers('POS_WITHDRAWAL', bad).join(' ')).toMatch(/Negative/)
  })
})

describe('POS preview (in-memory, no persistence)', () => {
  const fields = {
    method: 'PERCENTAGE',
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
    platform_share_bps: 4000,
    processor_share_bps: 3000,
    service_share_bps: 2000,
    agent_share_bps: 1000,
  }

  test('POS profile seed displays 1.25% and ₦50 cap, and a changed tariff is not publish-blocked for leaving the seed', () => {
    expect(fields.percentage_bps).toBe(125)
    expect(koboToNairaLabel(fields.max_fee_kobo)).toBe('₦50.00')
    const changed = { ...fields, percentage_bps: 150, max_fee_kobo: 8000 }
    expect(publishBlockers('POS_WITHDRAWAL', changed, { noDraft: false }).join(' ')).not.toMatch(/locked/i)
  })

  test('₦1,000 preview = ₦12.50 and creates no assessment or ledger', () => {
    const preview = previewPlatformFee({
      transactionType: 'POS_WITHDRAWAL',
      transactionAmountKobo: 100000,
      fields,
    })
    expect(preview.final_fee_kobo).toBe(1250)
    expect(koboToNairaLabel(preview.final_fee_kobo)).toBe('₦12.50')
    expect(preview.created_assessment).toBe(false)
    expect(preview.created_ledger_entry).toBe(false)
    expect(preview.persisted).toBe(false)
  })

  test('₦10,000 preview = ₦50 final fee (cap)', () => {
    const preview = previewPlatformFee({
      transactionType: 'POS_WITHDRAWAL',
      transactionAmountKobo: 1000000,
      fields,
    })
    expect(preview.calculated_fee_kobo).toBe(12500)
    expect(preview.final_fee_kobo).toBe(5000)
    expect(koboToNairaLabel(preview.final_fee_kobo)).toBe('₦50.00')
  })

  test('FLAT preview ignores percentage and uses flat kobo', () => {
    const preview = previewPlatformFee({
      transactionType: 'TREASURY_TRANSFER',
      transactionAmountKobo: 1000000,
      fields: { ...fields, method: 'FLAT', percentage_bps: 135, flat_amount_kobo: 2500, max_fee_kobo: 0 },
    })
    expect(preview.calculated_fee_kobo).toBe(2500)
    expect(preview.final_fee_kobo).toBe(2500)
    expect(koboToNairaLabel(preview.final_fee_kobo)).toBe('₦25.00')
  })

  test('HYBRID preview adds flat + percentage then applies cap', () => {
    const preview = previewPlatformFee({
      transactionType: 'TREASURY_WITHDRAWAL',
      transactionAmountKobo: 100000,
      fields: { ...fields, method: 'HYBRID', percentage_bps: 125, flat_amount_kobo: 5000, max_fee_kobo: 20000 },
    })
    expect(preview.calculated_fee_kobo).toBe(6250)
    expect(preview.final_fee_kobo).toBe(6250)
    expect(koboToNairaLabel(preview.final_fee_kobo)).toBe('₦62.50')
  })
})

describe('platform fee UI contracts', () => {
  test('publish requires maker-checker confirmation and uses admin API not supabase tables', () => {
    const detail = fs.readFileSync(
      path.join(__dirname, '../src/pages/admin/PlatformFeeProfileDetailPage.vue'),
      'utf8',
    )
    const api = fs.readFileSync(path.join(__dirname, '../src/api/index.js'), 'utf8')
    expect(detail).toMatch(/Propose Publish/)
    expect(detail).toMatch(/method-formula/)
    expect(detail).toMatch(/fields\.method === 'FLAT'/)
    expect(detail).toMatch(/fields\.method === 'PERCENTAGE'/)
    expect(detail).toMatch(/Approve & Publish/)
    expect(detail).toMatch(/Confirm Publish/)
    expect(detail).toMatch(/publishDialog/)
    expect(detail).toMatch(/adminApi\.proposePlatformFeePublish/)
    expect(detail).toMatch(/adminApi\.publishPlatformFeeVersion/)
    expect(detail).toMatch(/You cannot approve your own proposal/)
    expect(detail).toMatch(/publish-checker-mfa/)
    expect(detail).toMatch(/promptCheckerMfa/)
    expect(detail).toMatch(/publishPlatformFeeVersion\(type, \{ otp \}\)/)
    expect(api).toMatch(/\/propose/)
    expect(api).toMatch(/\/reject/)
    expect(api).toMatch(/\/api\/admin\/platform-fees/)
    expect(api).not.toMatch(/from\('fee_profiles'\)/)
  })
})

describe('phase 6.2 read-only assessments UI', () => {
  test('pages and API are GET-only with no mutation verbs', () => {
    const list = fs.readFileSync(path.join(__dirname, '../src/pages/admin/PlatformFeeAssessmentsPage.vue'), 'utf8')
    const detail = fs.readFileSync(path.join(__dirname, '../src/pages/admin/PlatformFeeAssessmentDetailPage.vue'), 'utf8')
    const api = fs.readFileSync(path.join(__dirname, '../src/api/index.js'), 'utf8')
    const joined = list + detail
    expect(joined).toMatch(/READ ONLY/)
    expect(joined).toMatch(/filter-transaction-type/)
    expect(joined).toMatch(/filter-mode/)
    expect(joined).toMatch(/filter-kind/)
    expect(joined).toMatch(/filter-source/)
    expect(joined).toMatch(/filter-idempotency/)
    expect(joined).toMatch(/filter-from/)
    expect(joined).toMatch(/filter-to/)
    expect(joined).toMatch(/assessment-empty-state/)
    expect(joined).toMatch(/calculation-snapshot/)
    expect(joined).toMatch(/config-snapshot/)
    expect(joined).toMatch(/PLATFORM_FEE/)
    expect(joined).toMatch(/PROCESSOR_FEE/)
    expect(joined).toMatch(/SERVICE_FEE/)
    expect(joined).toMatch(/AGENT_FEE/)
    expect(joined).toMatch(/legacy-comparison-note/)
    expect(joined).toMatch(/assessment-tenant/)
    expect(joined).toMatch(/split-formula/)
    expect(joined).toMatch(/formula-governance/)
    expect(joined).toMatch(/Fee charged \(assessed\)/)
    expect(joined).not.toMatch(/adminApi\.save/)
    expect(joined).not.toMatch(/adminApi\.publish/)
    expect(joined).not.toMatch(/label="Save"/)
    expect(joined).not.toMatch(/label="Edit"/)
    expect(joined).not.toMatch(/label="Publish"/)
    expect(joined).not.toMatch(/label="Delete"/)
    expect(joined).not.toMatch(/label="Reverse"/)
    expect(joined).not.toMatch(/label="Retry"/)
    expect(api).toMatch(/listPlatformFeeAssessments/)
    expect(api).toMatch(/getPlatformFeeAssessment/)
    expect(api).toMatch(/getPlatformFeeReconciliation/)
    expect(api).not.toMatch(/platform-fees\/assessments.*post/i)
  })
})

describe('fee distribution control plane UI', () => {
  test('uses assessed terminology and no collected/paid claims', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/admin/PlatformFeeDistributionPage.vue'), 'utf8')
    const withdrawals = fs.readFileSync(path.join(__dirname, '../src/pages/admin/PlatformFeeWithdrawalsPage.vue'), 'utf8')
    expect(page).toMatch(/FEE MODE/)
    expect(page).toMatch(/PROCESSOR ASSESSED PAYABLE/)
    expect(page).toMatch(/FINAL ASSESSED FEES/)
    expect(page).not.toMatch(/Total Collected/)
    expect(withdrawals).toMatch(/CONTROL_PLANE_ONLY/)
    expect(withdrawals).not.toMatch(/Paid to bank/)
  })

  test('stakeholder payable rows open assessment breakdown', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/admin/PlatformFeeStakeholderDetailPage.vue'), 'utf8')
    expect(page).toMatch(/@row-click="openAssessment"/)
    expect(page).toMatch(/\/admin\/platform-fees\/assessments\/\$\{historyRow\.assessment_id\}/)
    expect(page).toMatch(/tenant_name/)
    expect(page).not.toMatch(/collected/)
  })
})

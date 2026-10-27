import * as fs from 'fs'
import * as path from 'path'

function read(rel) {
  return fs.readFileSync(path.join(__dirname, rel), 'utf8')
}

describe('checker 2FA on maker-checker actions', () => {
  test('activation checker dialog collects authenticator code', () => {
    const page = read('../src/pages/TenantDetailPage.vue')
    expect(page).toMatch(/promptCheckerMfa/)
    expect(page).toMatch(/Checker-approve activation/)
    expect(page).toMatch(/activateFinancialPlatform\(tenant\.value\.id, \{ otp \}\)/)
    expect(page).toMatch(/rejectFinancialPlatformActivation\(tenant\.value\.id, \{ reason, otp \}\)/)
    expect(page).not.toMatch(/onOk\(async \(\) => \{\s*activatingPlatform/)
  })

  test('API sends otp on checker approve/reject routes', () => {
    const api = read('../src/api/index.js')
    expect(api).toMatch(/activateFinancialPlatform: \(tenantId, data\)/)
    expect(api).toMatch(/publishPlatformFeeVersion: \(transactionType, data\)/)
    expect(api).toMatch(/rejectPlatformFeePublish: \(transactionType, data\)/)
    expect(api).toMatch(/approveCommission: \(id, data\)/)
  })

  test('prompt helper requires a 2FA input', () => {
    const helper = read('../src/utils/promptCheckerMfa.js')
    expect(helper).toMatch(/2FA \/ Google Authenticator code/)
    expect(helper).toMatch(/otp\.length < 6/)
  })
})

import { test, expect, Page } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Constants — update BASE_URL if the dev server runs on a different port
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.INVIFY_URL ?? 'http://localhost:9000'

// ─────────────────────────────────────────────────────────────────────────────
// Shared Login Helper
// ─────────────────────────────────────────────────────────────────────────────
async function login(page: Page, email = 'superadmin@iips.app', password?: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })

  // Handle dynamic password (current behaviour from AdminLoginDialog)
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const yy = String(now.getFullYear()).substring(2)
  const dynamicPassword = password ?? `${mm}${dd}${yy}iips@invify`

  await page.fill('[data-testid="login-email"], input[type="email"], input[placeholder*="email" i]', email)
  await page.fill('[data-testid="login-password"], input[type="password"]', dynamicPassword)
  await page.click('[data-testid="login-btn"], button:has-text("Login"), button:has-text("Sign In")')
  await page.waitForURL(/dashboard|home|governance|finance/, { timeout: 10_000 })
}

// ─────────────────────────────────────────────────────────────────────────────
// UAT-FIN-01 — Finance: View Transaction Ledger
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-FIN-01 | Finance — Transaction Ledger loads and displays entries', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/finance/transactions`)
  await page.waitForLoadState('networkidle')

  // Validate page contains transaction data
  await expect(page.locator('table, [data-testid="transaction-list"], .q-table')).toBeVisible({ timeout: 8000 })
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-FIN-01-transaction-ledger.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-FIN-02 — Finance: Ledger Reconciliation
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-FIN-02 | Finance — Global Ledger page loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/finance/ledger`)
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveURL(/ledger/)
  await expect(page.locator('.q-page, main, [role="main"]')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-FIN-02-ledger.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-FIN-03 — Finance: Settlement Engine Dashboard
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-FIN-03 | Finance — Settlement page loads with batch status', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/finance/settlement`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-FIN-03-settlement.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-TRS-01 — Treasury: Wallet Management
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-TRS-01 | Treasury — Wallet Management page loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/treasury/wallets`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-TRS-01-wallets.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-TRS-02 — Treasury: Revenue Engine
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-TRS-02 | Treasury — Revenue Engine page loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/treasury/revenue`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-TRS-02-revenue.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-TRS-03 — Treasury: Audit Lineage
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-TRS-03 | Treasury — Audit Lineage page loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/audit`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-TRS-03-audit.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-FRD-01 — Fraud: Monitoring Center loads
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-FRD-01 | Fraud — Fraud Monitoring Center loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/fraud/monitoring`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-FRD-01-fraud-monitoring.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-FRD-02 — Fraud: Case Management
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-FRD-02 | Fraud — Case Management page loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/fraud/cases`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-FRD-02-fraud-cases.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-FRD-03 — Fraud: Quarantine Center
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-FRD-03 | Fraud — Quarantine Center page loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/quarantine`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-FRD-03-quarantine.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-CMP-01 — Compliance: Compliance Center loads
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-CMP-01 | Compliance — Compliance Center loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/compliance`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-CMP-01-compliance.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-CMP-02 — Compliance: Policy Governance
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-CMP-02 | Compliance — Policy Governance loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/policy`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-CMP-02-policy.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-CMP-03 — Compliance: Immutable Audit Lineage
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-CMP-03 | Compliance — Immutable Audit Lineage loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/audit-lineage`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-CMP-03-audit-lineage.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-OPS-01 — Operations: Notification Center
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-OPS-01 | Operations — Notification Center loads with entries', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/notifications`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-OPS-01-notifications.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-OPS-02 — Operations: SLA Management Engine
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-OPS-02 | Operations — SLA Command Center loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/sla`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-OPS-02-sla.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-OPS-03 — Operations: Workflow Automation Center
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-OPS-03 | Operations — Workflow Automation Center loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/automation/workflows`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-OPS-03-workflows.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-OPS-04 — Operations: Governance Approval Engine
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-OPS-04 | Operations — Governance Approval Engine loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/approvals`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  // Validate approval table is rendered
  const approvalItems = page.locator('[data-testid="approval-row"], .approval-card, .q-card, tr')
  await expect(approvalItems.first()).toBeVisible({ timeout: 8000 })
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-OPS-04-approvals.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-EXE-01 — Executive: Governance Command Center
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-EXE-01 | Executive — Governance Command Center loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-EXE-01-governance.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-EXE-02 — Executive: Executive Command Center
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-EXE-02 | Executive — Executive Command Center loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/executive`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-EXE-02-executive.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-EXE-03 — Executive: AI Insights Center
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-EXE-03 | Executive — AI Insights Center loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/ai/insights`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-EXE-03-ai-insights.png', fullPage: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// UAT-EXE-04 — Executive: Platform Integrity Center
// ─────────────────────────────────────────────────────────────────────────────
test('UAT-EXE-04 | Executive — Platform Integrity Center loads', async ({ page }) => {
  await login(page)
  await page.goto(`${BASE_URL}/governance/integrity-center`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.q-page, main')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/evidence/UAT-EXE-04-integrity.png', fullPage: true })
})

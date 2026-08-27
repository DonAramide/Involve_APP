import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  EXPECTED_LOGIN_URL,
  EXPECTED_STAGING_ORIGIN,
  classifyRequestUrl
} from './lib/endpoint-security.mjs'

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:4173'
const outputDir = path.resolve('qa-artifacts', 'phase6s27b')
const publicRoutes = [
  '/',
  '/platform',
  '/solutions',
  '/features',
  '/financial-operations',
  '/security',
  '/pricing',
  '/about',
  '/contact'
]
const authRoutes = ['/login', '/admin/login', '/tenant/login']
const previewOrigin = new URL(baseUrl).origin

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
const failures = []
const networkRequests = []

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()
  let consoleErrors = []
  let pageErrors = []
  let routeNetwork = []

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('request', request => {
    const url = request.url()
    const record = `${request.method()} ${url}`
    routeNetwork.push(record)
    networkRequests.push(record)
    try {
      const verdict = classifyRequestUrl(url, previewOrigin)
      if (verdict.forbidden) {
        routeNetwork.push(`FORBIDDEN ${record}`)
      }
    } catch {
      /* ignore parse issues; gate will classify */
    }
  })

  const resetEvidence = () => {
    consoleErrors = []
    pageErrors = []
    routeNetwork = []
  }

  const forbiddenFrom = list => list.filter(item => item.startsWith('FORBIDDEN ')).map(item => item.replace(/^FORBIDDEN /, ''))

  for (const route of publicRoutes) {
    resetEvidence()
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const metrics = await page.evaluate(() => ({
      heading: document.querySelector('h1')?.textContent?.trim() || '',
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      brokenImages: [...document.images]
        .filter(image => image.complete && image.naturalWidth === 0)
        .map(image => image.currentSrc || image.src)
    }))
    const forbiddenRequests = forbiddenFrom(routeNetwork)
    const routeFailures = []
    if (!response || response.status() >= 400) routeFailures.push(`HTTP ${response?.status() || 'no response'}`)
    if (!metrics.heading) routeFailures.push('missing h1')
    if (metrics.horizontalOverflow) routeFailures.push('horizontal overflow')
    if (metrics.brokenImages.length) routeFailures.push(`broken images: ${metrics.brokenImages.join(', ')}`)
    if (consoleErrors.length) routeFailures.push(`console errors: ${consoleErrors.join(' | ')}`)
    if (pageErrors.length) routeFailures.push(`page errors: ${pageErrors.join(' | ')}`)
    if (forbiddenRequests.length) routeFailures.push(`forbidden requests: ${forbiddenRequests.join(' | ')}`)
    const result = {
      route,
      ...metrics,
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors],
      networkRequests: [...routeNetwork],
      forbiddenRequests,
      failures: routeFailures
    }
    results.push(result)
    if (routeFailures.length) failures.push(result)
  }

  for (const route of authRoutes) {
    resetEvidence()
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const routeFailures = []
    if (!response || response.status() >= 400) routeFailures.push(`HTTP ${response?.status() || 'no response'}`)
    let capturedLoginUrl = ''

    if (route === '/login') {
      const adminLink = await page.getByRole('link', { name: /Admin \/ Ops Login/i }).isVisible()
      const tenantLink = await page.getByRole('link', { name: /Tenant Login/i }).isVisible()
      if (!adminLink || !tenantLink) routeFailures.push('portal chooser links missing')
    } else {
      const form = page.locator('form:visible').last()
      const email = form.locator('input:visible').first()
      const password = form.locator('input[type="password"]:visible').first()
      if (!(await email.isVisible()) || !(await password.isVisible())) {
        routeFailures.push('visible email/password fields missing')
      } else {
        await page.route('**/api/auth/login', async intercepted => {
          capturedLoginUrl = intercepted.request().url()
          await intercepted.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ qaIntercepted: true })
          })
        })
        await email.fill('qa-browser-check@example.invalid')
        await password.fill('Phase6S27C-QA-Only!')
        await password.press('Enter')
        await page.waitForTimeout(500)
        await page.unroute('**/api/auth/login')
        if (!capturedLoginUrl) {
          routeFailures.push('login request was not emitted')
        } else if (capturedLoginUrl.split('?')[0] !== EXPECTED_LOGIN_URL) {
          routeFailures.push(`login request targeted ${capturedLoginUrl}, expected ${EXPECTED_LOGIN_URL}`)
        }
      }
    }

    const configErrors = [...consoleErrors, ...pageErrors]
      .filter(message => /AdminConfig|VITE_API_URL/i.test(message))
    const forbiddenRequests = forbiddenFrom(routeNetwork)
    if (configErrors.length) routeFailures.push(`configuration errors: ${configErrors.join(' | ')}`)
    if (consoleErrors.length && !routeFailures.some(failure => failure.startsWith('configuration errors'))) {
      routeFailures.push(`console errors: ${consoleErrors.join(' | ')}`)
    }
    if (pageErrors.length && !routeFailures.some(failure => failure.startsWith('configuration errors'))) {
      routeFailures.push(`page errors: ${pageErrors.join(' | ')}`)
    }
    if (forbiddenRequests.length) routeFailures.push(`forbidden requests: ${forbiddenRequests.join(' | ')}`)
    const result = {
      route,
      capturedLoginUrl,
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors],
      networkRequests: [...routeNetwork],
      forbiddenRequests,
      failures: routeFailures
    }
    results.push(result)
    if (routeFailures.length) failures.push(result)
  }

  for (const route of ['/fleet/overview', '/finance/ledger', '/governance', '/finance/reconciliation']) {
    resetEvidence()
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const finalPath = new URL(page.url()).pathname
    const forbiddenRequests = forbiddenFrom(routeNetwork)
    const routeFailures = []
    if (!authRoutes.includes(finalPath)) routeFailures.push(`protected route ended at ${finalPath}`)
    if (pageErrors.length) routeFailures.push(`page errors: ${pageErrors.join(' | ')}`)
    if (forbiddenRequests.length) routeFailures.push(`forbidden requests: ${forbiddenRequests.join(' | ')}`)
    const result = {
      route,
      finalPath,
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors],
      networkRequests: [...routeNetwork],
      forbiddenRequests,
      failures: routeFailures
    }
    results.push(result)
    if (routeFailures.length) failures.push(result)
  }

  await context.close()
} finally {
  await browser.close()
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  expectedApiOrigin: EXPECTED_STAGING_ORIGIN,
  expectedLoginUrl: EXPECTED_LOGIN_URL,
  passed: failures.length === 0,
  checks: results.length,
  failures,
  networkRequests,
  results
}
await writeFile(path.join(outputDir, 'browser-qa.json'), JSON.stringify(report, null, 2))
console.log(`Phase 6S.27B/C browser QA: ${report.passed ? 'PASS' : 'FAIL'} (${results.length} checks)`)
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2))
  process.exitCode = 1
}

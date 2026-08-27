import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:5173'
const outputDir = path.resolve('qa-artifacts', 'phase6s27a')
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
const viewports = [
  { name: 'mobile-320', width: 320, height: 860 },
  { name: 'mobile-375', width: 375, height: 900 },
  { name: 'mobile-390', width: 390, height: 900 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'desktop-1920', width: 1920, height: 1080 }
]

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const results = []
const failures = []

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: 'light',
      reducedMotion: 'reduce'
    })
    const page = await context.newPage()
    const consoleErrors = []
    const requestFailures = []

    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('requestfailed', request => {
      requestFailures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText || 'failed'}`)
    })

    for (const route of publicRoutes) {
      consoleErrors.length = 0
      requestFailures.length = 0

      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
      const metrics = await page.evaluate(() => {
        const visible = element => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
        }
        const overflowingElements = [...document.querySelectorAll('body *')]
          .filter(visible)
          .filter(element => {
            const rect = element.getBoundingClientRect()
            return rect.left < -1 || rect.right > window.innerWidth + 1
          })
          .slice(0, 10)
          .map(element => `${element.tagName.toLowerCase()}.${[...element.classList].slice(0, 3).join('.')}`)
        const brokenImages = [...document.images]
          .filter(image => image.complete && image.naturalWidth === 0)
          .map(image => image.currentSrc || image.src)

        return {
          title: document.title,
          heading: document.querySelector('h1')?.textContent?.trim() || '',
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          overflowingElements,
          brokenImages,
          visibleButtons: [...document.querySelectorAll('a.q-btn, button.q-btn')].filter(visible).length,
          footerPresent: Boolean(document.querySelector('footer'))
        }
      })

      const routeFailures = []
      if (!response || response.status() >= 400) routeFailures.push(`HTTP ${response?.status() || 'no response'}`)
      if (!metrics.heading) routeFailures.push('missing visible h1')
      if (metrics.horizontalOverflow) {
        routeFailures.push(
          `horizontal overflow ${metrics.scrollWidth}px > ${metrics.clientWidth}px; candidates: ${metrics.overflowingElements.join(', ')}`
        )
      }
      if (metrics.brokenImages.length) routeFailures.push(`broken images: ${metrics.brokenImages.join(', ')}`)
      if (!metrics.footerPresent) routeFailures.push('footer missing')
      if (metrics.visibleButtons === 0) routeFailures.push('no visible CTA/button')
      if (consoleErrors.length) routeFailures.push(`console errors: ${consoleErrors.join(' | ')}`)
      if (requestFailures.length) routeFailures.push(`request failures: ${requestFailures.join(' | ')}`)

      const result = { viewport: viewport.name, route, ...metrics, consoleErrors: [...consoleErrors], requestFailures: [...requestFailures], failures: routeFailures }
      results.push(result)
      if (routeFailures.length) failures.push(result)
    }

    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
    if (viewport.width < 1024) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click()
      const mobileNavigation = page.locator('.mobile-navigation')
      const mobileChecks = {
        tenantSignIn: await mobileNavigation.getByRole('link', { name: /Sign In \(Business\)/i }).isVisible(),
        adminSignIn: await mobileNavigation.getByRole('link', { name: /Sign In \(Admin\)/i }).isVisible(),
        getStarted: await mobileNavigation.getByRole('link', { name: /Get Started/i }).isVisible()
      }
      if (Object.values(mobileChecks).some(value => !value)) {
        failures.push({ viewport: viewport.name, route: '/', failures: ['mobile navigation actions missing'], mobileChecks })
      }
      await page.getByRole('button', { name: 'Close navigation menu' }).click()
    } else {
      const signIn = page.getByRole('button', { name: /Sign In/i }).first()
      await signIn.click()
      const tenantVisible = await page.getByText('Business / Tenant', { exact: true }).isVisible()
      const adminVisible = await page.getByText('Super Admin', { exact: true }).isVisible()
      if (!tenantVisible || !adminVisible) {
        failures.push({ viewport: viewport.name, route: '/', failures: ['desktop sign-in chooser incomplete'] })
      }
      await page.keyboard.press('Escape')
    }

    await page.screenshot({
      path: path.join(outputDir, `${viewport.name}-home.png`),
      fullPage: true
    })
    await context.close()
  }

  const authContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const authPage = await authContext.newPage()
  for (const route of ['/admin/login', '/tenant/login']) {
    const response = await authPage.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const hasForm = await authPage.locator('form, .q-form').count()
    if (!response || response.status() >= 400 || hasForm === 0) {
      failures.push({ viewport: 'desktop-1280', route, failures: ['auth portal did not render a form'] })
    }
  }

  for (const route of ['/fleet/overview', '/finance/ledger', '/governance']) {
    await authPage.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const finalPath = new URL(authPage.url()).pathname
    if (!['/login', '/admin/login', '/tenant/login'].includes(finalPath)) {
      failures.push({ viewport: 'desktop-1280', route, finalPath, failures: ['protected route did not redirect to authentication'] })
    }
  }
  await authContext.close()
} finally {
  await browser.close()
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewports,
  routes: publicRoutes,
  checks: results.length,
  passed: failures.length === 0,
  failures,
  results
}

await writeFile(path.join(outputDir, 'browser-qa.json'), JSON.stringify(report, null, 2))
console.log(`Phase 6S.27A browser QA: ${report.passed ? 'PASS' : 'FAIL'} (${results.length} route/viewport checks)`)
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2))
  process.exitCode = 1
}

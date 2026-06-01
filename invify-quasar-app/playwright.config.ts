import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e/evidence',
  timeout: 30_000,
  retries: 1,
  workers: 1, // Run sequentially — Quasar dev server can't handle parallel logins

  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/e2e/results.json' }],
  ],

  use: {
    baseURL: process.env.INVIFY_URL ?? 'http://localhost:9000',
    trace: 'on',         // Always capture trace for evidence
    video: 'on',         // Always capture video
    screenshot: 'on',    // Always capture screenshot (in addition to manual ones)
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

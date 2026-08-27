import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  EXPECTED_LOGIN_URL,
  EXPECTED_STAGING_ORIGIN,
  OBSOLETE_STAGING_API,
  UNINTENDED_PRODUCTION_API,
  classifyRequestUrl,
  extractCandidateUrls,
  findForbiddenLiterals,
  isForbiddenRuntimeHost,
  parseHostname,
  snippetAround,
  validateStagingApiOrigin
} from './lib/endpoint-security.mjs'

const adminRoot = path.resolve(process.cwd())
const distDir = path.join(adminRoot, 'dist')
const srcDir = path.join(adminRoot, 'src')
const outputDir = path.resolve('qa-artifacts', 'phase6s27c')
const browserQaPath = path.resolve('qa-artifacts', 'phase6s27b', 'browser-qa.json')
const vendorRoots = [
  path.join(adminRoot, 'node_modules', 'axios'),
  path.join(adminRoot, 'node_modules', '@supabase')
]

const failures = []
const diagnostics = []

function recordFailure(section, message) {
  failures.push({ section, message })
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return null
  const values = {}
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue
    const [key, ...rest] = line.split('=')
    values[key.trim()] = rest.join('=').trim()
  }
  return values
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', 'qa-artifacts', 'test-results'].includes(entry.name)) continue
      walkFiles(full, acc)
    } else if (
      /\.(js|ts|vue|mjs|cjs|json|html|css)$/i.test(entry.name) ||
      entry.name.startsWith('.env') ||
      entry.name.endsWith('.example')
    ) {
      acc.push(full)
    }
  }
  return acc
}

const vendorIndex = []
for (const root of vendorRoots) {
  for (const file of walkFiles(root, [])) {
    vendorIndex.push({
      file,
      text: readFileSync(file, 'utf8'),
      rel: path.relative(path.join(adminRoot, 'node_modules'), file).replace(/\\/g, '/')
    })
  }
}

function vendorOwnsLiteral(literal) {
  const matches = []
  for (const entry of vendorIndex) {
    if (!entry.text.includes(literal)) continue
    const pkg = entry.rel.startsWith('@') ? entry.rel.split('/').slice(0, 2).join('/') : entry.rel.split('/')[0]
    matches.push({ package: pkg, file: entry.rel })
    if (matches.length >= 3) return matches
  }
  return matches
}

function applicationOwnsLiteral(literal) {
  return [
    ...walkFiles(srcDir),
    path.join(adminRoot, 'index.html'),
    path.join(adminRoot, '.env.staging'),
    path.join(adminRoot, '.env.staging.example')
  ]
    .filter(existsSync)
    .filter(file => readFileSync(file, 'utf8').includes(literal))
    .map(file => path.relative(adminRoot, file).replace(/\\/g, '/'))
}

const stagingEnv = readEnvFile(path.join(adminRoot, '.env.staging'))
const stagingExample = readEnvFile(path.join(adminRoot, '.env.staging.example'))
if (!stagingEnv?.VITE_API_URL) {
  recordFailure('configuration', '.env.staging VITE_API_URL is missing')
} else {
  const result = validateStagingApiOrigin(stagingEnv.VITE_API_URL)
  if (!result.ok) recordFailure('configuration', `.env.staging VITE_API_URL invalid: ${result.errors.join('; ')}`)
}
if (!stagingExample?.VITE_API_URL) {
  recordFailure('configuration', '.env.staging.example VITE_API_URL is missing')
} else {
  const result = validateStagingApiOrigin(stagingExample.VITE_API_URL)
  if (!result.ok) recordFailure('configuration', `.env.staging.example VITE_API_URL invalid: ${result.errors.join('; ')}`)
}

for (const file of [
  ...walkFiles(srcDir),
  path.join(adminRoot, 'index.html'),
  path.join(adminRoot, '.env.staging'),
  path.join(adminRoot, '.env.staging.example')
].filter(existsSync)) {
  const rel = path.relative(adminRoot, file).replace(/\\/g, '/')
  const text = readFileSync(file, 'utf8')
  for (const url of extractCandidateUrls(text)) {
    const host = parseHostname(url)
    if (url.startsWith(OBSOLETE_STAGING_API) || host === 'staging-api.invify.local') {
      recordFailure('application-source', `${rel} contains obsolete staging API URL ${url}`)
    }
    if (isForbiddenRuntimeHost(host)) {
      recordFailure('application-source', `${rel} contains forbidden runtime endpoint ${url}`)
    }
  }
  if (text.includes('staging-api.invify.local')) {
    recordFailure('application-source', `${rel} contains obsolete staging hostname staging-api.invify.local`)
  }
}

if (!existsSync(distDir)) {
  recordFailure('compiled-config', 'dist/ is missing; run npm run build -- --mode staging first')
} else {
  let intendedOriginCount = 0
  let obsoleteCount = 0
  let productionApiCount = 0
  for (const file of walkFiles(distDir)) {
    const rel = path.relative(adminRoot, file).replace(/\\/g, '/')
    const text = readFileSync(file, 'utf8')
    intendedOriginCount += (text.match(/https:\/\/staging\.invify\.org/g) || []).length
    obsoleteCount += (text.match(/staging-api\.invify\.local/g) || []).length
    productionApiCount += (text.match(/https:\/\/api\.invify\.org/g) || []).length
    for (const literal of findForbiddenLiterals(text)) {
      for (const sample of literal.samples) {
        const idx = text.indexOf(sample)
        const appEvidence = applicationOwnsLiteral(sample)
        const vendorEvidence = vendorOwnsLiteral(sample)
        const applicationControlled = appEvidence.length > 0 && vendorEvidence.length === 0
        const supabaseHit = vendorEvidence.find(item => String(item.package).startsWith('@supabase'))
        const dependencyPackage = rel.includes('supabase') && !applicationControlled
          ? (supabaseHit?.package || '@supabase/auth-js (bundled)')
          : (vendorEvidence[0]?.package || (applicationControlled ? '(application)' : '(unclassified)'))
        diagnostics.push({
          kind: 'compiled-literal',
          dependencyPackage,
          literal: sample,
          bundleFile: rel,
          applicationControlled,
          selectedAsRuntimeEndpoint: false,
          browserRequestUsed: false,
          vendorEvidence: vendorEvidence.slice(0, 2),
          applicationEvidence: appEvidence.slice(0, 2),
          snippet: idx >= 0 ? snippetAround(text, idx) : sample
        })
        if (applicationControlled) {
          recordFailure('compiled-config', `application-controlled compiled literal ${sample} in ${rel}`)
        }
      }
    }
  }
  if (intendedOriginCount === 0) recordFailure('compiled-config', `compiled bundle does not contain ${EXPECTED_STAGING_ORIGIN}`)
  if (obsoleteCount > 0) recordFailure('compiled-config', `compiled bundle still contains ${OBSOLETE_STAGING_API}`)
  if (productionApiCount > 0) recordFailure('compiled-config', `compiled staging bundle contains unintended ${UNINTENDED_PRODUCTION_API}`)
}

if (!existsSync(browserQaPath)) {
  recordFailure('browser-network', 'qa-artifacts/phase6s27b/browser-qa.json is missing')
} else {
  const browserQa = JSON.parse(readFileSync(browserQaPath, 'utf8'))
  if (browserQa.passed === false) recordFailure('browser-network', 'Phase 6S.27B browser QA reported FAIL')
  const previewOrigin = new URL(browserQa.baseUrl || 'http://127.0.0.1:4173').origin
  const allRequests = [
    ...(browserQa.networkRequests || []),
    ...((browserQa.results || []).flatMap(result => result.networkRequests || result.forbiddenRequests || []))
  ]
  for (const request of allRequests) {
    const url = typeof request === 'string' ? request.replace(/^[A-Z]+\s+/, '') : request.url
    if (!url || !/^https?:\/\//i.test(url)) continue
    const verdict = classifyRequestUrl(url, previewOrigin)
    if (verdict.forbidden) {
      recordFailure('browser-network', `browser request targeted forbidden host ${verdict.hostname}: ${url}`)
      for (const item of diagnostics) {
        if (item.literal && (url.includes(String(item.literal)) || verdict.hostname === String(item.literal).toLowerCase())) {
          item.browserRequestUsed = true
        }
      }
    }
  }
  for (const result of browserQa.results || []) {
    if ((result.route === '/admin/login' || result.route === '/tenant/login') && (result.capturedLoginUrl || result.capturedLoginUrl)) {
      const captured = (result.capturedLoginUrl || result.capturedLoginUrl).split('?')[0]
      if (captured !== EXPECTED_LOGIN_URL) {
        recordFailure('auth-api-target', `${result.route} login targeted ${captured}, expected ${EXPECTED_LOGIN_URL}`)
      }
    }
    const configErrors = [...(result.consoleErrors || result.consoleErrors || []), ...(result.pageErrors || result.pageErrors || [])]
      .filter(message => /AdminConfig|AdminConfig|VITE_API_URL/i.test(message))
    if (configErrors.length) recordFailure('admin-config', `${result.route}: ${configErrors.join(' | ')}`)
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  expectedStagingOrigin: EXPECTED_STAGING_ORIGIN,
  expectedLoginUrl: EXPECTED_LOGIN_URL,
  passed: failures.length === 0,
  failures,
  vendorLiteralDiagnostics: diagnostics,
  principle: 'No staging/production application-controlled runtime endpoint or browser request may target an unsafe/private/development host.',
  vendorStatement: 'Third-party dependency-internal loopback literals detected: informational only. No application-controlled endpoint or browser request targets these hosts.'
}

await mkdir(outputDir, { recursive: true })
await writeFile(path.join(outputDir, 'endpoint-gate.json'), JSON.stringify(report, null, 2))
console.log(`Phase 6S.27C endpoint-aware gate: ${report.passed ? 'PASS' : 'FAIL'}`)
if (!report.passed) {
  console.error(JSON.stringify(failures, null, 2))
  process.exitCode = 1
} else {
  console.log(`Vendor/internal compiled literals reported informatively: ${diagnostics.length}`)
  console.log(report.vendorStatement)
}

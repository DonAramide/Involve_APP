export const EXPECTED_STAGING_ORIGIN = 'https://staging.invify.org'
export const EXPECTED_LOGIN_PATH = '/api/auth/login'
export const EXPECTED_LOGIN_URL = `${EXPECTED_STAGING_ORIGIN}${EXPECTED_LOGIN_PATH}`
export const OBSOLETE_STAGING_API = 'http://staging-api.invify.local:3000'
export const UNINTENDED_PRODUCTION_API = 'https://api.invify.org'

const TUNNEL_MARKERS = ['ngrok', 'loca.lt', 'serveo.net', 'trycloudflare.com', 'localtunnel.me']

export function parseHostname(value) {
  if (!value) return ''
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return new URL(value).hostname.toLowerCase()
  } catch {
    /* ignore */
  }
  return String(value).split('/')[0].split(':')[0].replace(/^\[|\]$/g, '').toLowerCase()
}

export function isPrivateIpv4(hostname) {
  const octets = hostname.split('.').map(part => Number(part))
  const ipv4 = octets.length === 4 && octets.every(part => Number.isInteger(part) && part >= 0 && part <= 255)
  if (!ipv4) return false
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  )
}

export function isLoopbackHost(hostname) {
  const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0:0:0:0:0:0:0:1'
}

export function isForbiddenRuntimeHost(hostname) {
  const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
  if (!host) return false
  if (isLoopbackHost(host)) return true
  if (host.endsWith('.local')) return true
  if (TUNNEL_MARKERS.some(marker => host.includes(marker))) return true
  return isPrivateIpv4(host)
}

export function classifyRequestUrl(rawUrl, previewOrigin) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { forbidden: true, reason: 'unparseable-url', hostname: '' }
  }
  if (parsed.origin === previewOrigin) {
    return { forbidden: false, reason: 'local-preview-asset', hostname: parsed.hostname }
  }
  if (isForbiddenRuntimeHost(parsed.hostname)) {
    return { forbidden: true, reason: 'unsafe-or-private-host', hostname: parsed.hostname }
  }
  if (parsed.hostname.toLowerCase() === 'api.invify.org') {
    return { forbidden: true, reason: 'unintended-production-api', hostname: parsed.hostname }
  }
  return { forbidden: false, reason: 'allowed', hostname: parsed.hostname }
}

export function validateStagingApiOrigin(value) {
  const errors = []
  if (!value || !String(value).trim()) return { ok: false, errors: ['VITE_API_URL is missing'] }
  const raw = String(value).trim()
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, errors: ['VITE_API_URL is not a valid absolute URL'] }
  }
  if (parsed.protocol !== 'https:') errors.push('must be HTTPS')
  if (parsed.username || parsed.password) errors.push('must not contain credentials')
  if (parsed.pathname !== '/' && parsed.pathname !== '') errors.push('must be origin-only (no path, including /api)')
  if (parsed.search) errors.push('must not contain a query string')
  if (parsed.hash) errors.push('must not contain a fragment')
  if (isForbiddenRuntimeHost(parsed.hostname)) errors.push('must not use localhost, LAN, .local, or tunnel hosts')
  if (raw.replace(/\/$/, '') !== EXPECTED_STAGING_ORIGIN) errors.push(`must equal ${EXPECTED_STAGING_ORIGIN}`)
  return { ok: errors.length === 0, errors, parsed }
}

export function extractCandidateUrls(text) {
  const matches = String(text).match(/https?:\/\/[^\s"'`<>\\]+/gi) || []
  return [...new Set(matches.map(value => value.replace(/[),.;]+$/, '')))]
}

export function findForbiddenLiterals(text) {
  const findings = []
  const patterns = [
    { id: 'localhost', re: /\blocalhost\b/gi },
    { id: '127.0.0.1', re: /\b127\.0\.0\.1\b/g },
    { id: '::1', re: /\[::1\]/g },
    { id: 'ngrok', re: /ngrok/gi },
    { id: 'staging-api.invify.local', re: /staging-api\.invify\.local/gi },
    { id: '.local-host', re: /[a-z0-9-]+\.local\b/g },
    { id: 'private-10', re: /\b10\.(?:\d{1,3}\.){2}\d{1,3}\b/g },
    { id: 'private-192-168', re: /\b192\.168\.\d{1,3}\.\d{1,3}\b/g },
    { id: 'link-local', re: /\b169\.254\.\d{1,3}\.\d{1,3}\b/g },
    { id: 'private-172', re: /\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/g }
  ]
  for (const pattern of patterns) {
    const hits = text.match(pattern.re) || []
    if (hits.length) findings.push({ id: pattern.id, count: hits.length, samples: [...new Set(hits)].slice(0, 5) })
  }
  return findings
}

export function snippetAround(text, index, radius = 80) {
  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + radius)
  return text.slice(start, end).replace(/\s+/g, ' ')
}

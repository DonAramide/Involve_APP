const PLACEHOLDER_CODES = new Set(['AAA000', 'DEFAULT', 'UNASSIGNED'])

export function pickInstituteCode(...values) {
  for (const raw of values) {
    const code = String(raw || '').trim().toUpperCase()
    if (code && !PLACEHOLDER_CODES.has(code)) return code
  }
  return ''
}

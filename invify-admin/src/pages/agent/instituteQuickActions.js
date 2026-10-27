/**
 * Institute dashboard quick actions must not open the generic coming-soon page
 * when a real destination already exists.
 * Hardware assignment stays read-only: the current assign API can retarget or
 * invent a serial without an ownership or audit check.
 */

const DESTINATIONS = [
  { match: ['create lead', 'create-lead'], to: '/institute/leads' },
  { match: ['upload kyc', 'upload-kyc', 'kyc'], to: { path: '/institute/profile', query: { tab: 'kyc' } } },
  { match: ['assign device', 'assign-device'], to: '/institute/assign-device' },
  { match: ['assign terminal', 'assign-terminal'], to: '/institute/assign-terminal' },
  { match: ['request withdrawal', 'request-withdrawal', 'withdrawal'], to: '/institute/wallet' },
  { match: ['support ticket', 'support-ticket', 'support'], to: '/institute/support' }
]

export function resolveInstituteQuickAction(action) {
  const label = String(action?.label || '').toLowerCase()
  const route = String(action?.route || '').toLowerCase()
  const haystack = `${label} ${route}`
  const found = DESTINATIONS.find((item) => item.match.some((token) => haystack.includes(token)))
  if (found) return found.to
  if (route.includes('coming-soon')) return '/institute/dashboard'
  return action?.route || '/institute/dashboard'
}

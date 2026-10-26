export const PLATFORM_SHELL_PREFIXES = [
  '/fleet',
  '/governance',
  '/observability',
  '/ai',
  '/deployments',
  '/apps',
  '/incidents',
  '/admin/',
  '/automation',
  '/communications',
  '/hmo'
]

export function isPlatformShellPath(pathname = '') {
  const pathLower = String(pathname || '').toLowerCase()
  return pathLower === '/admin' || PLATFORM_SHELL_PREFIXES.some((prefix) => pathLower.startsWith(prefix))
}

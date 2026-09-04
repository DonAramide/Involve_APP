/**
 * Resolve which login portal to use based on current path / role.
 */
export function isTenantSurfacePath(pathname = '') {
  const p = String(pathname || '').toLowerCase()
  return (
    p.startsWith('/tenant') ||
    p.startsWith('/teacher-workspace') ||
    p === '/tenant/login'
  )
}

const PLATFORM_STAFF_ROLES = [
  'SUPER_ADMIN',
  'STAFF',
  'ADMIN_FINANCE',
  'ADMIN_TREASURY',
  'ADMIN_RISK',
  'ADMIN_OPS',
  'ADMIN_EXECUTIVE',
  'ADMIN_DEPLOY'
]

const GUEST_OR_PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/admin/login',
  '/tenant/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/mfa/challenge'
])

export function hasPlatformStaffRole(roleStr) {
  const roles = String(roleStr || '')
    .split(',')
    .map((r) => r.trim().toUpperCase().replace(/-/g, '_'))
    .filter(Boolean)
  return roles.some((r) => PLATFORM_STAFF_ROLES.includes(r))
}

export function homePathForRole(roleStr) {
  return hasPlatformStaffRole(roleStr) ? '/fleet/overview' : '/tenant/dashboard'
}

export function resolvePostAuthRedirect(roleStr, redirect) {
  const home = homePathForRole(roleStr)
  if (!redirect || typeof redirect !== 'string') return home
  const path = redirect.split('?')[0]
  if (GUEST_OR_PUBLIC_PATHS.has(path) || path.startsWith('/mfa/')) return home
  return redirect
}

export function loginPathForContext({ pathname, role } = {}) {
  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
  if (String(path || '').toLowerCase().startsWith('/agent')) return '/agent/login'
  if (isTenantSurfacePath(path)) return '/tenant/login'

  const roleStr = String(role || (typeof localStorage !== 'undefined' ? localStorage.getItem('operator_role') : '') || '')
  if (roleStr && !hasPlatformStaffRole(roleStr)) {
    return '/tenant/login'
  }
  return '/admin/login'
}

export const ADMIN_LOGIN_PATH = '/admin/login'
export const TENANT_LOGIN_PATH = '/tenant/login'

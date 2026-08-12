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

export function loginPathForContext({ pathname, role } = {}) {
  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
  if (isTenantSurfacePath(path)) return '/tenant/login'

  const roleStr = String(role || (typeof localStorage !== 'undefined' ? localStorage.getItem('operator_role') : '') || '')
  const roles = roleStr.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean)
  const platformStaff = [
    'SUPER_ADMIN',
    'STAFF',
    'ADMIN_FINANCE',
    'ADMIN_TREASURY',
    'ADMIN_RISK',
    'ADMIN_OPS',
    'ADMIN_EXECUTIVE',
    'ADMIN_DEPLOY'
  ]
  if (roles.length && !roles.some((r) => platformStaff.includes(r))) {
    return '/tenant/login'
  }
  return '/admin/login'
}

export const ADMIN_LOGIN_PATH = '/admin/login'
export const TENANT_LOGIN_PATH = '/tenant/login'

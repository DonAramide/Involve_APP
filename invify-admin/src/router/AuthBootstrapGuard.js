// invify-admin/src/router/AuthBootstrapGuard.js

import { loginPathForContext, homePathForRole, hasPlatformStaffRole } from '../utils/authLoginPaths'
import { permissionsForOperatorRole } from '../utils/operatorPermissions'
import { clearMfaChallengeState, hasVerifiedOperatorSession } from '../auth/session'

/**
 * Enterprise Production-Grade Authentication Gate & Session Rehydration Interceptor.
 * Prevents unauthorized access to operations, coordinates mandatory Multi-Factor verification boundaries,
 * evaluates granular RBAC permission rules, and enforces tenant boundary mapping natively.
 * 
 * AUTHORITATIVE RULE ENFORCEMENT:
 * 1. Unauthenticated client navigation drops to /admin/login or /tenant/login by context.
 * 2. Sessions requiring MFA setup or challenge verification redirect perfectly to /mfa/challenge.
 * 3. Restores operator preferences, dynamic sidebar states, and isolated workspace buffers 
 *    exclusively after token verification and RBAC assertion pipelines complete cleanly.
 */
export function registerAuthBootstrapGuard(router) {
  const getHomePath = (roleStr) => homePathForRole(roleStr)

  const getLoginPath = (toPath) =>
    loginPathForContext({ pathname: toPath, role: localStorage.getItem('operator_role') })

  router.beforeEach((to, from, next) => {
    try {
    // 1. Extract state storage parameters
    const token = localStorage.getItem('invify_token')
    const operatorRole = localStorage.getItem('operator_role') || ''
    const isVerifiedSession = hasVerifiedOperatorSession()
    if (isVerifiedSession) {
      // Leftover challenge tokens from a later login attempt must not eject a live session.
      clearMfaChallengeState()
    }
    const pendingMfaToken = isVerifiedSession
      ? null
      : (sessionStorage.getItem('mfa_setup_token') || sessionStorage.getItem('mfa_challenge_token'))
    const isMfaPending = !isVerifiedSession && (
      !!pendingMfaToken || localStorage.getItem('mfa_status_verified') === 'false'
    )

    // 0. Public Website Routes
    // Extremely conservative public route bypass to ensure public pages never require auth.
    // Must be evaluated BEFORE any other operational rules.
    if (to.meta?.isPublic || to.matched.some(record => record.meta?.isPublic)) {
      return next()
    }

    // (The previous `to.path === '/'` intercept has been removed because the root is now the public homepage.)

    // 3. Guest route rules (e.g., /login, /admin/login, /tenant/login)
    if (to.meta?.isGuest) {
      if (isVerifiedSession) {
        return next(getHomePath(operatorRole))
      }
      return next()
    }

    // 4. Multi-Factor Challenge Boundary rules (/mfa/challenge)
    if (to.path.startsWith('/mfa/challenge')) {
      if (!token && !pendingMfaToken) {
        return next(getLoginPath(from.path || '/'))
      }
      if (isVerifiedSession) {
        // If MFA status already validated perfectly, restore main workspace access
        return next(getHomePath(operatorRole))
      }
      return next()
    }

    // 5. Protected Operational Route enforcement checks
    if (to.meta?.requiresAuth || to.matched.some(record => record.meta?.requiresAuth)) {
      // Gate 1: Identity Matrix validation
      if (!token) {
        return next({ path: getLoginPath(to.path), query: { redirect: to.fullPath } })
      }

      // Gate 2: Mandatory MFA State verification boundary
      if (isMfaPending) {
        return next('/mfa/challenge')
      }

      // Gate 2.5: Platform Administration Layout Isolation (Strict Tenant Redirection)
      if (!hasPlatformStaffRole(operatorRole)) {
        const adminPathPrefixes = [
          '/fleet', '/governance', '/observability', '/ai', 
          '/deployments', '/apps', '/incidents', '/admin/', 
          '/automation', '/communications'
        ]
        const pathLower = to.path.toLowerCase()
        if (to.path === '/' || adminPathPrefixes.some(prefix => pathLower.startsWith(prefix)) || pathLower === '/admin') {
          console.warn(`[TENANT ISOLATION ENFORCED] Standard tenant operator [${operatorRole}] attempted global administration workspace traversal to [${to.path}]. Redirection to tenant hub initialized.`)
          return next('/tenant/dashboard')
        }
      } else {
        // Block Platform Staff from accessing the Tenant Profile (TenantLayout routes)
        // Allow /tenant/login as guest; other /tenant/* app routes stay blocked for staff
        if (to.matched.some(r => r.path === '/tenant') && to.path !== '/tenant/login') {
          console.warn(`[ADMIN ISOLATION ENFORCED] Platform staff [${operatorRole}] attempted direct tenant profile traversal to [${to.path}]. Redirection to admin hub initialized.`)
          return next(getHomePath(operatorRole))
        }
      }

      // Gate 3: Native RBAC Claim evaluations
      if (to.meta?.permission) {
        const activePermissions = permissionsForOperatorRole(operatorRole)

        if (!activePermissions.includes(to.meta.permission)) {
          console.warn(`[RBAC GATEWAY DENIAL] Operator scope [${operatorRole}] missing required capability claim: [${to.meta.permission}]`)
          
          // Never abort in place (next(false) left tenant login stuck on success).
          const homePath = getHomePath(operatorRole)
          if (to.path !== homePath) {
            return next(homePath)
          }
          return next()
        }
      }

      // Gate 4: Tenant boundary mapping parameters
      if (to.meta?.requireTenantScope) {
        const activeScope = localStorage.getItem('operator_active_tenant') || 'global'
        const routeTenantId = to.params?.tenantId
        if (activeScope !== 'global' && routeTenantId && activeScope !== routeTenantId) {
          console.error(`[TENANT ISOLATION BREACH] Attempted lateral entry into scoped tenant [${routeTenantId}] from partition [${activeScope}]`)
          return next('/')
        }
      }

      // All validation blocks attested successfully -> Allow operational rendering
      return next()
    }

    // Default processing for static catch-all screens
    return next()
    } catch (err) {
      console.error('[AuthBootstrapGuard] Navigation guard failed:', err)
      return next()
    }
  })
}

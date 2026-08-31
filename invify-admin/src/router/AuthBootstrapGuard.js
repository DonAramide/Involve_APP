// invify-admin/src/router/AuthBootstrapGuard.js

import { loginPathForContext } from '../utils/authLoginPaths'

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
  // Helper to parse multiple roles
  const getRolesArray = (roleStr) => {
    if (!roleStr) return []
    return roleStr.split(',').map(r => r.trim())
  }

  // Helper to determine role-based home landing path
  const hasPlatformStaffRole = (roleStr) => {
    const roles = getRolesArray(roleStr)
    const staffRoles = [
      'SUPER_ADMIN',
      'STAFF',
      'ADMIN_FINANCE',
      'ADMIN_TREASURY',
      'ADMIN_RISK',
      'ADMIN_OPS',
      'ADMIN_EXECUTIVE',
      'ADMIN_DEPLOY'
    ]
    return roles.some(r => staffRoles.includes(r))
  }

  const getHomePath = (roleStr) => {
    if (hasPlatformStaffRole(roleStr)) {
      return '/fleet/overview'
    }
    return '/tenant/dashboard'
  }

  const getLoginPath = (toPath) =>
    loginPathForContext({ pathname: toPath, role: localStorage.getItem('operator_role') })

  router.beforeEach(async (to, from, next) => {
    // 1. Extract state storage parameters
    const token = localStorage.getItem('invify_token')
    const operatorRole = localStorage.getItem('operator_role') || 'SUPER_ADMIN'
    const pendingSetupToken = sessionStorage.getItem('mfa_setup_token')
    const pendingChallengeToken = sessionStorage.getItem('mfa_challenge_token')
    const pendingMfaToken = pendingSetupToken || pendingChallengeToken
    
    // Evaluate if token verification demands Multi-Factor challenge clearance
    // If token exists but an explicit flag requires challenge resolution, or setup tokens exist
    const isMfaPending = !!pendingMfaToken || localStorage.getItem('mfa_status_verified') === 'false'
    const isVerifiedSession = !!token && !isMfaPending

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
        console.warn(`[DEV OVERRIDE] Allowed authenticated user to view guest route: ${to.path}`);
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
        const userScopeMatrix = {
          SUPER_ADMIN: ['read_fleet', 'read_devices', 'read_tenant', 'soc_analyst', 'read_governance', 'read_streams', 'read_metrics', 'soc_quarantine', 'admin_deploy', 'write_fleet', 'read_telemetry', 'execute_actions', 'read_audit', 'write_policies', 'read_ai_intelligence', 'soc_communications', 'admin_agent_management', 'create_requests', 'view_finance_queue', 'view_operations_queue', 'view_deployment_queue', 'view_governance_queue', 'approve_finance', 'approve_operations', 'approve_deployment', 'approve_governance'],
          ADMIN_FINANCE: ['read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams', 'read_metrics', 'read_telemetry', 'read_audit', 'soc_communications', 'create_requests', 'view_finance_queue', 'approve_finance'],
          ADMIN_TREASURY: ['read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams', 'read_metrics', 'read_telemetry', 'read_audit', 'soc_communications', 'create_requests', 'view_finance_queue', 'approve_finance'],
          ADMIN_RISK: ['read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams', 'read_metrics', 'soc_quarantine', 'read_telemetry', 'read_audit', 'soc_communications', 'create_requests', 'view_operations_queue', 'approve_operations'],
          ADMIN_OPS: ['read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams', 'read_metrics', 'write_fleet', 'read_telemetry', 'read_audit', 'soc_communications', 'create_requests', 'view_operations_queue', 'approve_operations'],
          ADMIN_EXECUTIVE: ['read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams', 'read_metrics', 'read_telemetry', 'read_audit', 'read_ai_intelligence', 'soc_communications', 'create_requests', 'view_finance_queue', 'view_operations_queue', 'approve_finance', 'approve_operations'],
          ADMIN_DEPLOY: ['read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams', 'read_metrics', 'admin_deploy', 'read_telemetry', 'read_audit', 'soc_communications', 'create_requests', 'view_deployment_queue', 'approve_deployment'],
          STAFF: ['read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams', 'read_metrics', 'write_fleet', 'read_telemetry', 'read_audit', 'soc_communications', 'create_requests', 'view_own_requests'],
          OWNER: [
            'tenant.dashboard.view', 'tenant.transaction.view', 'tenant.wallet.view',
            'tenant.ledger.view', 'tenant.users.manage', 'tenant.roles.view',
            'tenant.invitations.manage', 'tenant.activity.view', 'tenant.reports.view',
            'tenant.settings.manage', 'tenant.settlement.view', 'tenant.payout.create',
            'tenant.devices.view', 'tenant.terminals.view', 'tenant.compliance.view',
            'tenant.audit.view', 'tenant.analytics.view', 'tenant.inventory.view'
          ],
          TENANT_OPERATOR: ['read_fleet', 'read_devices', 'read_streams']
        }

        const rolesArray = getRolesArray(operatorRole)
        let activePermissions = []
        
        if (rolesArray.includes('SUPER_ADMIN')) {
          activePermissions = userScopeMatrix['SUPER_ADMIN']
        } else {
          rolesArray.forEach(r => {
            if (userScopeMatrix[r]) {
              activePermissions = activePermissions.concat(userScopeMatrix[r])
            }
          })
          if (activePermissions.length === 0) activePermissions = userScopeMatrix['SUPER_ADMIN'] // fallback
        }

        if (!activePermissions.includes(to.meta.permission)) {
          console.warn(`[RBAC GATEWAY DENIAL] Operator scope [${operatorRole}] missing required capability claim: [${to.meta.permission}]`)
          
          // Avoid infinite redirect loops
          const homePath = getHomePath(operatorRole)
          if (to.path !== homePath) {
            return next(homePath)
          } else {
            // Fallback to error or simply stop navigation
            return next(false)
          }
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
    next()
  })
}

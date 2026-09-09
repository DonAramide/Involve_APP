/**
 * Route-gate capabilities for operator roles. Tenant admins historically
 * fell through to SUPER_ADMIN permissions, which do not include
 * tenant.dashboard.view — Vue Router then aborted and left login stuck on
 * "Opening your dashboard…".
 */

export const TENANT_WORKSPACE_PERMISSIONS = [
  'tenant.dashboard.view',
  'tenant.transaction.view',
  'tenant.wallet.view',
  'tenant.ledger.view',
  'tenant.users.manage',
  'tenant.roles.view',
  'tenant.invitations.manage',
  'tenant.activity.view',
  'tenant.reports.view',
  'tenant.settings.manage',
  'tenant.settlement.view',
  'tenant.payout.create',
  'tenant.devices.view',
  'tenant.terminals.view',
  'tenant.compliance.view',
  'tenant.audit.view',
  'tenant.analytics.view',
  'tenant.inventory.view',
]

const PLATFORM_SCOPE = {
  SUPER_ADMIN: [
    'read_fleet', 'read_devices', 'read_tenant', 'soc_analyst', 'read_governance',
    'read_streams', 'read_metrics', 'soc_quarantine', 'admin_deploy', 'write_fleet',
    'read_telemetry', 'execute_actions', 'read_audit', 'write_policies',
    'read_ai_intelligence', 'soc_communications', 'admin_agent_management',
    'create_requests', 'view_finance_queue', 'view_operations_queue',
    'view_deployment_queue', 'view_governance_queue', 'approve_finance',
    'approve_operations', 'approve_deployment', 'approve_governance',
  ],
  ADMIN_FINANCE: [
    'read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams',
    'read_metrics', 'read_telemetry', 'read_audit', 'soc_communications',
    'create_requests', 'view_finance_queue', 'approve_finance',
  ],
  ADMIN_TREASURY: [
    'read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams',
    'read_metrics', 'read_telemetry', 'read_audit', 'soc_communications',
    'create_requests', 'view_finance_queue', 'approve_finance',
  ],
  ADMIN_RISK: [
    'read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams',
    'read_metrics', 'soc_quarantine', 'read_telemetry', 'read_audit',
    'soc_communications', 'create_requests', 'view_operations_queue', 'approve_operations',
  ],
  ADMIN_OPS: [
    'read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams',
    'read_metrics', 'write_fleet', 'read_telemetry', 'read_audit', 'soc_communications',
    'create_requests', 'view_operations_queue', 'approve_operations',
  ],
  ADMIN_EXECUTIVE: [
    'read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams',
    'read_metrics', 'read_telemetry', 'read_audit', 'read_ai_intelligence',
    'soc_communications', 'create_requests', 'view_finance_queue',
    'view_operations_queue', 'approve_finance', 'approve_operations',
  ],
  ADMIN_DEPLOY: [
    'read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams',
    'read_metrics', 'admin_deploy', 'read_telemetry', 'read_audit',
    'soc_communications', 'create_requests', 'view_deployment_queue', 'approve_deployment',
  ],
  STAFF: [
    'read_fleet', 'read_devices', 'read_tenant', 'read_governance', 'read_streams',
    'read_metrics', 'write_fleet', 'read_telemetry', 'read_audit', 'soc_communications',
    'create_requests', 'view_own_requests',
  ],
}

const TENANT_ROLE_ALIASES = new Set([
  'OWNER',
  'TENANT_ADMIN',
  'ADMIN',
  'TENANT_OPERATOR',
  'CASHIER',
  'FINANCE_STAFF',
  'TEACHER',
])

function normalizeRoles(roleStr) {
  return String(roleStr || '')
    .split(',')
    .map((r) => r.trim().toUpperCase().replace(/-/g, '_'))
    .filter(Boolean)
}

export function permissionsForOperatorRole(roleStr) {
  const roles = normalizeRoles(roleStr)
  if (roles.includes('SUPER_ADMIN')) {
    return PLATFORM_SCOPE.SUPER_ADMIN
  }

  const collected = []
  roles.forEach((role) => {
    if (PLATFORM_SCOPE[role]) {
      collected.push(...PLATFORM_SCOPE[role])
    } else if (TENANT_ROLE_ALIASES.has(role)) {
      collected.push(...TENANT_WORKSPACE_PERMISSIONS)
    }
  })

  if (collected.length > 0) return collected
  return TENANT_WORKSPACE_PERMISSIONS
}

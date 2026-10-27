/** Top-level HMO workspace. These routes are not children of Administration. */

export const HMO_WORKSPACE_PERMISSION = 'hmo.workspace'

export const HMO_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', path: '/hmo/overview', icon: 'dashboard', section: 'Overview' },
  { id: 'registry', label: 'HMO Registry', path: '/hmo/registry', icon: 'corporate_fare', section: 'Registry' },
  { id: 'providers', label: 'Provider Network', path: '/hmo/providers', icon: 'local_hospital', section: 'Providers' },
  { id: 'plans', label: 'Health Plans', path: '/hmo/plans', icon: 'inventory_2', section: 'Plans' },
  { id: 'coverage', label: 'Benefits and Coverage', path: '/hmo/coverage', icon: 'verified_user', section: 'Coverage' },
  { id: 'enrolment', label: 'Member Enrolment', path: '/hmo/enrolment', icon: 'how_to_reg', section: 'Enrolment' },
  { id: 'members', label: 'Members and Dependants', path: '/hmo/members', icon: 'groups', section: 'Members' },
  { id: 'claims', label: 'Claims and Authorisations', path: '/hmo/claims', icon: 'assignment', section: 'Claims' },
  { id: 'billing', label: 'Premiums and Billing', path: '/hmo/billing', icon: 'receipt_long', section: 'Billing' },
  { id: 'payments', label: 'Payments and Reconciliation', path: '/hmo/payments', icon: 'payments', section: 'Payments' },
  { id: 'reports', label: 'Reports and Analytics', path: '/hmo/reports', icon: 'insights', section: 'Reports' },
  { id: 'telemetry', label: 'Integrations and Telemetry', path: '/hmo/telemetry', icon: 'hub', section: 'Telemetry' },
  { id: 'audit', label: 'Audit Trail', path: '/hmo/audit', icon: 'history', section: 'Audit' },
  { id: 'settings', label: 'HMO Organisation Settings', path: '/hmo/settings', icon: 'tune', section: 'Settings' },
  { id: 'governance', label: 'Platform Governance', path: '/hmo/governance', icon: 'admin_panel_settings', section: 'Governance' }
]

export function hmoItemForPath(path) {
  return HMO_NAV_ITEMS.find((item) => item.path === path) || HMO_NAV_ITEMS[0]
}

export function isAdministrationChild(path) {
  return String(path || '').startsWith('/admin')
}

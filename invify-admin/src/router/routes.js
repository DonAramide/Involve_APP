// invify-admin/src/router/routes.js

/**
 * Enterprise operational infrastructure routing incorporating multi-tenant isolation boundaries.
 * Enforces explicit static path definitions alongside tenant-scoped sub-route parameters
 * to prevent unauthorized horizontal navigation and guarantee clean lazy loading.
 */
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/fleet/overview' },

      // ==========================================
      // PRIORITY WORKSPACE 1: FLEET OPERATIONS
      // ==========================================
      { 
        path: 'fleet/overview', 
        component: () => import('pages/fleet/FleetOverviewPage.vue'),
        meta: { title: 'Fleet Overview', workspace: 'fleet', permission: 'read_fleet' }
      },
      { 
        path: 'fleet/devices', 
        component: () => import('pages/fleet/DeviceExplorerPage.vue'),
        meta: { title: 'Device Explorer', workspace: 'fleet', permission: 'read_devices' }
      },
      // Tenant-aware specific routing parameters ensuring early isolation mapping
      { 
        path: 'tenant/:tenantId/fleet/devices', 
        component: () => import('pages/fleet/DeviceExplorerPage.vue'),
        meta: { title: 'Scoped Tenant Devices', workspace: 'fleet', permission: 'read_devices', requireTenantScope: true }
      },
      { 
        path: 'fleet/presence', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Live Presence Map', workspace: 'fleet', permission: 'read_fleet' }
      },
      { 
        path: 'fleet/groups', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Device Groups', workspace: 'fleet', permission: 'read_fleet' }
      },
      { 
        path: 'fleet/enrollment', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Enrollment Pipelines', workspace: 'fleet', permission: 'write_fleet' }
      },
      { 
        path: 'fleet/telemetry', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Fleet Telemetry Grid', workspace: 'fleet', permission: 'read_telemetry' }
      },
      { 
        path: 'fleet/actions', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Remote Action Triggers', workspace: 'fleet', permission: 'execute_actions' }
      },

      // ==========================================
      // PRIORITY WORKSPACE 2: GOVERNANCE
      // ==========================================
      { 
        path: 'governance/compliance', 
        component: () => import('pages/governance/ComplianceCenterPage.vue'),
        meta: { title: 'Compliance Center', workspace: 'governance', permission: 'read_governance' }
      },
      { 
        path: 'tenant/:tenantId/governance/compliance', 
        component: () => import('pages/governance/ComplianceCenterPage.vue'),
        meta: { title: 'Tenant Compliance Scope', workspace: 'governance', permission: 'read_governance', requireTenantScope: true }
      },
      { 
        path: 'governance/policy', 
        component: () => import('pages/governance/PolicyGovernancePage.vue'),
        meta: { title: 'Policy Governance', workspace: 'governance', permission: 'write_policies' }
      },
      { 
        path: 'governance/integrity', 
        component: () => import('pages/governance/IntegrityCenterPage.vue'),
        meta: { title: 'Integrity Center', workspace: 'governance', permission: 'read_governance' }
      },
      { 
        path: 'governance/trust', 
        component: () => import('pages/governance/IntegrityCenterPage.vue'),
        meta: { title: 'Trust Scoring', workspace: 'governance', permission: 'read_governance' }
      },
      { 
        path: 'governance/quarantine', 
        component: () => import('pages/governance/QuarantineCenterPage.vue'),
        meta: { title: 'Quarantine Center', workspace: 'governance', permission: 'soc_quarantine' }
      },
      { 
        path: 'governance/drift', 
        component: () => import('pages/governance/ComplianceCenterPage.vue'),
        meta: { title: 'Drift Analysis', workspace: 'governance', permission: 'read_governance' }
      },

      // ==========================================
      // PRIORITY WORKSPACE 3: OBSERVABILITY
      // ==========================================
      { 
        path: 'observability/streams', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Event Streams', workspace: 'observability', permission: 'read_streams' }
      },
      { 
        path: 'observability/metrics', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Telemetry Metrics', workspace: 'observability', permission: 'read_metrics' }
      },
      { 
        path: 'observability/queues', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Queue Health', workspace: 'observability', permission: 'read_streams' }
      },
      { 
        path: 'observability/websocket-health', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'WebSocket Health', workspace: 'observability', permission: 'read_streams' }
      },
      { 
        path: 'observability/audit', 
        component: () => import('pages/LedgerPage.vue'),
        meta: { title: 'Audit Logs', workspace: 'observability', permission: 'read_audit' }
      },
      { 
        path: 'observability/pipelines', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Ingestion Pipelines', workspace: 'observability', permission: 'read_streams' }
      },

      // ==========================================
      // LIGHTWEIGHT AUXILIARY WORKSPACES
      // ==========================================
      { path: 'deployments/rollouts', component: () => import('pages/deployments/RolloutControlCenterPage.vue'), meta: { workspace: 'deployments', title: 'Rollout Control Center' } },
      { path: 'deployments/channels', component: () => import('pages/deployments/ReleaseChannelsPage.vue'), meta: { workspace: 'deployments', title: 'Release Channels' } },
      { path: 'apps/installed', component: () => import('pages/applications/InstalledApplicationsPage.vue'), meta: { workspace: 'apps', title: 'Installed Applications' } },
      { path: 'apps/forbidden', component: () => import('pages/applications/ForbiddenApplicationsPage.vue'), meta: { workspace: 'apps', title: 'Forbidden Applications' } },
      { path: 'apps/accessibility', component: () => import('pages/applications/AccessibilityAbusePage.vue'), meta: { workspace: 'apps', title: 'Accessibility Abuse' } },
      { path: 'apps/sideload', component: () => import('pages/applications/SideloadIntegrityPage.vue'), meta: { workspace: 'apps', title: 'Sideload & Integrity' } },
      { path: 'incidents/active', component: () => import('pages/DashboardPage.vue'), meta: { workspace: 'incidents', title: 'Active Incidents' } },
      { path: 'admin/tenants', component: () => import('pages/TenantsPage.vue'), meta: { workspace: 'admin', title: 'Tenants' } },
      { path: 'admin/users', component: () => import('pages/UsersPage.vue'), meta: { workspace: 'admin', title: 'Operators' } },
      { path: 'admin/settings', component: () => import('pages/IndexPage.vue'), meta: { workspace: 'admin', title: 'Global Settings' } },
      { path: 'automation/policy', component: () => import('pages/automation/PolicyIntelligencePage.vue'), meta: { workspace: 'automation', title: 'Policy Intelligence' } },
      { path: 'automation/workflows', component: () => import('pages/automation/WorkflowExecutionCenterPage.vue'), meta: { workspace: 'automation', title: 'Workflow Execution & Audit' } },

      // ==========================================
      // LEGACY ROOTS & BACKWARD COMPATIBILITY
      // ==========================================
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'tenants', component: () => import('pages/TenantsPage.vue') },
      { path: 'tenants/:id', component: () => import('pages/TenantDetailPage.vue') },
      { path: 'ledger', component: () => import('pages/LedgerPage.vue') },
      { path: 'wallet', component: () => import('pages/WalletPage.vue') },
      { path: 'payments', component: () => import('pages/PaymentsPage.vue') },
      { path: 'reconciliation', component: () => import('pages/ReconciliationPage.vue') },
      { path: 'users', component: () => import('pages/UsersPage.vue') },
      { path: 'curriculum', component: () => import('pages/CurriculumPage.vue') },
      { path: 'notes', component: () => import('pages/LessonNotePage.vue') },
      { path: 'ai-usage', component: () => import('pages/AnalyticsPage.vue') },
      { path: 'devices', component: () => import('pages/DeviceActivationPage.vue') },
      
      { path: 'teacher-workspace', component: () => import('pages/TeacherDashboardPage.vue') },
      { path: 'onboarding', component: () => import('pages/OnboardingFlow.vue') },
      { path: 'invite/accept', component: () => import('pages/AcceptInvitePage.vue') },
      
      { path: 'analytics', component: () => import('pages/AnalyticsPage.vue') },
      { path: 'referrals', component: () => import('pages/ReferralPage.vue') },
      { path: 'attendance', component: () => import('pages/AttendancePage.vue') },
      { path: 'attendance-history', component: () => import('pages/AttendancePage.vue') },
      { path: 'billing', component: () => import('pages/BillingPage.vue') },
      { path: 'settings', component: () => import('pages/IndexPage.vue') }
    ]
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes

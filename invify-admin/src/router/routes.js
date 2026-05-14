// invify-admin/src/router/routes.js

/**
 * Enterprise operational infrastructure routing incorporating multi-tenant isolation boundaries.
 * Enforces explicit static path definitions alongside tenant-scoped sub-route parameters
 * to prevent unauthorized horizontal navigation and guarantee clean lazy loading.
 * 
 * FINAL REFINEMENT #1: Eliminated hardcoded unauthenticated root redirects.
 * All operational routes enforce requiresAuth declarative properties natively.
 */
const routes = [
  // ==========================================
  // TOP-LEVEL AUTHENTICATION GATEWAY ROOTS
  // ==========================================
  {
    path: '/login',
    component: () => import('pages/governance/LoginPage.vue'),
    meta: { isGuest: true, title: 'Enterprise Portal Login' }
  },
  {
    path: '/mfa/challenge',
    component: () => import('pages/governance/MFAChallengePage.vue'),
    meta: { requiresAuth: true, isMfaPendingAllowed: true, title: 'Multi-Factor Gateway' }
  },

  // Master layout bounding verified workspace shells
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      // Direct root fallback handled dynamically by our enterprise router middleware guard
      { 
        path: '', 
        component: () => import('pages/fleet/FleetOverviewPage.vue'),
        meta: { title: 'Fleet Overview', workspace: 'fleet', permission: 'read_fleet', requiresAuth: true }
      },

      // ==========================================
      // PRIORITY WORKSPACE 1: FLEET OPERATIONS
      // ==========================================
      { 
        path: 'fleet/overview', 
        component: () => import('pages/fleet/FleetOverviewPage.vue'),
        meta: { title: 'Fleet Overview', workspace: 'fleet', permission: 'read_fleet', requiresAuth: true }
      },
      { 
        path: 'fleet/devices', 
        component: () => import('pages/fleet/DeviceExplorerPage.vue'),
        meta: { title: 'Device Explorer', workspace: 'fleet', permission: 'read_devices', requiresAuth: true }
      },
      // Tenant-aware specific routing parameters ensuring early isolation mapping
      { 
        path: 'tenant/:tenantId/fleet/devices', 
        component: () => import('pages/fleet/DeviceExplorerPage.vue'),
        meta: { title: 'Scoped Tenant Devices', workspace: 'fleet', permission: 'read_devices', requireTenantScope: true, requiresAuth: true }
      },
      { 
        path: 'fleet/presence', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Live Presence Map', workspace: 'fleet', permission: 'read_fleet', requiresAuth: true }
      },
      { 
        path: 'fleet/groups', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Device Groups', workspace: 'fleet', permission: 'read_fleet', requiresAuth: true }
      },
      { 
        path: 'fleet/enrollment', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Enrollment Pipelines', workspace: 'fleet', permission: 'write_fleet', requiresAuth: true }
      },
      { 
        path: 'fleet/telemetry', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Fleet Telemetry Grid', workspace: 'fleet', permission: 'read_telemetry', requiresAuth: true }
      },
      { 
        path: 'fleet/actions', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Remote Action Triggers', workspace: 'fleet', permission: 'execute_actions', requiresAuth: true }
      },

      // ==========================================
      // PRIORITY WORKSPACE 2: GOVERNANCE
      // ==========================================
      // Backward compatibility bindings routing directly to top-level canonical pages
      { 
        path: 'governance/login', 
        redirect: '/login'
      },
      { 
        path: 'governance/mfa-challenge', 
        redirect: '/mfa/challenge'
      },
      { 
        path: 'governance/operators', 
        component: () => import('pages/governance/OperatorManagementPage.vue'),
        meta: { title: 'Operator Management', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/rbac-roles', 
        component: () => import('pages/governance/RolesPermissionsPage.vue'),
        meta: { title: 'Roles & Capabilities', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/sessions', 
        component: () => import('pages/governance/SessionGovernancePage.vue'),
        meta: { title: 'Session Oversight', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/tenants-elevation', 
        component: () => import('pages/governance/TenantManagementPage.vue'),
        meta: { title: 'Tenants Access & Elevation', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/audit-trail', 
        component: () => import('pages/governance/AuditTrailPage.vue'),
        meta: { title: 'Immutable Audit Lineage', workspace: 'governance', permission: 'read_audit', requiresAuth: true }
      },
      { 
        path: 'governance/compliance', 
        component: () => import('pages/governance/ComplianceCenterPage.vue'),
        meta: { title: 'Compliance Center', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'tenant/:tenantId/governance/compliance', 
        component: () => import('pages/governance/ComplianceCenterPage.vue'),
        meta: { title: 'Tenant Compliance Scope', workspace: 'governance', permission: 'read_governance', requireTenantScope: true, requiresAuth: true }
      },
      { 
        path: 'governance/policy', 
        component: () => import('pages/governance/PolicyGovernancePage.vue'),
        meta: { title: 'Policy Governance', workspace: 'governance', permission: 'write_policies', requiresAuth: true }
      },
      { 
        path: 'governance/integrity', 
        component: () => import('pages/governance/IntegrityCenterPage.vue'),
        meta: { title: 'Integrity Center', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/trust', 
        component: () => import('pages/governance/IntegrityCenterPage.vue'),
        meta: { title: 'Trust Scoring', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/quarantine', 
        component: () => import('pages/governance/QuarantineCenterPage.vue'),
        meta: { title: 'Quarantine Center', workspace: 'governance', permission: 'soc_quarantine', requiresAuth: true }
      },
      { 
        path: 'governance/drift', 
        component: () => import('pages/governance/ComplianceCenterPage.vue'),
        meta: { title: 'Drift Analysis', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },

      // ==========================================
      // PRIORITY WORKSPACE 3: OBSERVABILITY
      // ==========================================
      { 
        path: 'observability/streams', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Event Streams', workspace: 'observability', permission: 'read_streams', requiresAuth: true }
      },
      { 
        path: 'observability/metrics', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Telemetry Metrics', workspace: 'observability', permission: 'read_metrics', requiresAuth: true }
      },
      { 
        path: 'observability/queues', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Queue Health', workspace: 'observability', permission: 'read_streams', requiresAuth: true }
      },
      { 
        path: 'observability/websocket-health', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'WebSocket Health', workspace: 'observability', permission: 'read_streams', requiresAuth: true }
      },
      { 
        path: 'observability/audit', 
        component: () => import('pages/LedgerPage.vue'),
        meta: { title: 'Audit Logs', workspace: 'observability', permission: 'read_audit', requiresAuth: true }
      },
      { 
        path: 'observability/pipelines', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Ingestion Pipelines', workspace: 'observability', permission: 'read_streams', requiresAuth: true }
      },

      // ==========================================
      // PRIORITY WORKSPACE 4: AI OPERATIONAL INTELLIGENCE
      // ==========================================
      { 
        path: 'ai/copilot', 
        component: () => import('pages/ai/AIOperationsCopilotPage.vue'),
        meta: { title: 'AI Operational Copilot', workspace: 'ai', permission: 'read_ai_intelligence', requiresAuth: true }
      },

      // ==========================================
      // LIGHTWEIGHT AUXILIARY WORKSPACES
      // ==========================================
      { path: 'deployments/rollouts', component: () => import('pages/deployments/RolloutControlCenterPage.vue'), meta: { workspace: 'deployments', title: 'Rollout Control Center', requiresAuth: true } },
      { path: 'deployments/channels', component: () => import('pages/deployments/ReleaseChannelsPage.vue'), meta: { workspace: 'deployments', title: 'Release Channels', requiresAuth: true } },
      { path: 'apps/installed', component: () => import('pages/applications/InstalledApplicationsPage.vue'), meta: { workspace: 'apps', title: 'Installed Applications', requiresAuth: true } },
      { path: 'apps/forbidden', component: () => import('pages/applications/ForbiddenApplicationsPage.vue'), meta: { workspace: 'apps', title: 'Forbidden Applications', requiresAuth: true } },
      { path: 'apps/accessibility', component: () => import('pages/applications/AccessibilityAbusePage.vue'), meta: { workspace: 'apps', title: 'Accessibility Abuse', requiresAuth: true } },
      { path: 'apps/sideload', component: () => import('pages/applications/SideloadIntegrityPage.vue'), meta: { workspace: 'apps', title: 'Sideload & Integrity', requiresAuth: true } },
      { path: 'incidents/active', component: () => import('pages/DashboardPage.vue'), meta: { workspace: 'incidents', title: 'Active Incidents', requiresAuth: true } },
      { path: 'admin/tenants', component: () => import('pages/TenantsPage.vue'), meta: { workspace: 'admin', title: 'Tenants', requiresAuth: true } },
      { path: 'admin/users', component: () => import('pages/UsersPage.vue'), meta: { workspace: 'admin', title: 'Operators', requiresAuth: true } },
      { path: 'admin/settings', component: () => import('pages/IndexPage.vue'), meta: { workspace: 'admin', title: 'Global Settings', requiresAuth: true } },
      { path: 'admin/orchestration', component: () => import('pages/admin/TenantOrchestrationCenterPage.vue'), meta: { workspace: 'admin', title: 'Tenant Orchestration', requiresAuth: true } },
      { path: 'automation/policy', component: () => import('pages/automation/PolicyIntelligencePage.vue'), meta: { workspace: 'automation', title: 'Policy Intelligence', requiresAuth: true } },
      { path: 'automation/workflows', component: () => import('pages/automation/WorkflowExecutionCenterPage.vue'), meta: { workspace: 'automation', title: 'Workflow Execution & Audit', requiresAuth: true } },
      { path: 'communications/broadcast-center', component: () => import('pages/communications/BroadcastCenterPage.vue'), meta: { workspace: 'communications', title: 'Enterprise Broadcast Center', permission: 'soc_communications', requiresAuth: true } },

      // ==========================================
      // LEGACY ROOTS & BACKWARD COMPATIBILITY
      // ==========================================
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue'), meta: { requiresAuth: true } },
      { path: 'tenants', component: () => import('pages/TenantsPage.vue'), meta: { requiresAuth: true } },
      { path: 'tenants/:id', component: () => import('pages/TenantDetailPage.vue'), meta: { requiresAuth: true } },
      { path: 'ledger', component: () => import('pages/LedgerPage.vue'), meta: { requiresAuth: true } },
      { path: 'wallet', component: () => import('pages/WalletPage.vue'), meta: { requiresAuth: true } },
      { path: 'payments', component: () => import('pages/PaymentsPage.vue'), meta: { requiresAuth: true } },
      { path: 'reconciliation', component: () => import('pages/ReconciliationPage.vue'), meta: { requiresAuth: true } },
      { path: 'users', component: () => import('pages/UsersPage.vue'), meta: { requiresAuth: true } },
      { path: 'curriculum', component: () => import('pages/CurriculumPage.vue'), meta: { requiresAuth: true } },
      { path: 'notes', component: () => import('pages/LessonNotePage.vue'), meta: { requiresAuth: true } },
      { path: 'ai-usage', component: () => import('pages/AnalyticsPage.vue'), meta: { requiresAuth: true } },
      { path: 'devices', component: () => import('pages/DeviceActivationPage.vue'), meta: { requiresAuth: true } },
      
      { path: 'teacher-workspace', component: () => import('pages/TeacherDashboardPage.vue'), meta: { requiresAuth: true } },
      { path: 'onboarding', component: () => import('pages/OnboardingFlow.vue'), meta: { requiresAuth: true } },
      { path: 'invite/accept', component: () => import('pages/AcceptInvitePage.vue'), meta: { requiresAuth: true } },
      
      { path: 'analytics', component: () => import('pages/AnalyticsPage.vue'), meta: { requiresAuth: true } },
      { path: 'referrals', component: () => import('pages/ReferralPage.vue'), meta: { requiresAuth: true } },
      { path: 'attendance', component: () => import('pages/AttendancePage.vue'), meta: { requiresAuth: true } },
      { path: 'attendance-history', component: () => import('pages/AttendancePage.vue'), meta: { requiresAuth: true } },
      { path: 'billing', component: () => import('pages/BillingPage.vue'), meta: { requiresAuth: true } },
      { path: 'settings', component: () => import('pages/IndexPage.vue'), meta: { requiresAuth: true } }
    ]
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes

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
  {
    path: '/onboarding',
    component: () => import('pages/OnboardingFlow.vue'),
    meta: { requiresAuth: true, title: 'Invify Onboarding' }
  },
  {
    path: '/teacher-workspace',
    component: () => import('pages/TeacherDashboardPage.vue'),
    meta: { requiresAuth: true, title: 'Teacher Workspace' }
  },
  {
    path: '/invite/accept',
    component: () => import('pages/AcceptInvitePage.vue'),
    meta: { requiresAuth: true, title: 'Accept Invite' }
  },

  // ==========================================
  // AGENT PORTAL WORKSPACE
  // ==========================================
  {
    path: '/agent',
    component: () => import('layouts/AgentLayout.vue'),
    children: [
      { path: '', redirect: '/agent/dashboard' },
      { path: 'login', component: () => import('pages/agent/AgentLoginPage.vue') },
      { path: 'dashboard', component: () => import('pages/agent/AgentDashboardPage.vue') }
    ]
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
        path: 'admin/orchestration', 
        component: () => import('pages/admin/TenantOrchestrationCenterPage.vue'),
        meta: { title: 'Tenant Orchestration', workspace: 'admin', permission: 'admin_tenant_orchestration', requiresAuth: true }
      },
      { 
        path: 'admin/agents', 
        component: () => import('pages/admin/AgentOnboardingPage.vue'),
        meta: { title: 'Agent Governance', workspace: 'admin', permission: 'admin_agent_management', requiresAuth: true }
      },
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
      { 
        path: 'fleet/terminals', 
        component: () => import('pages/terminal-management/TerminalManagementPage.vue'),
        meta: { title: 'Terminal Management Center', workspace: 'fleet', permission: 'read_devices', requiresAuth: true }
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
        path: 'governance/agents', 
        component: () => import('pages/admin/AgentGovernanceCenterPage.vue'),
        meta: { title: 'Agent Governance Center', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
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
        meta: { title: 'Tenants Access & Elevation', keywords: ['Tenant Management Page', 'Tenants', 'Identity Matrix'], workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/audit-trail', 
        component: () => import('pages/governance/AuditTrailPage.vue'),
        meta: { title: 'Immutable Audit Lineage', workspace: 'governance', permission: 'read_audit', requiresAuth: true }
      },
      { 
        path: 'governance/user-devices', 
        component: () => import('pages/governance/UserDeviceApprovalsPage.vue'),
        meta: { title: 'User Device Approvals', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/compliance', 
        component: () => import('pages/governance/ComplianceCenterPage.vue'),
        meta: { title: 'Compliance Center', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance', 
        component: () => import('pages/governance/GovernanceCommandCenter.vue'),
        meta: { title: 'Governance Command Center', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/support', 
        component: () => import('pages/governance/SupportDeskPage.vue'),
        meta: { title: 'Enterprise Support Desk', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
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
        path: 'governance/integrity-center', 
        component: () => import('pages/governance/IntegrityCenterPage.vue'),
        meta: { title: 'Platform Integrity Center', workspace: 'governance', permission: 'read_governance', requiresAuth: true, keywords: ['decay', 'stabilization', 'trust score', 'penalties'] }
      },
      { 
        path: 'governance/integrity', 
        component: () => import('pages/governance/IntegrityCenterPage.vue'),
        meta: { title: 'Platform Integrity Center', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
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
        path: 'governance/approvals', 
        component: () => import('pages/governance/GovernanceApprovalCenter.vue'),
        meta: { title: 'Approval Engine', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/drift', 
        component: () => import('pages/governance/ComplianceCenterPage.vue'),
        meta: { title: 'Drift Analysis', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'governance/sla', 
        component: () => import('pages/governance/SLACommandCenter.vue'),
        meta: { title: 'SLA Command Center', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
      },
      { 
        path: 'automation/workflows', 
        component: () => import('pages/governance/WorkflowAutomationCenter.vue'),
        meta: { title: 'Workflow Automation', workspace: 'governance', permission: 'admin_deploy', requiresAuth: true }
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
      { path: 'deployments/rollouts', component: () => import('pages/deployments/RolloutControlCenterPage.vue'), meta: { workspace: 'deployments', title: 'Rollout Control Center', permission: 'admin_deploy', requiresAuth: true, keywords: ['stabilization', 'canary', 'releases', 'versions', 'deployment'] } },
      { path: 'deployments/channels', component: () => import('pages/deployments/ReleaseChannelsPage.vue'), meta: { workspace: 'deployments', title: 'Release Channels', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/transactions', component: () => import('pages/finance/TransactionInvestigationCenterPage.vue'), meta: { workspace: 'finance', title: 'Transaction Investigation', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/ledger', component: () => import('pages/finance/GlobalLedgerPage.vue'), meta: { workspace: 'finance', title: 'Financial Ledger', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/reconciliation', component: () => import('pages/finance/ReconciliationWorkspacePage.vue'), meta: { workspace: 'finance', title: 'Reconciliation Engine', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/settlements', component: () => import('pages/finance/SettlementWorkspacePage.vue'), meta: { workspace: 'finance', title: 'Settlement Engine', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/audit', component: () => import('pages/finance/AuditWorkspacePage.vue'), meta: { workspace: 'finance', title: 'Audit Engine', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/wallets', component: () => import('pages/finance/WalletOperationsCenterPage.vue'), meta: { workspace: 'finance', title: 'Wallet Operations', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/cards', component: () => import('pages/finance/CardOperationsCenterPage.vue'), meta: { workspace: 'finance', title: 'Card Operations', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/terminals', component: () => import('pages/finance/TerminalOperationsCenterPage.vue'), meta: { workspace: 'finance', title: 'Terminal Operations', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/revenue', component: () => import('pages/finance/RevenueOperationsCenterPage.vue'), meta: { workspace: 'finance', title: 'Revenue Operations', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/fraud', component: () => import('pages/finance/FraudMonitoringCenterPage.vue'), meta: { workspace: 'finance', title: 'Fraud Monitoring', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/tenant-health', component: () => import('pages/finance/TenantFinancialHealthCenterPage.vue'), meta: { workspace: 'finance', title: 'Tenant Financial Health', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'finance/compliance', component: () => import('pages/finance/ComplianceCenterPage.vue'), meta: { workspace: 'finance', title: 'Compliance Center', permission: 'admin_deploy', requiresAuth: true } },
      
      // Executive Command Center
      { path: 'executive', component: () => import('pages/executive/ExecutiveCommandCenterPage.vue'), meta: { workspace: 'executive', title: 'Executive Command Center', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'executive/ai-insights', component: () => import('pages/executive/AIInsightsCenterPage.vue'), meta: { workspace: 'executive', title: 'AI Insights Center', permission: 'admin_deploy', requiresAuth: true } },
      
      { path: 'apps/installed', component: () => import('pages/applications/InstalledApplicationsPage.vue'), meta: { workspace: 'apps', title: 'Installed Applications', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'apps/apk-deployment', component: () => import('pages/applications/APKDeploymentPage.vue'), meta: { workspace: 'apps', title: 'APK Fleet Deployment', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'apps/forbidden', component: () => import('pages/applications/ForbiddenApplicationsPage.vue'), meta: { workspace: 'apps', title: 'Forbidden Applications', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'apps/accessibility', component: () => import('pages/applications/AccessibilityAbusePage.vue'), meta: { workspace: 'apps', title: 'Accessibility Abuse', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'apps/sideload', component: () => import('pages/applications/SideloadIntegrityPage.vue'), meta: { workspace: 'apps', title: 'Sideload & Integrity', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'incidents/active', component: () => import('pages/DashboardPage.vue'), meta: { workspace: 'incidents', title: 'Active Incidents', permission: 'admin_deploy', requiresAuth: true, keywords: ['stabilization', 'alerts', 'outage', 'downtime', 'status', 'decay'] } },
      { path: 'admin/tenants', component: () => import('pages/TenantsPage.vue'), meta: { workspace: 'admin', title: 'Tenants', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/users', component: () => import('pages/UsersPage.vue'), meta: { workspace: 'admin', title: 'Operators', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/settings', component: () => import('pages/admin/PlatformOverviewPage.vue'), meta: { workspace: 'admin', title: 'Platform Overview', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/config', component: () => import('pages/admin/PlatformConfigPage.vue'), meta: { workspace: 'admin', title: 'Platform Configuration', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/contact', component: () => import('pages/governance/ContactMaintenancePage.vue'), meta: { workspace: 'admin', title: 'Contact Maintenance', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/orchestration', component: () => import('pages/admin/TenantOrchestrationCenterPage.vue'), meta: { workspace: 'admin', title: 'Tenant Orchestration', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/billing', component: () => import('pages/admin/BillingGovernanceCenterPage.vue'), meta: { workspace: 'admin', title: 'Enterprise Billing & Revenue', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/pos-gateway', component: () => import('pages/PosGatewayPage.vue'), meta: { workspace: 'admin', title: 'EMV POS Gateway', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'automation/policy', component: () => import('pages/automation/PolicyIntelligencePage.vue'), meta: { workspace: 'automation', title: 'Policy Intelligence', permission: 'write_policies', requiresAuth: true } },
      { path: 'automation/workflows', component: () => import('pages/automation/WorkflowExecutionCenterPage.vue'), meta: { workspace: 'automation', title: 'Workflow Execution & Audit', permission: 'write_policies', requiresAuth: true } },
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
      { path: 'notes', component: () => import('pages/LessonNotePage.vue'), meta: { workspace: 'ai', title: 'AI Lesson Planner', requiresAuth: true } },
      { path: 'ai-usage', component: () => import('pages/AnalyticsPage.vue'), meta: { requiresAuth: true } },
      { path: 'devices', component: () => import('pages/DeviceActivationPage.vue'), meta: { requiresAuth: true } },


      
      { path: 'analytics', component: () => import('pages/AnalyticsPage.vue'), meta: { requiresAuth: true } },
      { path: 'referrals', component: () => import('pages/ReferralPage.vue'), meta: { requiresAuth: true } },
      { path: 'attendance', component: () => import('pages/AttendancePage.vue'), meta: { requiresAuth: true } },
      { path: 'attendance-history', component: () => import('pages/AttendancePage.vue'), meta: { requiresAuth: true } },
      { path: 'billing', component: () => import('pages/BillingPage.vue'), meta: { requiresAuth: true } },
      { path: 'settings', component: () => import('pages/IndexPage.vue'), meta: { requiresAuth: true } }
    ]
  },
  {
    path: '/tenant',
    component: () => import('layouts/TenantLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', component: () => import('pages/tenant/TenantDashboardPage.vue'), meta: { title: 'Business Operations Hub', requiresAuth: true } },
      { path: 'transactions', component: () => import('pages/tenant/TenantTransactionsPage.vue'), meta: { title: 'Transactions Ledger', requiresAuth: true } },
      { path: 'wallet', component: () => import('pages/tenant/TenantWalletPage.vue'), meta: { title: 'Wallet & Treasury', requiresAuth: true } },
      { path: 'reconciliation', component: () => import('pages/tenant/TenantReconciliationPage.vue'), meta: { title: 'Discrepancy Reconciliation', requiresAuth: true } },
      { path: 'staff', component: () => import('pages/tenant/TenantStaffPage.vue'), meta: { title: 'Staff Governance & RBAC', requiresAuth: true } },
      { path: 'reports', component: () => import('pages/tenant/TenantReportsPage.vue'), meta: { title: 'Business Reports', requiresAuth: true } },
      { path: 'settings', component: () => import('pages/tenant/TenantSettingsPage.vue'), meta: { title: 'Portal Customization', requiresAuth: true } },
      
      // Dynamic Retail Mode Routes
      { path: 'retail/pos', component: () => import('pages/tenant/TenantIndustryPOSPage.vue'), meta: { title: 'POS Checkout Register', requiresAuth: true } },
      { path: 'retail/inventory', component: () => import('pages/tenant/TenantIndustryInventoryPage.vue'), meta: { title: 'SKU Inventory Matrix', requiresAuth: true } },
      { path: 'retail/invoices', component: () => import('pages/tenant/TenantIndustryBillingPage.vue'), meta: { title: 'Billing Invoices', requiresAuth: true } },

      // Dynamic Hospitality Mode Routes
      { path: 'hospitality/rooms', component: () => import('pages/tenant/TenantIndustryInventoryPage.vue'), meta: { title: 'Room Occupancy Matrix', requiresAuth: true } },
      { path: 'hospitality/bookings', component: () => import('pages/tenant/TenantIndustryBillingPage.vue'), meta: { title: 'Reservations & Bookings', requiresAuth: true } },
      { path: 'hospitality/billing', component: () => import('pages/tenant/TenantIndustryPOSPage.vue'), meta: { title: 'Service Billing', requiresAuth: true } },

      // Dynamic Logistics Mode Routes
      { path: 'logistics/fleet', component: () => import('pages/tenant/TenantIndustryInventoryPage.vue'), meta: { title: 'Fleet Vehicle Matrix', requiresAuth: true } },
      { path: 'logistics/dispatch', component: () => import('pages/tenant/TenantIndustryBillingPage.vue'), meta: { title: 'Driver Dispatch Grid', requiresAuth: true } },
      { path: 'logistics/analytics', component: () => import('pages/tenant/TenantIndustryPOSPage.vue'), meta: { title: 'Delivery Analytics', requiresAuth: true } },

      // Dynamic Healthcare Mode Routes
      { path: 'healthcare/patients', component: () => import('pages/tenant/TenantIndustryInventoryPage.vue'), meta: { title: 'Patient Registry', requiresAuth: true } },
      { path: 'healthcare/pharmacy', component: () => import('pages/tenant/TenantIndustryPOSPage.vue'), meta: { title: 'Pharmacy Dispensaries', requiresAuth: true } },
      { path: 'healthcare/schedule', component: () => import('pages/tenant/TenantIndustryBillingPage.vue'), meta: { title: 'Schedules & Appointments', requiresAuth: true } }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes

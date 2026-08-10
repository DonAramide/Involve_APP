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
    path: '/register',
    component: () => import('pages/public/RegisterPage.vue'),
    meta: { isGuest: true, title: 'Enterprise Onboarding' }
  },
  {
    path: '/forgot-password',
    component: () => import('pages/public/ForgotPasswordPage.vue'),
    meta: { isGuest: true, title: 'Password Recovery' }
  },
  {
    path: '/reset-password',
    component: () => import('pages/public/ResetPasswordPage.vue'),
    meta: { isGuest: true, title: 'Reset Password' }
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
      { path: 'signup', component: () => import('pages/agent/AgentSignupPage.vue') },
      { path: 'success', component: () => import('pages/agent/AgentSuccessPage.vue') },
      { path: 'dashboard', component: () => import('pages/agent/AgentDashboardPage.vue') },
      { path: 'coming-soon/:module', component: () => import('pages/agent/ComingSoonPage.vue') },
      { path: 'notifications', component: () => import('pages/agent-portal/AgentNotificationsPage.vue') },
      { path: 'profile', component: () => import('pages/agent-portal/AgentProfilePage.vue') },
      { path: 'leads', component: () => import('pages/agent-portal/leads/LeadKanbanPage.vue') },
      { path: 'portfolio', component: () => import('pages/agent-portal/portfolio/TenantPortfolioPage.vue') },
      { path: 'wallet', component: () => import('pages/agent-portal/AgentWalletDashboardPage.vue') },
      { path: 'support', component: () => import('pages/agent-portal/AgentSupportPage.vue') },
      { path: 'kb', component: () => import('pages/agent-portal/AgentKbPage.vue') },
      { path: 'training', component: () => import('pages/agent-portal/AgentTrainingPage.vue') },
      { path: 'certifications', component: () => import('pages/agent-portal/AgentCertificationsPage.vue') },
      { path: 'reputation', component: () => import('pages/agent-portal/AgentReputationPage.vue') },
      { path: 'analytics', component: () => import('pages/agent-portal/AgentAnalyticsPage.vue') }
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
        meta: { title: 'Tenant Orchestration', workspace: 'admin', permission: 'admin_deploy', requiresAuth: true }
      },
      { 
        path: 'admin/agents', 
        component: () => import('pages/admin/AgentOnboardingPage.vue'),
        meta: { title: 'Agent Governance', workspace: 'admin', permission: 'admin_agent_management', requiresAuth: true }
      },
      { 
        path: 'admin/certifications', 
        component: () => import('pages/admin/certifications/CertificationCenterPage.vue'),
        meta: { title: 'Certification Center', workspace: 'admin', permission: 'admin_deploy', requiresAuth: true, keywords: ['ledger', 'verification', 'sentinel', 'fee', 'reconciliation', 'check', 'dual control'] }
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
        path: 'governance/provisioning-issues', 
        component: () => import('pages/governance/ProvisioningIssuesPage.vue'),
        meta: { title: 'Provisioning Issues', workspace: 'governance', permission: 'read_governance', requiresAuth: true }
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
        component: () => import('../pages/observability/WebsocketHealthPage.vue'),
        meta: { title: 'WebSocket Health', workspace: 'observability', permission: 'read_streams', requiresAuth: true }
      },
      {
        path: 'observability/realtime', 
        component: () => import('../pages/observability/RealtimeOperationsDashboard.vue'),
        meta: { title: 'Realtime Operations', workspace: 'observability', permission: 'read_metrics', requiresAuth: true }
      },
      { 
        path: 'observability/audit', 
        component: () => import('pages/governance/AuditTrailPage.vue'),
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
      {
        path: 'finance/school-payments',
        component: () => import('pages/school/SchoolPaymentsPage.vue'),
        meta: {
          workspace: 'finance',
          title: 'School Payments & Disputes',
          permission: 'admin_deploy',
          requiresAuth: true,
          platformScope: true,
          keywords: ['school', 'payments', 'disputes', 'cash', 'pos', 'student fees'],
        },
      },
      
      // Executive Command Center
      { path: 'executive', component: () => import('pages/executive/ExecutiveCommandCenterPage.vue'), meta: { workspace: 'ai', title: 'Executive Command Center', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'executive/ai-insights', component: () => import('pages/executive/AIInsightsCenterPage.vue'), meta: { workspace: 'ai', title: 'AI Insights Center', permission: 'admin_deploy', requiresAuth: true } },
      
      { path: 'apps/installed', component: () => import('pages/applications/InstalledApplicationsPage.vue'), meta: { workspace: 'apps', title: 'Installed Applications', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'apps/apk-deployment', component: () => import('pages/applications/APKDeploymentPage.vue'), meta: { workspace: 'apps', title: 'APK Fleet Deployment', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'apps/forbidden', component: () => import('pages/applications/ForbiddenApplicationsPage.vue'), meta: { workspace: 'apps', title: 'Forbidden Applications', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'apps/accessibility', component: () => import('pages/applications/AccessibilityAbusePage.vue'), meta: { workspace: 'apps', title: 'Accessibility Abuse', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'apps/sideload', component: () => import('pages/applications/SideloadIntegrityPage.vue'), meta: { workspace: 'apps', title: 'Sideload & Integrity', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'incidents/active', component: () => import('pages/DashboardPage.vue'), meta: { workspace: 'incidents', title: 'Active Incidents', permission: 'admin_deploy', requiresAuth: true, keywords: ['stabilization', 'alerts', 'outage', 'downtime', 'status', 'decay'] } },
      { path: 'admin/tenants', component: () => import('pages/TenantsPage.vue'), meta: { workspace: 'admin', title: 'Tenants', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/users', component: () => import('pages/UsersPage.vue'), meta: { workspace: 'admin', title: 'Operators', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/settings', component: () => import('pages/admin/PlatformOverviewPage.vue'), meta: { workspace: 'admin', title: 'Platform Overview', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/config', component: () => import('pages/admin/PlatformConfigPage.vue'), meta: { workspace: 'admin', title: 'Platform Configuration', permission: 'admin_deploy', requiresAuth: true, keywords: ['maintenance', 'maintenance mode', 'maintenance mode controls', 'system lockout', 'lockout'] } },
      { path: 'admin/vault', component: () => import('pages/admin/IntegrationVaultPage.vue'), meta: { workspace: 'admin', title: 'Enterprise Integration Vault', permission: 'admin_deploy', requiresAuth: true, keywords: ['vault', 'integrations', 'secrets', 'api keys', 'certificates', 'webhook', 'signing secret', 'quasar webhook', 'x-quasar-signature', 'QUASAR_WEBHOOK_SIGNING_SECRET'] } },
      { path: 'admin/ecs-workspace', component: () => import('pages/admin/EnterpriseConfigurationWorkspace.vue'), meta: { workspace: 'admin', title: 'Enterprise Configuration Workspace', permission: 'admin_deploy', requiresAuth: true, keywords: ['ecs', 'configuration', 'workspace', 'providers'] } },
      { path: 'admin/settings/authentication', component: () => import('pages/admin/AuthenticationSettingsPage.vue'), meta: { workspace: 'admin', title: 'Authentication Settings', permission: 'admin_deploy', requiresAuth: true, keywords: ['settings', 'authentication', 'onboarding', 'verification'] } },
      { path: 'admin/contact', component: () => import('pages/governance/ContactMaintenancePage.vue'), meta: { workspace: 'admin', title: 'Contact Maintenance', permission: 'admin_deploy', requiresAuth: true } },

      // ==========================================
      // QUASAR FINANCIAL SANDBOX (QFS)
      // ==========================================
      { path: 'sandbox', component: () => import('pages/sandbox/SandboxDashboardPage.vue'), meta: { workspace: 'sandbox', title: 'QFS Sandbox Dashboard', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'sandbox/developer-portal', component: () => import('pages/sandbox/DeveloperPortalPage.vue'), meta: { workspace: 'sandbox', title: 'Developer Portal', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'sandbox/keys', component: () => import('pages/sandbox/ApiKeyManagementPage.vue'), meta: { workspace: 'sandbox', title: 'API Keys', permission: 'admin_deploy', requiresAuth: true } },


      { path: 'admin/billing', component: () => import('pages/admin/BillingGovernanceCenterPage.vue'), meta: { workspace: 'admin', title: 'Enterprise Billing & Revenue', permission: 'admin_deploy', requiresAuth: true } },
      { path: 'admin/agents/commissions', component: () => import('pages/admin/AgentCommissionsPage.vue'), meta: { workspace: 'admin', title: 'Agent Commissions & Billing', keywords: ['commission', 'bill', 'payout', 'agent fee'], permission: 'admin_deploy', requiresAuth: true } },
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
      { path: 'dashboard', component: () => import('src/domains/tenant/dashboard/pages/TenantDashboardPage.vue'), meta: { title: 'Business Operations Hub', requiresAuth: true, permission: 'tenant.dashboard.view' } },
      { path: 'transactions', component: () => import('src/domains/tenant/transactions/pages/TenantTransactionsPage.vue'), meta: { title: 'Transactions Ledger', requiresAuth: true, permission: 'tenant.transaction.view' } },
      { path: 'retail/inventory', component: () => import('src/domains/tenant/inventory/pages/TenantInventoryPage.vue'), meta: { title: 'Inventory Stock Matrix', requiresAuth: true, permission: 'tenant.inventory.view' } },
      { path: 'retail/invoices', component: () => import('src/domains/tenant/transactions/pages/TenantInvoicesPage.vue'), meta: { title: 'Billing Invoices', requiresAuth: true, permission: 'tenant.transaction.view' } },
      { path: 'retail/pos', component: () => import('pages/PosGatewayPage.vue'), meta: { title: 'POS Switchboard', requiresAuth: true, permission: 'superadmin.pos.switchboard', superAdminOnly: true } },
      { path: 'wallet', component: () => import('src/domains/tenant/wallets/pages/TenantWalletPage.vue'), meta: { title: 'Wallet & Treasury', requiresAuth: true, permission: 'tenant.wallet.view' } },
      { path: 'reconciliation', component: () => import('src/domains/tenant/ledger/pages/TenantReconciliationPage.vue'), meta: { title: 'Discrepancy Reconciliation', requiresAuth: true, permission: 'tenant.ledger.view' } },
      { path: 'users', component: () => import('src/domains/tenant/crm/pages/TenantCrmPage.vue'), meta: { title: 'Directory', requiresAuth: true } },
      { path: 'users/:id', component: () => import('src/domains/tenant/crm/pages/TenantCustomerProfilePage.vue'), meta: { title: 'User Profile', requiresAuth: true } },
      { path: 'staff', component: () => import('src/domains/tenant/users/pages/TenantUsersPage.vue'), meta: { title: 'Staff Governance & RBAC', requiresAuth: true, permission: 'tenant.users.manage' } },
      { path: 'roles', component: () => import('src/domains/tenant/users/pages/TenantRolesPage.vue'), meta: { title: 'Roles & Permissions', requiresAuth: true, permission: 'tenant.roles.view' } },
      { path: 'invitations', component: () => import('src/domains/tenant/users/pages/TenantInvitationsPage.vue'), meta: { title: 'Invitations', requiresAuth: true, permission: 'tenant.invitations.manage' } },
      { path: 'activity', component: () => import('src/domains/tenant/users/pages/TenantActivityPage.vue'), meta: { title: 'Activity Audit', requiresAuth: true, permission: 'tenant.activity.view' } },
      { path: 'reports', component: () => import('src/domains/tenant/reports/pages/TenantReportsPage.vue'), meta: { title: 'Business Reports', requiresAuth: true, permission: 'tenant.reports.view' } },
      { path: 'settings', component: () => import('src/domains/tenant/settings/pages/TenantSettingsPage.vue'), meta: { title: 'Portal Customization', requiresAuth: true, permission: 'tenant.settings.manage' } },
      { path: 'settings/financial-platform', component: () => import('src/pages/financial-platform/FinancialPlatformPage.vue'), meta: { title: 'Financial Platform', requiresAuth: true, permission: 'tenant.settings.manage' } },
      { path: 'profile', component: () => import('src/domains/tenant/settings/pages/TenantProfilePage.vue'), meta: { title: 'My Account & Security', requiresAuth: true, permission: 'tenant.settings.manage' } },
      
      // Inventory Domain
      { path: 'products', component: () => import('src/pages/inventory/ProductsPage.vue'), meta: { title: 'Products', requiresAuth: true, permission: 'tenant.inventory.view' } },
      { path: 'categories', component: () => import('src/pages/inventory/CategoriesPage.vue'), meta: { title: 'Categories', requiresAuth: true, permission: 'tenant.inventory.view' } },
      { path: 'stock', component: () => import('src/pages/inventory/StockPage.vue'), meta: { title: 'Stock & Adjustments', requiresAuth: true, permission: 'tenant.inventory.view' } },
      { path: 'suppliers', component: () => import('src/pages/inventory/SuppliersPage.vue'), meta: { title: 'Suppliers', requiresAuth: true, permission: 'tenant.inventory.view' } },

      // Additional Domain placeholders that are lazy-loaded
      { path: 'settlements', component: () => import('src/domains/tenant/settlements/pages/TenantSettlementsPage.vue').catch(() => import('pages/ErrorNotFound.vue')), meta: { title: 'Settlements', requiresAuth: true, permission: 'tenant.settlement.view' } },
      { path: 'payouts', component: () => import('src/domains/tenant/payouts/pages/TenantPayoutsPage.vue').catch(() => import('pages/ErrorNotFound.vue')), meta: { title: 'Payouts', requiresAuth: true, permission: 'tenant.payout.create' } },
      { path: 'devices', component: () => import('src/domains/tenant/devices/pages/TenantDevicesPage.vue').catch(() => import('pages/ErrorNotFound.vue')), meta: { title: 'Devices', requiresAuth: true, permission: 'tenant.devices.view' } },
      { path: 'terminals', component: () => import('src/domains/tenant/terminals/pages/TenantTerminalsPage.vue').catch(() => import('pages/ErrorNotFound.vue')), meta: { title: 'Terminals', requiresAuth: true, permission: 'tenant.terminals.view' } },
      { path: 'compliance', component: () => import('src/domains/tenant/compliance/pages/TenantCompliancePage.vue').catch(() => import('pages/ErrorNotFound.vue')), meta: { title: 'Compliance', requiresAuth: true, permission: 'tenant.compliance.view' } },
      { path: 'audit', component: () => import('src/domains/tenant/audit/pages/TenantAuditPage.vue').catch(() => import('pages/ErrorNotFound.vue')), meta: { title: 'Audit Logs', requiresAuth: true, permission: 'tenant.audit.view' } },
      { path: 'analytics', component: () => import('src/domains/tenant/analytics/pages/TenantAnalyticsPage.vue').catch(() => import('pages/ErrorNotFound.vue')), meta: { title: 'Analytics', requiresAuth: true, permission: 'tenant.analytics.view' } },

      // School roster synced from Flutter Web Sync
      { path: 'school-roster', component: () => import('pages/school/AcademicsPage.vue'), meta: { title: 'School Roster', requiresAuth: true } },
      { path: 'school-payments', component: () => import('pages/school/SchoolPaymentsPage.vue'), meta: { title: 'School Payments', requiresAuth: true } },
      
      // Dynamic School Mode Routes nested under Tenant Layout namespace
      { path: 'curriculum', component: () => import('pages/CurriculumPage.vue'), meta: { requiresAuth: true } },
      { path: 'notes', component: () => import('pages/LessonNotePage.vue'), meta: { workspace: 'ai', title: 'AI Lesson Planner', requiresAuth: true } },
      { path: 'attendance', component: () => import('pages/AttendancePage.vue'), meta: { requiresAuth: true } },
      
      // Logistics/Fleet Domain
      { path: 'logistics/fleet', component: () => import('pages/fleet/FleetOverviewPage.vue'), meta: { title: 'Fleet Overview', workspace: 'fleet', permission: 'read_fleet', requiresAuth: true } },
      
      // Removed legacy dynamic industry routes
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes

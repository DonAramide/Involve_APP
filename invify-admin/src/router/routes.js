// invify-admin/src/router/routes.js

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
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
      
      // Teacher Workspace
      { path: 'teacher-workspace', component: () => import('pages/TeacherDashboardPage.vue') },
      
      // Onboarding Flow (Public/Semi-Private)
      { path: 'onboarding', component: () => import('pages/OnboardingFlow.vue') },
      { path: 'invite/accept', component: () => import('pages/AcceptInvitePage.vue') },
      
      // Placeholder routes for Phase 4 modules
      { path: 'analytics', component: () => import('pages/AnalyticsPage.vue') },
      { path: 'referrals', component: () => import('pages/ReferralPage.vue') },
      { path: 'attendance', component: () => import('pages/AttendancePage.vue') },
      { path: 'attendance-history', component: () => import('pages/AttendancePage.vue') }, // Reusing for MVP or separate later
      { path: 'billing', component: () => import('pages/BillingPage.vue') },
      { path: 'settings', component: () => import('pages/IndexPage.vue') }
    ]
  },

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes

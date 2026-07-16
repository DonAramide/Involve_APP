import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'finance/:catchAll(.*)*', component: () => import('pages/FinanceDashboard.vue') },
      { path: 'treasury/:catchAll(.*)*', component: () => import('pages/TreasuryDashboard.vue') },
      { path: 'governance/:catchAll(.*)*', component: () => import('pages/GovernanceDashboard.vue') },
      { path: 'fraud/:catchAll(.*)*', component: () => import('pages/FraudDashboard.vue') },
      { path: 'automation/:catchAll(.*)*', component: () => import('pages/GovernanceDashboard.vue') }, // Re-routing automation to governance temporarily
      { path: 'ai/:catchAll(.*)*', component: () => import('pages/AiDashboard.vue') },
      { path: 'executive/:catchAll(.*)*', component: () => import('pages/ExecutiveDashboard.vue') }
    ],
  },
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue')
  },
  {
    path: '/register',
    component: () => import('pages/public/RegisterPage.vue')
  },
  {
    path: '/forgot-password',
    component: () => import('pages/public/ForgotPasswordPage.vue')
  },
  {
    path: '/reset-password',
    component: () => import('pages/public/ResetPasswordPage.vue')
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;

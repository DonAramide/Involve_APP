import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'finance/:catchAll(.*)*', component: () => import('pages/MockDashboard.vue') },
      { path: 'treasury/:catchAll(.*)*', component: () => import('pages/MockDashboard.vue') },
      { path: 'governance/:catchAll(.*)*', component: () => import('pages/MockDashboard.vue') },
      { path: 'fraud/:catchAll(.*)*', component: () => import('pages/MockDashboard.vue') },
      { path: 'automation/:catchAll(.*)*', component: () => import('pages/MockDashboard.vue') },
      { path: 'ai/:catchAll(.*)*', component: () => import('pages/MockDashboard.vue') },
      { path: 'executive/:catchAll(.*)*', component: () => import('pages/MockDashboard.vue') }
    ],
  },
  {
    path: '/login',
    component: () => import('pages/MockDashboard.vue')
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;

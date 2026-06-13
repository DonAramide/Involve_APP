import { describe, it, expect, beforeEach } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import routes from '../router/routes';

// Mock router instance to test permission guards
const router = createRouter({
  history: createWebHistory(),
  routes
});

describe('Tenant Route Permissions', () => {
  it('requires tenant.users.manage permission to access /tenant/staff', async () => {
    const route = router.resolve('/tenant/staff');
    expect(route.meta.requiresAuth).toBe(true);
    expect(route.meta.permission).toBe('tenant.users.manage');
  });

  it('requires tenant.wallet.view permission to access /tenant/wallet', async () => {
    const route = router.resolve('/tenant/wallet');
    expect(route.meta.requiresAuth).toBe(true);
    expect(route.meta.permission).toBe('tenant.wallet.view');
  });

  it('requires tenant.transaction.view permission to access /tenant/transactions', async () => {
    const route = router.resolve('/tenant/transactions');
    expect(route.meta.requiresAuth).toBe(true);
    expect(route.meta.permission).toBe('tenant.transaction.view');
  });
});

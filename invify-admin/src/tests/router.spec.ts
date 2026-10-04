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

  it('lets finance ops open platform fee profiles', () => {
    const list = router.resolve('/admin/platform-fees');
    const detail = router.resolve('/admin/platform-fees/POS_WITHDRAWAL');
    expect(list.meta.requiresAuth).toBe(true);
    expect(list.meta.permission).toBe('read_finance');
    expect(detail.meta.permission).toBe('read_finance');
  });

  it('lets finance ops open fee distribution and keeps stakeholder admin on deploy', () => {
    const distribution = router.resolve('/admin/platform-fees/distribution');
    const stakeholders = router.resolve('/admin/platform-fees/stakeholders');
    const withdrawals = router.resolve('/admin/platform-fees/withdrawals');
    expect(distribution.meta.permission).toBe('read_finance');
    expect(stakeholders.meta.permission).toBe('admin_deploy');
    expect(withdrawals.meta.permission).toBe('admin_deploy');
  });
});

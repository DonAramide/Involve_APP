/**
 * Regression: tenant isolation hard gates (no live network).
 */
import {
  assertTransactionTenantAccess,
  isPlatformFinanceOperator,
  resolveAuthoritativeTenantId,
  resolveReconciliationTenantId,
} from '../src/utils/finance-tenant';
import { resolveTenantScope } from '../src/utils/resolve-tenant-scope';

function mockReq(partial: any): any {
  return partial;
}

describe('Phase 4 tenant isolation regressions', () => {
  test('resolveAuthoritativeTenantId ignores x-tenant-id spoof and keeps the JWT tenant', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: { tenantId: 'tenant-b' },
      params: {},
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
  });

  test('resolveAuthoritativeTenantId uses JWT tenant when no spoof', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
      headers: {},
      body: {},
      query: {},
      params: {},
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
  });

  test('assertTransactionTenantAccess blocks other-tenant payment', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
    });
    expect(() => assertTransactionTenantAccess('tenant-b', req)).toThrow(/Cross-tenant/);
  });

  test('super_admin may select tenant via query', () => {
    const req = mockReq({
      user: { id: 'sa', role: 'super_admin', tenantId: null },
      headers: {},
      body: {},
      query: { tenantId: 'tenant-b' },
      params: {},
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-b');
  });

  test('super_admin may select tenant via x-tenant-id header', () => {
    const req = mockReq({
      user: { id: 'sa', role: 'super_admin', tenantId: null },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: {},
      params: {},
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-b');
  });

  test('platform admin without a merchant tenant may impersonate via x-tenant-id', () => {
    const req = mockReq({
      user: { id: 'ops', role: 'admin', tenantId: null },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: {},
      params: {},
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-b');
  });

  test('merchant admin cannot switch tenants via x-tenant-id', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: {},
      params: {},
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
  });

  test('super_admin may select tenant via /tenants/:id path param', () => {
    const req = mockReq({
      user: { id: 'sa', role: 'super_admin', tenantId: null },
      headers: {},
      body: {},
      query: {},
      params: { id: 'tenant-b' },
      originalUrl: '/api/admin/tenants/tenant-b/details',
      path: '/api/admin/tenants/tenant-b/details',
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-b');
  });

  test('resolveTenantScope matches finance helper: merchant admin cannot spoof x-tenant-id', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: {},
      params: {},
    });
    expect(resolveTenantScope(req)).toBe('tenant-a');
  });

  test('resolveTenantScope matches finance helper: owner cannot spoof via query or body', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: { tenantId: 'tenant-c' },
      query: { tenantId: 'tenant-d' },
      params: {},
    });
    expect(resolveTenantScope(req)).toBe('tenant-a');
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
  });

  test('resolveTenantScope allows platform admin without merchant tenant to select x-tenant-id', () => {
    const req = mockReq({
      user: { id: 'ops', role: 'admin', tenantId: null },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: {},
      params: {},
    });
    expect(resolveTenantScope(req)).toBe('tenant-b');
  });

  test('super_admin still requires a real tenant when only sentinels are present', () => {
    const req = mockReq({
      user: { id: 'sa', role: 'super_admin', tenantId: 'system' },
      headers: { 'x-tenant-id': 'global' },
      body: {},
      query: {},
      params: {},
    });
    expect(() => resolveAuthoritativeTenantId(req)).toThrow(/tenantId is required/);
  });

  test('merchant admin is not a platform operator and cannot open global reconciliation', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: { tenantId: 'global' },
      params: {},
    });
    expect(isPlatformFinanceOperator(req.user)).toBe(false);
    expect(resolveReconciliationTenantId(req)).toBe('tenant-a');
  });

  test('merchant owner cannot enumerate another tenant via reconciliation header fallback', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: {},
      params: {},
    });
    expect(resolveReconciliationTenantId(req)).toBe('tenant-a');
  });

  test('merchant without tenant context fails closed on reconciliation', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'owner', tenantId: null },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: {},
      params: {},
    });
    expect(() => resolveReconciliationTenantId(req)).toThrow(/no tenant context/);
  });

  test('platform operator may use global reconciliation when no tenant is selected', () => {
    const req = mockReq({
      user: { id: 'sa', role: 'super_admin', tenantId: null },
      headers: {},
      body: {},
      query: {},
      params: {},
    });
    expect(isPlatformFinanceOperator(req.user)).toBe(true);
    expect(resolveReconciliationTenantId(req)).toBe('global');
  });

  test('KYC/audit platform listing is denied to merchant admin even with spoofed header', () => {
    const merchantAdmin = { id: 'u1', role: 'admin', tenantId: 'tenant-a' };
    const platformAdmin = { id: 'ops', role: 'admin', tenantId: null };
    expect(isPlatformFinanceOperator(merchantAdmin)).toBe(false);
    expect(isPlatformFinanceOperator(platformAdmin)).toBe(true);
    const req = mockReq({
      user: merchantAdmin,
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: { tenantId: 'tenant-b' },
      params: { id: 'tenant-b' },
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
    expect(resolveTenantScope(req)).toBe('tenant-a');
  });

  test('virtual-account init tenant is the authenticated merchant, not body.tenantId', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
      headers: {},
      body: { tenantId: 'tenant-b' },
      query: {},
      params: {},
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
  });
});

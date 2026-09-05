/**
 * Regression: tenant isolation hard gates (no live network).
 */
import { resolveAuthoritativeTenantId, assertTransactionTenantAccess } from '../src/utils/finance-tenant';

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
});

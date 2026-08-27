/**
 * Regression: tenant isolation hard gates (no live network).
 */
import { resolveAuthoritativeTenantId, assertTransactionTenantAccess } from '../src/utils/finance-tenant';

function mockReq(partial: any): any {
  return partial;
}

describe('Phase 4 tenant isolation regressions', () => {
  test('resolveAuthoritativeTenantId rejects x-tenant-id spoof for tenant users', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: {},
      query: {},
      params: {},
    });
    expect(() => resolveAuthoritativeTenantId(req)).toThrow(/Cross-tenant/);
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
});

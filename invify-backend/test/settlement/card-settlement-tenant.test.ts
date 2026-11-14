import {
  assertSettlementBatchTenantAccess,
  SettlementBatchAccessError,
} from '../../src/services/settlement/card-settlement.service';
import {
  isPlatformFinanceOperator,
  resolveAuthoritativeTenantId,
} from '../../src/utils/finance-tenant';

function mockReq(partial: any): any {
  return partial;
}

describe('Card settlement tenant isolation', () => {
  test('merchant cannot read another tenant batch by id', () => {
    expect(() =>
      assertSettlementBatchTenantAccess({ tenant_id: 'tenant-b' }, 'tenant-a', false),
    ).toThrow(SettlementBatchAccessError);
  });

  test('merchant can read their own batch', () => {
    expect(() =>
      assertSettlementBatchTenantAccess({ tenant_id: 'tenant-a' }, 'tenant-a', false),
    ).not.toThrow();
  });

  test('missing batch fails closed', () => {
    expect(() => assertSettlementBatchTenantAccess(null, 'tenant-a', false)).toThrow(
      /not found/,
    );
  });

  test('merchant without tenant cannot read a batch', () => {
    expect(() =>
      assertSettlementBatchTenantAccess({ tenant_id: 'tenant-a' }, null, false),
    ).toThrow(SettlementBatchAccessError);
  });

  test('platform operator without selected tenant may view any batch', () => {
    expect(() =>
      assertSettlementBatchTenantAccess({ tenant_id: 'tenant-b' }, null, true),
    ).not.toThrow();
  });

  test('platform operator with selected tenant cannot view another tenant batch', () => {
    expect(() =>
      assertSettlementBatchTenantAccess({ tenant_id: 'tenant-b' }, 'tenant-a', true),
    ).toThrow(SettlementBatchAccessError);
  });

  test('merchant owner cannot override settlement tenant via header or body', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: { tenantId: 'tenant-b' },
      query: { tenantId: 'tenant-b' },
      params: { id: 'batch-from-b' },
    });
    expect(isPlatformFinanceOperator(req.user)).toBe(false);
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
  });

  test('merchant admin cannot mix tenants on settlement upload', () => {
    const req = mockReq({
      user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
      body: { tenantId: 'tenant-b' },
      query: {},
      params: {},
    });
    expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
  });
});

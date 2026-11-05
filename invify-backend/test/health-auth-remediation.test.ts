import fs from 'fs';
import path from 'path';
import { requireHealthPermission } from '../src/modules/health-insurance/guards/health-permission.guard';
import { supabaseAdmin } from '../src/db/supabase';
import { HealthClaimService } from '../src/modules/health-insurance/services/health-claim.service';
import { HealthFinanceService } from '../src/modules/health-insurance/services/health-finance.service';
import { HealthNotificationService } from '../src/modules/health-insurance/services/health-notification.service';
import { PLATFORM_GRANTABLE_PERMISSIONS } from '../src/modules/health-insurance/types';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: { from: jest.fn() }
}));

jest.mock('../src/modules/health-insurance/services/health-audit.service', () => ({
  HealthAuditService: { log: jest.fn(async () => undefined), recordEvent: jest.fn(async () => undefined) }
}));

jest.mock('../src/services/notification.service', () => ({
  NotificationService: {
    sendToUser: jest.fn(async () => undefined),
    sendToFleet: jest.fn(async () => {
      throw new Error('FCM unavailable');
    })
  }
}));

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  } as any;
}

function tableMap(map: Record<string, { data?: any; error?: any; rows?: any[] }>) {
  (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
    const row = map[table] || { data: null, error: null };
    const listResult = {
      data: row.rows !== undefined ? row.rows : row.data != null ? [row.data].flat() : [],
      error: row.error ?? null
    };
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      is: jest.fn(() => chain),
      gt: jest.fn(() => chain),
      in: jest.fn(() => chain),
      insert: jest.fn(() => chain),
      update: jest.fn(() => chain),
      order: jest.fn(() => chain),
      maybeSingle: jest.fn(async () => ({ data: row.data ?? null, error: row.error ?? null })),
      // Supabase list queries are thenable builder chains
      then: (resolve: any, reject: any) => Promise.resolve(listResult).then(resolve, reject)
    };
    return chain;
  });
}

describe('HMO critical auth remediation — route guards', () => {
  const routes = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/register-routes.ts'),
    'utf8'
  );

  test('finance mutations are not behind platform.integration.health', () => {
    const financeBlock = routes.slice(
      routes.indexOf("router.get('/platform/finance/overview'"),
      routes.indexOf("router.post('/platform/finance/settlements/:id/reconcile'") + 200
    );
    expect(financeBlock).not.toMatch(
      /finance\/agreements'[\s\S]{0,120}platform\.integration\.health/
    );
    expect(financeBlock).toContain("requireHealthPermission('platform.finance.manage')");
    expect(financeBlock).toContain("requireHealthPermission('platform.agreements.approve')");
    expect(financeBlock).toContain("requireHealthPermission('platform.statements.approve')");
    expect(financeBlock).toContain("requireHealthPermission('platform.finance.reconcile')");
    expect(financeBlock).toContain("requireHealthPermission('platform.finance.view')");
    // Premium cash snapshot may remain on integration.health — profitability must not.
    expect(routes).toContain(
      "router.post('/platform/finance/agreements', requireHealthPermission('platform.finance.manage')"
    );
    expect(routes).not.toContain(
      "router.post('/platform/finance/agreements', requireHealthPermission('platform.integration.health')"
    );
  });

  test('claim mutations require health.claims.manage; reads keep health.claims.read', () => {
    expect(routes).toContain(
      "router.get('/claims', requireHealthPermission('health.claims.read')"
    );
    expect(routes).toContain(
      "router.post('/claims', requireHealthPermission('health.claims.manage')"
    );
    expect(routes).toContain(
      "router.post('/claims/:id/approve', requireHealthPermission('health.claims.manage')"
    );
    expect(routes).toContain(
      "router.post('/claims/:id/reject', requireHealthPermission('health.claims.manage')"
    );
    expect(routes).toContain(
      "router.post('/claims/:id/settle', requireHealthPermission('health.claims.manage')"
    );
    expect(routes).not.toContain(
      "router.post('/claims', requireHealthPermission('health.claims.read')"
    );
    expect(routes).not.toContain("router.post('/claims/sync'");
  });

  test('platform grant allow-list includes finance maker-checker permissions', () => {
    expect(PLATFORM_GRANTABLE_PERMISSIONS).toEqual(
      expect.arrayContaining([
        'platform.finance.view',
        'platform.finance.manage',
        'platform.agreements.approve',
        'platform.statements.approve',
        'platform.finance.reconcile'
      ])
    );
  });
});

describe('finance permission positive/negative guards', () => {
  beforeEach(() => jest.clearAllMocks());

  const cases: Array<{ permission: string; label: string }> = [
    { permission: 'platform.finance.view', label: 'view' },
    { permission: 'platform.finance.manage', label: 'manage' },
    { permission: 'platform.agreements.approve', label: 'agreements.approve' },
    { permission: 'platform.statements.approve', label: 'statements.approve' },
    { permission: 'platform.finance.reconcile', label: 'reconcile' }
  ];

  for (const c of cases) {
    test(`denies ${c.label} when only platform.integration.health is held`, async () => {
      tableMap({
        users: {
          data: {
            id: 'ops1',
            email: 'ops@example.com',
            role: 'super_admin',
            tenant_id: null,
            is_active: true
          }
        },
        // Grant for wrong permission — lookup is by requiredPermission
        hw_platform_grants: { data: null },
        hw_platform_entitlements: { data: null }
      });
      // Simulate holding integration.health only: grant lookup for finance.* returns null
      const res = mockRes();
      const next = jest.fn();
      await requireHealthPermission(c.permission as any)(
        {
          user: { id: 'ops1' },
          headers: { 'x-platform-reason': 'attempt finance via integration grant' }
        } as any,
        res,
        next
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json.mock.calls[0][0].error.code).toBe('PLATFORM_PERMISSION_DENIED');
    });

    test(`allows ${c.label} with matching grant + reason`, async () => {
      tableMap({
        users: {
          data: {
            id: 'ops2',
            email: 'checker@example.com',
            role: 'super_admin',
            tenant_id: null,
            is_active: true
          }
        },
        hw_platform_grants: {
          data: { id: 'g1', expires_at: '2099-01-01T00:00:00.000Z', revoked_at: null }
        }
      });
      const res = mockRes();
      const next = jest.fn();
      await requireHealthPermission(c.permission as any)(
        {
          user: { id: 'ops2' },
          headers: { 'x-platform-reason': `authorized ${c.label} action` }
        } as any,
        res,
        next
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  }
});

describe('claims permission positive/negative guards', () => {
  beforeEach(() => jest.clearAllMocks());

  test('read-only claims.read staff cannot pass claims.manage guard', async () => {
    tableMap({
      users: {
        data: {
          id: 'staff1',
          email: 'staff@school.test',
          role: 'staff',
          tenant_id: 'tenant-a',
          is_active: true
        }
      },
      hw_permission_grants: {
        rows: [{ permission: 'health.claims.read' }]
      }
    });
    const res = mockRes();
    const next = jest.fn();
    await requireHealthPermission('health.claims.manage')(
      { user: { id: 'staff1' }, headers: {} } as any,
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error.code).toBe('HEALTH_FORBIDDEN');
  });

  test('claims.read allows list/read guard', async () => {
    tableMap({
      users: {
        data: {
          id: 'staff2',
          email: 'reader@school.test',
          role: 'staff',
          tenant_id: 'tenant-a',
          is_active: true
        }
      },
      hw_permission_grants: {
        rows: [{ permission: 'health.claims.read' }]
      }
    });
    const res = mockRes();
    const next = jest.fn();
    await requireHealthPermission('health.claims.read')(
      { user: { id: 'staff2' }, headers: {} } as any,
      res,
      next
    );
    expect(next).toHaveBeenCalled();
  });

  test('tenant_admin auto-receives claims.manage', async () => {
    tableMap({
      users: {
        data: {
          id: 'admin1',
          email: 'admin@school.test',
          role: 'tenant_admin',
          tenant_id: 'tenant-a',
          is_active: true
        }
      },
      hw_permission_grants: { rows: [] }
    });
    const res = mockRes();
    const next = jest.fn();
    await requireHealthPermission('health.claims.manage')(
      { user: { id: 'admin1' }, headers: {} } as any,
      res,
      next
    );
    expect(next).toHaveBeenCalled();
  });
});

describe('claims tenant isolation + history soft-fail', () => {
  beforeEach(() => jest.clearAllMocks());

  function claimChain(result: any) {
    const api: any = {
      select: jest.fn(() => api),
      eq: jest.fn(() => api),
      order: jest.fn(() => api),
      maybeSingle: jest.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })),
      update: jest.fn(() => api),
      insert: jest.fn(() => api)
    };
    return api;
  }

  test('mutation refuses claims from another tenant', async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue(
      claimChain({ data: null }) // requireTenantClaim → not found for tenant-a
    );
    await expect(
      HealthClaimService.approveClaim({ tenantId: 'tenant-a', userId: 'u1' } as any, 'claim-b', {})
    ).rejects.toMatchObject({ status: 404 });
  });

  test('listClaimHistory returns explicit note when events table missing', async () => {
    let calls = 0;
    (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return claimChain({
          data: { id: 'c1', status: 'submitted', claim_reference: 'CL-1', tenant_id: 't1' }
        });
      }
      const api: any = {
        select: jest.fn(() => api),
        eq: jest.fn(() => api),
        order: jest.fn(async () => ({
          data: null,
          error: { message: 'relation "hw_claim_status_events" does not exist' }
        }))
      };
      return api;
    });
    const result = await HealthClaimService.listClaimHistory(
      { tenantId: 't1', userId: 'u1' } as any,
      'c1'
    );
    expect(result.events).toEqual([]);
    expect(String(result.note)).toMatch(/DO_NOT_APPLY_hw_claims_workflow/);
  });
});

describe('finance maker-checker and reconcile safety', () => {
  test('same principal cannot approve their own agreement', async () => {
    const maker = { id: 'maker-1', email: 'maker@invify.com' };
    tableMap({
      hw_providers: {
        data: {
          id: '00000000-0000-0000-0000-000000000099',
          code: 'TESTHMO',
          display_name: 'Test HMO'
        }
      }
    });
    const created = await HealthFinanceService.createAgreement(maker, {
      providerId: '00000000-0000-0000-0000-000000000099',
      title: 'Test profit-sharing agreement',
      effectiveFrom: '2026-01-01',
      profitBasis: 'net_profit',
      platformSharePercent: 15,
      hmoSharePercent: 85
    });
    await expect(
      HealthFinanceService.approveAgreement(maker, created.id, 'self approve')
    ).rejects.toThrow(/Maker-Checker/);
  });
});

describe('notification soft-fail does not throw', () => {
  beforeEach(() => jest.clearAllMocks());

  test('recipient lookup / fleet failure is swallowed', async () => {
    (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        in: jest.fn(() => Promise.resolve({ data: [], error: null }))
      };
      return chain;
    });
    await expect(
      HealthNotificationService.notifyTenantAdmins(
        'tenant-a',
        'claim.approved',
        't',
        'b',
        { claimId: 'c1' }
      )
    ).resolves.toBeUndefined();
  });
});

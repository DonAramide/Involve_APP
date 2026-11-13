import { requireHealthPermission } from '../src/modules/health-insurance/guards/health-permission.guard';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));

function mockRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res;
}

function tableMap(map: Record<string, { data?: any; error?: any }>) {
  (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
    const row = map[table] || { data: null, error: null };
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      is: jest.fn(() => chain),
      gt: jest.fn(() => chain),
      maybeSingle: jest.fn(async () => ({ data: row.data ?? null, error: row.error ?? null }))
    };
    return chain;
  });
}

const guard = requireHealthPermission('platform.plans.manage');

describe('Invify catalogue mutation authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('unauthenticated callers receive 401', async () => {
    const res = mockRes();
    await guard({ user: null } as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error.code).toBe('UNAUTHENTICATED');
  });

  test('tenant health.plans.manage does not authorize catalogue mutations', async () => {
    tableMap({
      users: {
        data: {
          id: 't1',
          email: 'tenant@example.com',
          role: 'owner',
          tenant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          is_active: true
        }
      },
      hw_platform_grants: { data: null },
      hw_platform_entitlements: { data: null }
    });
    const res = mockRes();
    const next = jest.fn();
    await guard(
      {
        user: { id: 't1' },
        headers: { 'x-platform-reason': 'tenant trying catalogue write' }
      } as any,
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error.code).toBe('PLATFORM_PERMISSION_DENIED');
    const tables = (supabaseAdmin.from as jest.Mock).mock.calls.map((c) => c[0]);
    expect(tables).not.toContain('hw_permission_grants');
  });

  test('bank users without platform.plans.manage are denied', async () => {
    tableMap({
      users: {
        data: {
          id: 'b1',
          email: 'bank@example.com',
          role: 'agent',
          tenant_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          is_active: true
        }
      },
      hw_platform_grants: { data: null },
      hw_platform_entitlements: { data: null }
    });
    const res = mockRes();
    await guard(
      { user: { id: 'b1' }, headers: { 'x-platform-reason': 'bank catalogue attempt' } } as any,
      res,
      jest.fn()
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error.code).toBe('PLATFORM_PERMISSION_DENIED');
  });

  test('platform.plans.manage grant with reason is allowed', async () => {
    tableMap({
      users: {
        data: {
          id: 'p1',
          email: 'ops@example.com',
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
    const req: any = {
      user: { id: 'p1' },
      headers: { 'x-platform-reason': 'publish invify offering' },
      params: {},
      query: {}
    };
    await guard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.healthContext.isPlatformOperator).toBe(true);
    expect(req.healthContext.permissions).toEqual(['platform.plans.manage']);
  });
});

import request from 'supertest';
import app from '../src/app';
import { supabase } from '../src/db/supabase';

let mockAuthenticatedUser = {
  id: 'user-abc',
  email: 'admin@invify.app',
  role: 'owner',
  tenantId: 'tenant-123' as string | null,
};

jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { ...mockAuthenticatedUser };
    next();
  },
}));

jest.mock('../src/db/supabase', () => {
  const mockFrom = jest.fn();
  const client = {
    from: mockFrom,
    auth: {
      getUser: jest.fn()
    }
  };
  return {
    supabase: client,
    supabaseAdmin: client,
  };
});

describe('P0-3 Subscription Extensions Integration Tests', () => {
  const mockFrom = supabase.from as jest.Mock;
  const mockGetUser = supabase.auth.getUser as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OFFLINE_MOCK_AUTH = 'false';
    mockAuthenticatedUser = {
      id: 'user-abc',
      email: 'admin@invify.app',
      role: 'owner',
      tenantId: 'tenant-123',
    };
  });

  function setupAuth(role: string, tenantId: string | null = 'tenant-123') {
    mockAuthenticatedUser = {
      id: 'user-abc',
      email: 'admin@invify.app',
      role,
      tenantId,
    };
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-abc',
          email: 'admin@invify.app'
        }
      },
      error: null
    });

    const mockSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'user-abc',
        email: 'admin@invify.app',
        role: role,
        tenant_id: tenantId,
        is_active: true
      },
      error: null
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: mockSingle }) }) };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    });
  }

  describe('POST /admin/subscriptions/extend', () => {
    test('Non-super_admin is blocked with 403', async () => {
      setupAuth('owner', 'tenant-123');

      const res = await request(app)
        .post('/admin/subscriptions/extend')
        .set('Authorization', 'Bearer token')
        .send({
          tenantId: 'tenant-123',
          daysToExtend: 30
        });

      expect(res.status).toBe(403);
    });

    test('Super admin extends active subscription successfully', async () => {
      setupAuth('super_admin', null);

      const mockTenants = [{ id: 'tenant-123', name: 'Tenant 123' }];
      const mockActiveSub = {
        id: 'sub-456',
        tenant_id: 'tenant-123',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      };

      const mockUpdatedSub = {
        id: 'sub-456',
        tenant_id: 'tenant-123',
        status: 'active',
        end_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString()
      };

      let capturedUpdate: any = null;
      let capturedEvent: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'super_admin', tenant_id: null, is_active: true, email: 'superadmin@invify.app' }, error: null }) }) }) };
        }
        if (table === 'tenants') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: mockTenants, error: null })
            })
          };
        }
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: mockActiveSub, error: null })
                })
              })
            }),
            update: (updatePayload: any) => {
              capturedUpdate = updatePayload;
              return {
                eq: () => ({
                  select: () => ({
                    single: () => Promise.resolve({ data: mockUpdatedSub, error: null })
                  })
                })
              };
            }
          };
        }
        if (table === 'subscription_events') {
          return {
            insert: (insertPayload: any) => {
              capturedEvent = insertPayload;
              return Promise.resolve({ error: null });
            }
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/admin/subscriptions/extend')
        .set('Authorization', 'Bearer token')
        .send({
          tenantId: 'tenant-123',
          daysToExtend: 30
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchedCount).toBe(1);
      expect(res.body.extendedDays).toBe(30);

      expect(capturedUpdate).toBeDefined();
      expect(capturedEvent).toBeDefined();
      expect(capturedEvent.event_type).toBe('EXTENDED');
      expect(capturedEvent.days_added).toBe(30);
      expect(capturedEvent.performed_by).toBe('admin@invify.app');
    });

    test('Super admin creates new subscription if active does not exist', async () => {
      setupAuth('super_admin', null);

      const mockTenants = [{ id: 'tenant-123', name: 'Tenant 123' }];
      const mockNewSub = {
        id: 'sub-999',
        tenant_id: 'tenant-123',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      let capturedInsert: any = null;
      let capturedEvent: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'super_admin', tenant_id: null, is_active: true, email: 'superadmin@invify.app' }, error: null }) }) }) };
        }
        if (table === 'tenants') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: mockTenants, error: null })
            })
          };
        }
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null })
                })
              })
            }),
            insert: (insertPayload: any) => {
              capturedInsert = insertPayload;
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: mockNewSub, error: null })
                })
              };
            }
          };
        }
        if (table === 'subscription_events') {
          return {
            insert: (insertPayload: any) => {
              capturedEvent = insertPayload;
              return Promise.resolve({ error: null });
            }
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/admin/subscriptions/extend')
        .set('Authorization', 'Bearer token')
        .send({
          tenantId: 'tenant-123',
          daysToExtend: 30
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchedCount).toBe(1);
      expect(res.body.extendedDays).toBe(30);

      expect(capturedInsert).toBeDefined();
      expect(capturedInsert.plan).toBe('standard');
      expect(capturedEvent).toBeDefined();
      expect(capturedEvent.event_type).toBe('CREATED');
      expect(capturedEvent.days_added).toBe(30);
    });

    test('Bulk extension matches multiple tenants and extends them', async () => {
      setupAuth('super_admin', null);

      const mockTenants = [
        { id: 'tenant-1', name: 'Tenant 1' },
        { id: 'tenant-2', name: 'Tenant 2' }
      ];

      let updateCalls = 0;
      let eventCalls = 0;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'super_admin', tenant_id: null, is_active: true, email: 'superadmin@invify.app' }, error: null }) }) }) };
        }
        if (table === 'tenants') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: mockTenants, error: null })
            })
          };
        }
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'sub-id', end_date: new Date().toISOString() }, error: null })
                })
              })
            }),
            update: () => {
              updateCalls++;
              return {
                eq: () => ({
                  select: () => ({
                    single: () => Promise.resolve({ data: { id: 'sub-id' }, error: null })
                  })
                })
              };
            }
          };
        }
        if (table === 'subscription_events') {
          return {
            insert: () => {
              eventCalls++;
              return Promise.resolve({ error: null });
            }
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/admin/subscriptions/extend')
        .set('Authorization', 'Bearer token')
        .send({
          agentCode: 'AGENT-X',
          daysToExtend: 15
        });

      expect(res.status).toBe(200);
      expect(res.body.matchedCount).toBe(2);
      expect(res.body.extendedDays).toBe(15);
      expect(updateCalls).toBe(2);
      expect(eventCalls).toBe(2);
    });
  });

  describe('GET /api/subscription/status', () => {
    test('Standard merchant checks their own subscription status successfully', async () => {
      setupAuth('owner', 'tenant-123');

      const mockActiveSub = {
        id: 'sub-111',
        tenant_id: 'tenant-123',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: mockActiveSub, error: null })
                })
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .get('/api/subscription/status')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tenantId).toBe('tenant-123');
      expect(res.body.daysRemaining).toBe(10);
      expect(res.body.expiresAt).toBe(mockActiveSub.end_date);
    });

    test('Standard merchant trying to spoof and query Tenant B returns 403 Forbidden', async () => {
      setupAuth('owner', 'TenantA');

      const res = await request(app)
        .get('/api/subscription/status?tenantId=TenantB')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('spoofing detected');
    });

    test('Super admin can override and check another tenant subscription status', async () => {
      setupAuth('super_admin', null);

      const mockActiveSub = {
        id: 'sub-222',
        tenant_id: 'TenantB',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'super_admin', tenant_id: null, is_active: true }, error: null }) }) }) };
        }
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: mockActiveSub, error: null })
                })
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .get('/api/subscription/status?tenantId=TenantB')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tenantId).toBe('TenantB');
      expect(res.body.daysRemaining).toBe(25);
    });
  });

  describe('Transient Outage Timeout Handling', () => {
    test('DB timeout during get status returns 503', async () => {
      setupAuth('owner', 'tenant-123');

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.reject(new Error('fetch failed'))
                })
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .get('/api/subscription/status')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Database unavailable');
      expect(res.body.retryable).toBe(true);
      expect(res.body.retryAfterMs).toBe(2000);
    });
  });
});

import request from 'supertest';
import app from '../src/app';
import { supabase } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => {
  const mockFrom = jest.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: jest.fn()
      }
    }
  };
});

describe('P0-2 Device Activations Integration/Unit Tests', () => {
  const mockFrom = supabase.from as jest.Mock;
  const mockGetUser = supabase.auth.getUser as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OFFLINE_MOCK_AUTH = 'false';
  });

  function setupAuth(role: string, tenantId: string | null = 'tenant-id-123') {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-id-abc',
          email: 'user@invify.app'
        }
      },
      error: null
    });

    const mockSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'user-id-abc',
        email: 'user@invify.app',
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

  describe('createActivation', () => {
    test('Non-super_admin must use their own tenantId from JWT and ignore body payload', async () => {
      setupAuth('owner', 'tenant-jwt-777');

      let capturedInsert: any = null;
      const mockInsertSingle = jest.fn().mockImplementation((record: any) => {
        capturedInsert = record;
        return { select: () => ({ single: jest.fn().mockResolvedValue({ data: { activation_code: 'CODE-123', expires_at: new Date().toISOString() }, error: null }) }) };
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-jwt-777', is_active: true }, error: null }) }) }) };
        }
        if (table === 'tenants') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { name: 'My Merchant Store' }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return { insert: mockInsertSingle };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
      });

      const res = await request(app)
        .post('/devices/activations')
        .set('Authorization', 'Bearer token')
        .send({
          tenantId: 'spoofed-tenant-999', // attempted spoof
          durationDays: 45,
          planIndex: 1,
          deviceSuffix: '1'
        });

      expect(res.status).toBe(201);
      expect(capturedInsert).toBeDefined();
      expect(capturedInsert.tenant_id).toBe('tenant-jwt-777'); // strictly from JWT
      expect(capturedInsert.tenant_id).not.toBe('spoofed-tenant-999');
      expect(capturedInsert.device_id).toBeNull(); // No device_id at creation
    });

    test('Super admin can specify a foreign tenantId in request body', async () => {
      setupAuth('super_admin', null); // super admin has null tenant_id in token

      let capturedInsert: any = null;
      const mockInsertSingle = jest.fn().mockImplementation((record: any) => {
        capturedInsert = record;
        return { select: () => ({ single: jest.fn().mockResolvedValue({ data: { activation_code: 'CODE-123', expires_at: new Date().toISOString() }, error: null }) }) };
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'super_admin', tenant_id: null, is_active: true }, error: null }) }) }) };
        }
        if (table === 'tenants') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { name: 'Target Business' }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return { insert: mockInsertSingle };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
      });

      const res = await request(app)
        .post('/devices/activations')
        .set('Authorization', 'Bearer token')
        .send({
          tenantId: 'target-tenant-555',
          durationDays: 30,
          planIndex: 0,
          deviceSuffix: '0'
        });

      expect(res.status).toBe(201);
      expect(capturedInsert).toBeDefined();
      expect(capturedInsert.tenant_id).toBe('target-tenant-555'); // allowed for super_admin
    });

    test('Should calculate expires_at correctly based on durationDays', async () => {
      setupAuth('owner', 'tenant-123');

      let capturedInsert: any = null;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'tenants') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { name: 'Biz' }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return {
            insert: (record: any) => {
              capturedInsert = record;
              return { select: () => ({ single: jest.fn().mockResolvedValue({ data: { activation_code: 'CODE', expires_at: record.expires_at }, error: null }) }) };
            }
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
      });

      const res = await request(app)
        .post('/devices/activations')
        .set('Authorization', 'Bearer token')
        .send({ durationDays: 10 });

      expect(res.status).toBe(201);
      expect(capturedInsert).toBeDefined();
      const expiresAt = new Date(capturedInsert.expires_at);
      const now = new Date();
      const diffTime = expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(10);
    });

    test('Should return 503 retryable on database timeout (no JSON fallback)', async () => {
      setupAuth('owner', 'tenant-123');

      const timeoutError = new Error('fetch failed');
      (timeoutError as any).code = 'UND_ERR_CONNECT_TIMEOUT';

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'tenants') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockRejectedValue(timeoutError) }) }) };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/activations')
        .set('Authorization', 'Bearer token')
        .send({ durationDays: 30 });

      expect(res.status).toBe(503);
      expect(res.body.retryable).toBe(true);
      expect(res.body.error).toContain('Database unavailable');
    });
  });

  describe('validateCode', () => {
    test('Should reject expired activations', async () => {
      setupAuth('owner', 'tenant-123');

      const expiredActivation = {
        activation_code: 'EXPIRED-CODE',
        tenant_id: 'tenant-123',
        is_used: false,
        status: 'pending',
        expires_at: new Date(Date.now() - 10000).toISOString() // 10s ago
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: expiredActivation, error: null })
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/validate')
        .set('Authorization', 'Bearer token')
        .send({ code: 'EXPIRED-CODE', deviceId: 'dev-123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Activation code has expired');
    });

    test('Should reject already used activations', async () => {
      setupAuth('owner', 'tenant-123');

      const usedActivation = {
        activation_code: 'USED-CODE',
        tenant_id: 'tenant-123',
        is_used: true,
        status: 'used',
        expires_at: new Date(Date.now() + 100000).toISOString()
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: usedActivation, error: null })
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/validate')
        .set('Authorization', 'Bearer token')
        .send({ code: 'USED-CODE', deviceId: 'dev-123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Activation code has already been used');
    });

    test('Redemption atomicity: Should fail if the atomic update returns null (concurrent race condition)', async () => {
      setupAuth('owner', 'tenant-123');

      const pendingActivation = {
        activation_code: 'RACE-CODE',
        tenant_id: 'tenant-123',
        is_used: false,
        status: 'pending',
        expires_at: new Date(Date.now() + 100000).toISOString()
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: pendingActivation, error: null })
              })
            }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gt: () => ({
                      select: () => ({
                        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) // atomic lock failed to match (returns null)
                      })
                    })
                  })
                })
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/validate')
        .set('Authorization', 'Bearer token')
        .send({ code: 'RACE-CODE', deviceId: 'dev-123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Activation code is invalid, expired, or has already been used');
    });

    test('Dynamic Device Role: Resolves via terminal_inventory lookup if present', async () => {
      setupAuth('owner', 'tenant-123');

      const pendingActivation = {
        activation_code: 'VALID-CODE',
        tenant_id: 'tenant-123',
        is_used: false,
        status: 'pending',
        device_suffix: '0', // suffix 0 would normally map to TABLET
        expires_at: new Date(Date.now() + 100000).toISOString()
      };

      let capturedDeviceRecord: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: pendingActivation, error: null }) }) }),
            update: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ gt: () => ({ select: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: pendingActivation, error: null }) }) }) }) }) }) })
          };
        }
        if (table === 'terminal_inventory') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'inventory-999', terminal_type: 'mpos' }, // MPOS terminal type
                  error: null
                })
              })
            })
          };
        }
        if (table === 'devices') {
          return {
            upsert: (record: any) => {
              capturedDeviceRecord = record;
              return { select: () => ({ single: jest.fn().mockResolvedValue({ data: record, error: null }) }) };
            }
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/validate')
        .set('Authorization', 'Bearer token')
        .send({ code: 'VALID-CODE', deviceId: 'dev-printer-serial-123' });

      expect(res.status).toBe(200);
      expect(res.body.device_role).toBe('MPOS'); // Mapped from 'mpos' type
      expect(capturedDeviceRecord.device_role).toBe('MPOS');
      expect(capturedDeviceRecord.device_category).toBe('COMPANY_DEVICE');
    });

    test('Dynamic Device Role: Resolves via suffix metadata if not in terminal_inventory', async () => {
      setupAuth('owner', 'tenant-123');

      const pendingActivation = {
        activation_code: 'VALID-CODE',
        tenant_id: 'tenant-123',
        is_used: false,
        status: 'pending',
        device_suffix: '2', // suffix '2' -> PRINTER
        expires_at: new Date(Date.now() + 100000).toISOString()
      };

      let capturedDeviceRecord: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: pendingActivation, error: null }) }) }),
            update: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ gt: () => ({ select: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: pendingActivation, error: null }) }) }) }) }) }) })
          };
        }
        if (table === 'terminal_inventory') {
          return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) }; // not in inventory
        }
        if (table === 'devices') {
          return {
            upsert: (record: any) => {
              capturedDeviceRecord = record;
              return { select: () => ({ single: jest.fn().mockResolvedValue({ data: record, error: null }) }) };
            }
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/validate')
        .set('Authorization', 'Bearer token')
        .send({ code: 'VALID-CODE', deviceId: 'dev-printer-serial-123' });

      expect(res.status).toBe(200);
      expect(res.body.device_role).toBe('PRINTER'); // Mapped from suffix '2'
      expect(capturedDeviceRecord.device_role).toBe('PRINTER');
    });

    test('Should reject activation if code belongs to Tenant A but user JWT belongs to Tenant B', async () => {
      // User JWT has tenant-B
      setupAuth('owner', 'tenant-B');

      const activationA = {
        activation_code: 'CODE-TENANT-A',
        tenant_id: 'tenant-A', // belongs to Tenant A
        is_used: false,
        status: 'pending',
        expires_at: new Date(Date.now() + 100000).toISOString()
      };

      let capturedUpsert = false;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-B', is_active: true }, error: null }) }) }) };
        }
        if (table === 'device_activations') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: activationA, error: null }) }) })
          };
        }
        if (table === 'devices') {
          return {
            upsert: () => {
              capturedUpsert = true;
              return { select: () => ({ single: jest.fn().mockResolvedValue({ data: {}, error: null }) }) };
            }
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/validate')
        .set('Authorization', 'Bearer token')
        .send({ code: 'CODE-TENANT-A', deviceId: 'dev-abc' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('belongs to a different tenant');
      expect(capturedUpsert).toBe(false); // Device must not be provisioned
    });
  });

  describe('onboardDevice (re-onboarding rule)', () => {
    test('COMPANY_DEVICE direct onboarding blocked if NOT already activated', async () => {
      setupAuth('owner', 'tenant-123');

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'terminal_inventory') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'inventory-1', terminal_type: 'tablet' }, // found -> COMPANY_DEVICE hardware
                  error: null
                })
              })
            })
          };
        }
        if (table === 'devices') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) // NOT already activated
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/onboard')
        .set('Authorization', 'Bearer token')
        .send({ deviceId: 'dev-company-abc', deviceInfo: { model: 'Tablet Invify' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Activation code required for company devices');
    });

    test('COMPANY_DEVICE direct onboarding permitted if ALREADY activated (app reinstall)', async () => {
      setupAuth('owner', 'tenant-123');

      let capturedDeviceRecord: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'terminal_inventory') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'inventory-1', terminal_type: 'tablet' }, // COMPANY_DEVICE hardware
                  error: null
                })
              })
            })
          };
        }
        if (table === 'devices') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'dev-uuid-1', device_id: 'dev-company-abc', tenant_id: 'tenant-123', is_active: true }, // ALREADY activated
                  error: null
                })
              })
            }),
            upsert: (record: any) => {
              capturedDeviceRecord = record;
              return { select: () => ({ single: jest.fn().mockResolvedValue({ data: record, error: null }) }) };
            }
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/onboard')
        .set('Authorization', 'Bearer token')
        .send({ deviceId: 'dev-company-abc', deviceInfo: { model: 'Tablet Invify' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(capturedDeviceRecord.device_category).toBe('COMPANY_DEVICE');
      expect(capturedDeviceRecord.device_role).toBe('TABLET');
    });

    test('USER_DEVICE onboarding allowed directly without activation checks', async () => {
      setupAuth('owner', 'tenant-123');

      let capturedDeviceRecord: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: '1', role: 'owner', tenant_id: 'tenant-123', is_active: true }, error: null }) }) }) };
        }
        if (table === 'terminal_inventory') {
          return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) }; // NOT company hardware -> USER_DEVICE
        }
        if (table === 'devices') {
          return {
            upsert: (record: any) => {
              capturedDeviceRecord = record;
              return { select: () => ({ single: jest.fn().mockResolvedValue({ data: record, error: null }) }) };
            }
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/devices/onboard')
        .set('Authorization', 'Bearer token')
        .send({ deviceId: 'dev-user-phone', deviceInfo: { model: 'Google Pixel 8', platform: 'Android' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(capturedDeviceRecord.device_category).toBe('USER_DEVICE');
      expect(capturedDeviceRecord.device_role).toBe('PHONE');
    });
  });
});

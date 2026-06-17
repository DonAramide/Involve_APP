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

describe('P0-1 Hardening Verification Suite', () => {
  const mockFrom = supabase.from as jest.Mock;
  const mockGetUser = supabase.auth.getUser as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OFFLINE_MOCK_AUTH = 'false'; // ensure we don't bypass auth completely
  });

  describe('BLOCKER 1: Protect POST /devices/onboard', () => {
    test('Unauthenticated request must return 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/devices/onboard')
        .send({ deviceId: 'test-device-123' });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Missing or malformed Authorization header');
    });

    test('Authenticated request with valid tenantId must succeed', async () => {
      // Mock auth.getUser to return a user
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-id-123',
            email: 'tenant-owner@example.com'
          }
        },
        error: null
      });

      // Mock users table query to return user profile
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'user-id-123',
          email: 'tenant-owner@example.com',
          role: 'owner',
          tenant_id: 'tenant-id-abc',
          is_active: true
        },
        error: null
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      
      // Mock terminal_inventory lookup and devices upsert
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockUpsertSingle = jest.fn().mockResolvedValue({
        data: { device_id: 'test-device-123', tenant_id: 'tenant-id-abc' },
        error: null
      });
      const mockUpsertSelect = jest.fn().mockReturnValue({ single: mockUpsertSingle });
      const mockUpsert = jest.fn().mockReturnValue({ select: mockUpsertSelect });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: mockSelect };
        }
        if (table === 'terminal_inventory') {
          return { select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) };
        }
        if (table === 'devices') {
          return { upsert: mockUpsert };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
      });

      const res = await request(app)
        .post('/devices/onboard')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send({ deviceId: 'test-device-123', deviceInfo: { model: 'Test Model' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.device.tenant_id).toBe('tenant-id-abc');
      expect(mockFrom).toHaveBeenCalledWith('devices');
    });

    test('tenant_id must always come from req.user.tenantId, never from request body', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-id-123', email: 'tenant-owner@example.com' } },
        error: null
      });

      // Mock profile with tenant_id 'tenant-id-abc'
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'user-id-123', email: 'tenant-owner@example.com', role: 'owner', tenant_id: 'tenant-id-abc', is_active: true },
        error: null
      });
      
      // Mock devices upsert to capture the tenant_id being inserted
      const mockUpsertSingle = jest.fn().mockResolvedValue({
        data: { device_id: 'test-device-123', tenant_id: 'tenant-id-abc' },
        error: null
      });
      
      let capturedRecord: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: mockSingle }) }) };
        }
        if (table === 'terminal_inventory') {
          return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }) }) };
        }
        if (table === 'devices') {
          return {
            upsert: (record: any) => {
              capturedRecord = record;
              return { select: () => ({ single: mockUpsertSingle }) };
            }
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
      });

      // Send payload with spoofed tenantId in request body
      const res = await request(app)
        .post('/devices/onboard')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send({
          deviceId: 'test-device-123',
          tenantId: 'spoofed-tenant-id-xyz', // attempt to spoof in body
          tenant_id: 'spoofed-tenant-id-xyz', // attempt to spoof in body (alternative naming)
          deviceInfo: { model: 'Test Model' }
        });

      expect(res.status).toBe(200);
      expect(capturedRecord).toBeDefined();
      // Verify that the captured record used the tenantId from the JWT profile ('tenant-id-abc')
      // and NOT the spoofed one from the body
      expect(capturedRecord.tenant_id).toBe('tenant-id-abc');
      expect(capturedRecord.tenant_id).not.toBe('spoofed-tenant-id-xyz');
    });
  });

  describe('BLOCKER 2: Protect POST /api/mobile/terminal/sync', () => {
    test('Unauthenticated request must return 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/mobile/terminal/sync')
        .send({ deviceId: 'test-device-123' });
      
      expect(res.status).toBe(401);
    });

    test('Device from Tenant A cannot retrieve Tenant B configuration (403 Forbidden)', async () => {
      // User is from Tenant B (tenant-id-B)
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-id-B', email: 'owner-B@example.com' } },
        error: null
      });

      const mockProfileSingle = jest.fn().mockResolvedValue({
        data: { id: 'user-id-B', email: 'owner-B@example.com', role: 'owner', tenant_id: 'tenant-id-B', is_active: true },
        error: null
      });

      // Device belongs to Tenant A (tenant-id-A)
      const mockDeviceSingle = jest.fn().mockResolvedValue({
        data: { device_id: 'test-device-A', tenant_id: 'tenant-id-A', device_category: 'USER_DEVICE' },
        error: null
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: mockProfileSingle }) }) };
        }
        if (table === 'devices') {
          return { select: () => ({ eq: () => ({ maybeSingle: mockDeviceSingle }) }) };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn(), in: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/api/mobile/terminal/sync')
        .set('Authorization', 'Bearer token-for-tenant-B')
        .send({ deviceId: 'test-device-A' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied. You do not own this device.');
    });

    test('Device from Tenant A can retrieve Tenant A configuration (200 OK)', async () => {
      // User is from Tenant A (tenant-id-A)
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-id-A', email: 'owner-A@example.com' } },
        error: null
      });

      const mockProfileSingle = jest.fn().mockResolvedValue({
        data: { id: 'user-id-A', email: 'owner-A@example.com', role: 'owner', tenant_id: 'tenant-id-A', is_active: true },
        error: null
      });

      // Device belongs to Tenant A (tenant-id-A)
      const mockDeviceSingle = jest.fn().mockResolvedValue({
        data: {
          device_id: 'test-device-A',
          tenant_id: 'tenant-id-A',
          device_category: 'USER_DEVICE',
          tenants: { id: 'tenant-id-A', name: 'Tenant A', plan: 'standard' }
        },
        error: null
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: mockProfileSingle }) }) };
        }
        if (table === 'devices') {
          return { select: () => ({ eq: () => ({ maybeSingle: mockDeviceSingle }) }) };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn(), in: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/api/mobile/terminal/sync')
        .set('Authorization', 'Bearer token-for-tenant-A')
        .send({ deviceId: 'test-device-A' });

      expect(res.status).toBe(200);
      expect(res.body.deviceCategory).toBe('USER_DEVICE');
      expect(res.body.tenantId).toBe('tenant-id-A');
    });
  });

  describe('RECOMMENDATION 1: Tenant Code Collision Handling & Retry Loop', () => {
    test('On unique violation, register retries with a new tenant code up to 3 times', async () => {
      const mockInsert = jest.fn();
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return { insert: mockInsert };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
      });

      // Make attempts 1 and 2 fail with a unique violation (23505), and attempt 3 succeed.
      mockInsert
        .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } })
        .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } })
        .mockResolvedValueOnce({ error: null }); // 3rd attempt succeeds

      const res = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'retry-success@example.com',
          phone: '08023552282',
          password: 'password123',
          emailVerified: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(3);

      // Verify that tenant_code was changed on subsequent attempts
      const firstCallArgs = mockInsert.mock.calls[0][0];
      const secondCallArgs = mockInsert.mock.calls[1][0];
      const thirdCallArgs = mockInsert.mock.calls[2][0];

      expect(firstCallArgs.tenant_code).toBe('2822553208'); // reversed last 10 digits
      expect(secondCallArgs.tenant_code).not.toBe('2822553208'); // suffix appended
      expect(thirdCallArgs.tenant_code).not.toBe('2822553208');
      expect(thirdCallArgs.tenant_code).not.toBe(secondCallArgs.tenant_code);
    });

    test('If unique violation persists after 3 attempts, register fails with 409', async () => {
      const mockInsert = jest.fn();
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return { insert: mockInsert };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
      });

      // Make all 3 attempts fail with unique violation
      mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } });

      const res = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'retry-fail@example.com',
          phone: '08023552282',
          password: 'password123',
          emailVerified: true
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Registration failed: Tenant code conflict could not be resolved');
      expect(mockInsert).toHaveBeenCalledTimes(3);
    });
  });
});

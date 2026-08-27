/**
 * P0-1 Hardening Verification Suite
 *
 * Auth and DB access now use cryptographically verified JWTs + supabaseAdmin.
 * This harness mirrors production call shapes (maybeSingle / limit / thenable builders)
 * without weakening security gates.
 */
process.env.NODE_ENV = 'test';
process.env.BUILD_VARIANT = 'LOCAL';
process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-min!!';
process.env.SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret-32ch!!';
process.env.LICENSE_HMAC_SECRET = 'test-license-hmac-secret-32ch!!';
process.env.OFFLINE_LOCAL_AUTH = 'false';
process.env.OFFLINE_MOCK_AUTH = 'false';
process.env.AUTH_EMAIL_VERIFICATION_REQUIRED = 'true';

jest.mock('../src/db/supabase', () => {
  const mockFrom = jest.fn();
  const mockCreateUser = jest.fn();
  const client = {
    from: mockFrom,
    auth: {
      getUser: jest.fn(),
      admin: {
        createUser: mockCreateUser,
      },
    },
  };
  return {
    supabase: client,
    supabaseAdmin: client,
    __mockFrom: mockFrom,
    __mockCreateUser: mockCreateUser,
  };
});

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { BuildVariantService } from '../src/config/build-variant';

BuildVariantService.resetInstance();

const app = require('../src/app').default;
const supabaseModule = require('../src/db/supabase');
const mockFrom: jest.Mock = supabaseModule.__mockFrom;
const mockCreateUser: jest.Mock = supabaseModule.__mockCreateUser;

type BuilderOpts = {
  awaitResult?: { data: any; error: any };
  maybeSingle?: { data: any; error: any };
  single?: { data: any; error: any };
  limit?: { data: any; error: any };
  insert?: ((payload: any) => { data?: any; error: any }) | { data?: any; error: any };
  upsertCapture?: (record: any) => void;
};

function makeBuilder(opts: BuilderOpts = {}) {
  const builder: any = {};
  const self = () => builder;
  ['select', 'eq', 'ilike', 'in', 'update', 'delete', 'neq', 'order'].forEach((m) => {
    builder[m] = jest.fn(self);
  });
  builder.limit = jest.fn(() => Promise.resolve(opts.limit ?? { data: [], error: null }));
  builder.maybeSingle = jest.fn(() =>
    Promise.resolve(opts.maybeSingle ?? { data: null, error: null }),
  );
  builder.single = jest.fn(() => Promise.resolve(opts.single ?? { data: null, error: null }));
  builder.insert = jest.fn((payload: any) => {
    const result =
      typeof opts.insert === 'function'
        ? opts.insert(payload)
        : (opts.insert ?? { data: null, error: null });
    const p: any = Promise.resolve(result);
    p.select = () => ({
      single: () =>
        Promise.resolve(
          result.data !== undefined ? result : { data: { ...payload, id: payload.id }, error: null },
        ),
    });
    return p;
  });
  builder.upsert = jest.fn((record: any) => {
    opts.upsertCapture?.(record);
    return {
      select: () => ({
        single: () => Promise.resolve(opts.single ?? { data: record, error: null }),
      }),
    };
  });
  // PostgREST builders are thenable — e.g. await .select().ilike().eq()
  builder.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(opts.awaitResult ?? { data: null, error: null }).then(onFulfilled, onRejected);
  return builder;
}

function signAccessToken(claims: {
  sub: string;
  email: string;
  tenant_id: string;
  role?: string;
}) {
  const role = claims.role || 'owner';
  return jwt.sign(
    {
      sub: claims.sub,
      email: claims.email,
      role: 'authenticated',
      app_metadata: { role, tenant_id: claims.tenant_id },
      user_metadata: { role, tenantId: claims.tenant_id },
    },
    process.env.SUPABASE_JWT_SECRET as string,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

describe('P0-1 Hardening Verification Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUILD_VARIANT = 'LOCAL';
    process.env.OFFLINE_LOCAL_AUTH = 'false';
    process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-min!!';
    process.env.SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret-32ch!!';
    BuildVariantService.resetInstance();
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
      const profile = {
        id: 'user-id-onboard-ok',
        email: 'tenant-owner@example.com',
        role: 'owner',
        tenant_id: 'tenant-id-abc',
        is_active: true,
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return makeBuilder({ maybeSingle: { data: profile, error: null } });
        }
        if (table === 'terminal_inventory') {
          return makeBuilder({ maybeSingle: { data: null, error: null } });
        }
        if (table === 'devices') {
          return makeBuilder({
            single: {
              data: { device_id: 'test-device-123', tenant_id: 'tenant-id-abc' },
              error: null,
            },
          });
        }
        return makeBuilder();
      });

      const token = signAccessToken({
        sub: profile.id,
        email: profile.email,
        tenant_id: profile.tenant_id,
      });

      const res = await request(app)
        .post('/devices/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId: 'test-device-123', deviceInfo: { model: 'Test Model' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.device.tenant_id).toBe('tenant-id-abc');
      expect(mockFrom).toHaveBeenCalledWith('devices');
    });

    test('tenant_id must always come from req.user.tenantId, never from request body', async () => {
      const profile = {
        id: 'user-id-onboard-spoof',
        email: 'tenant-owner@example.com',
        role: 'owner',
        tenant_id: 'tenant-id-abc',
        is_active: true,
      };

      let capturedRecord: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return makeBuilder({ maybeSingle: { data: profile, error: null } });
        }
        if (table === 'terminal_inventory') {
          return makeBuilder({ maybeSingle: { data: null, error: null } });
        }
        if (table === 'devices') {
          return makeBuilder({
            upsertCapture: (record) => {
              capturedRecord = record;
            },
            single: {
              data: { device_id: 'test-device-123', tenant_id: 'tenant-id-abc' },
              error: null,
            },
          });
        }
        return makeBuilder();
      });

      const token = signAccessToken({
        sub: profile.id,
        email: profile.email,
        tenant_id: profile.tenant_id,
      });

      const res = await request(app)
        .post('/devices/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deviceId: 'test-device-123',
          tenantId: 'spoofed-tenant-id-xyz',
          tenant_id: 'spoofed-tenant-id-xyz',
          deviceInfo: { model: 'Test Model' },
        });

      expect(res.status).toBe(200);
      expect(capturedRecord).toBeDefined();
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
      const profile = {
        id: 'user-id-sync-B',
        email: 'owner-B@example.com',
        role: 'owner',
        tenant_id: 'tenant-id-B',
        is_active: true,
      };

      const deviceRow = {
        device_id: 'test-device-A',
        tenant_id: 'tenant-id-A',
        device_category: 'USER_DEVICE',
        device_role: 'PHONE',
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return makeBuilder({ maybeSingle: { data: profile, error: null } });
        }
        if (table === 'device_registrations') {
          return makeBuilder({ limit: { data: [deviceRow], error: null } });
        }
        if (table === 'devices') {
          return makeBuilder({ limit: { data: [deviceRow], error: null } });
        }
        if (table === 'terminal_inventory') {
          // No inventory assignment → ownership mismatch must deny (not rebind)
          return makeBuilder({ maybeSingle: { data: null, error: null } });
        }
        return makeBuilder({ awaitResult: { data: [], error: null } });
      });

      const token = signAccessToken({
        sub: profile.id,
        email: profile.email,
        tenant_id: profile.tenant_id,
      });

      const res = await request(app)
        .post('/api/mobile/terminal/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId: 'test-device-A' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied. You do not own this device.');
    });

    test('Device from Tenant A can retrieve Tenant A configuration (200 OK)', async () => {
      const profile = {
        id: 'user-id-sync-A',
        email: 'owner-A@example.com',
        role: 'owner',
        tenant_id: 'tenant-id-A',
        is_active: true,
      };

      const deviceRow = {
        device_id: 'test-device-A',
        tenant_id: 'tenant-id-A',
        device_category: 'USER_DEVICE',
        device_role: 'PHONE',
        tenants: { id: 'tenant-id-A', name: 'Tenant A', plan: 'standard' },
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return makeBuilder({ maybeSingle: { data: profile, error: null } });
        }
        if (table === 'device_registrations') {
          return makeBuilder({ limit: { data: [deviceRow], error: null } });
        }
        if (table === 'devices') {
          return makeBuilder({ limit: { data: [deviceRow], error: null } });
        }
        if (table === 'terminal_inventory') {
          return makeBuilder({ maybeSingle: { data: null, error: null } });
        }
        if (table === 'tenants') {
          return makeBuilder({
            maybeSingle: {
              data: { id: 'tenant-id-A', name: 'Tenant A', plan: 'standard', type: 'retail' },
              error: null,
            },
          });
        }
        return makeBuilder({ awaitResult: { data: [], error: null } });
      });

      const token = signAccessToken({
        sub: profile.id,
        email: profile.email,
        tenant_id: profile.tenant_id,
      });

      const res = await request(app)
        .post('/api/mobile/terminal/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId: 'test-device-A' });

      expect(res.status).toBe(200);
      expect(res.body.deviceCategory).toBe('USER_DEVICE');
      expect(res.body.tenantId).toBe('tenant-id-A');
    });
  });

  describe('RECOMMENDATION 1: Tenant Code Collision Handling & Retry Loop', () => {
    test('On unique violation, register retries with a new tenant code up to 3 times', async () => {
      const mockInsert = jest.fn();
      mockInsert
        .mockResolvedValueOnce({
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        })
        .mockResolvedValueOnce({
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        })
        .mockResolvedValueOnce({ error: null });

      mockCreateUser.mockResolvedValue({
        data: { user: { id: 'user-reg-success' } },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return makeBuilder({
            awaitResult: { data: [], error: null },
            insert: (payload: any) => mockInsert(payload),
          });
        }
        if (table === 'users') {
          return makeBuilder({ insert: { error: null } });
        }
        return makeBuilder({ awaitResult: { data: [], error: null } });
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'retry-success@example.com',
          phone: '08023552282',
          password: 'password123',
          emailVerified: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(3);

      const firstCallArgs = mockInsert.mock.calls[0][0];
      const secondCallArgs = mockInsert.mock.calls[1][0];
      const thirdCallArgs = mockInsert.mock.calls[2][0];

      expect(firstCallArgs.tenant_code).toBe('2822553208'); // reversed last 10 digits
      expect(secondCallArgs.tenant_code).not.toBe('2822553208');
      expect(thirdCallArgs.tenant_code).not.toBe('2822553208');
      expect(thirdCallArgs.tenant_code).not.toBe(secondCallArgs.tenant_code);
    });

    test('If unique violation persists after 3 attempts, register fails with 409', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return makeBuilder({
            awaitResult: { data: [], error: null },
            insert: (payload: any) => mockInsert(payload),
          });
        }
        return makeBuilder({ awaitResult: { data: [], error: null } });
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'retry-fail@example.com',
          phone: '08023552282',
          password: 'password123',
          emailVerified: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain(
        'Registration failed: Tenant code conflict could not be resolved',
      );
      expect(mockInsert).toHaveBeenCalledTimes(3);
    });
  });
});

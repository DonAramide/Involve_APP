/**
 * Phase 3 — Environment safety + payment idempotency scoping tests.
 */
describe('Phase 3 — Environment & Idempotency', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    try {
      require('../src/config/build-variant').BuildVariantService.resetInstance();
    } catch {
      /* ignore */
    }
  });

  describe('BuildVariant fail-fast', () => {
    test('NODE_ENV=production without BUILD_VARIANT throws', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.BUILD_VARIANT;
      delete process.env.APP_ENV;
      delete process.env.BUILD_PROFILE;
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      expect(() => require('../src/config/build-variant').BuildVariantService.getInstance()).toThrow(
        /BUILD_VARIANT/,
      );
    });

    test('BUILD_VARIANT=LOCAL with NODE_ENV=production throws', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'LOCAL';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      expect(() => require('../src/config/build-variant').BuildVariantService.getInstance()).toThrow(
        /Refusing LOCAL/,
      );
    });

    test('BUILD_VARIANT=PROD resolves under NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const v = require('../src/config/build-variant').BuildVariantService.getInstance();
      expect(v.isProd()).toBe(true);
    });

    test('unset BUILD_VARIANT defaults to LOCAL only when not claiming production', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.BUILD_VARIANT;
      delete process.env.APP_ENV;
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const v = require('../src/config/build-variant').BuildVariantService.getInstance();
      expect(v.isLocal()).toBe(true);
    });
  });

  describe('SecurityBoot production assertions', () => {
    test('rejects mock auth under PROD', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.OFFLINE_LOCAL_AUTH = 'true';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      process.env.SUPABASE_JWT_SECRET = 'prod-supabase-jwt-secret-32ch!!';
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32ch!!';
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-anon-key-placeholder';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-service-role-key';
      process.env.PROD_AGENT_PORTAL_URL = 'https://admin.invify.app/agent/reset-password';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const { assertSecureBootConfiguration } = require('../src/config/security-boot');
      expect(() => assertSecureBootConfiguration()).toThrow(/offline\/mock auth/);
    });

    test('rejects missing JWT_SECRET under PROD', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      delete process.env.JWT_SECRET;
      process.env.SUPABASE_JWT_SECRET = 'prod-supabase-jwt-secret-32ch!!';
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32ch!!';
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-anon-key-placeholder';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-service-role-key';
      process.env.PROD_AGENT_PORTAL_URL = 'https://admin.invify.app/agent/reset-password';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const { assertSecureBootConfiguration } = require('../src/config/security-boot');
      expect(() => assertSecureBootConfiguration()).toThrow(/JWT_SECRET/);
    });

    test('rejects localhost Supabase URL under STAGING', () => {
      process.env.NODE_ENV = 'staging';
      process.env.BUILD_VARIANT = 'STAGING';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      process.env.JWT_SECRET = 'staging-jwt-secret-key-32chars!!';
      process.env.SUPABASE_JWT_SECRET = 'staging-supabase-jwt-secret-32!!';
      process.env.LICENSE_HMAC_SECRET = 'staging-license-hmac-secret-32!!';
      process.env.STAGING_SUPABASE_URL = 'http://localhost:54321';
      process.env.STAGING_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_staging-placeholder-key';
      process.env.STAGING_SUPABASE_SECRET_KEY = 'sb_secret_staging-placeholder-key';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const { assertSecureBootConfiguration } = require('../src/config/security-boot');
      expect(() => assertSecureBootConfiguration()).toThrow(/development endpoint|Supabase/);
    });

    test('rejects production domains in STAGING CORS or Supabase URL', () => {
      process.env.NODE_ENV = 'staging';
      process.env.BUILD_VARIANT = 'STAGING';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      process.env.JWT_SECRET = 'staging-jwt-secret-key-32chars!!';
      process.env.SUPABASE_JWT_SECRET = 'staging-supabase-jwt-secret-32!!';
      process.env.LICENSE_HMAC_SECRET = 'staging-license-hmac-secret-32!!';
      process.env.STAGING_SUPABASE_URL = 'https://staging.invify.local';
      process.env.STAGING_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_staging-placeholder-key';
      process.env.STAGING_SUPABASE_SECRET_KEY = 'sb_secret_staging-placeholder-key';
      process.env.CORS_ORIGINS = 'https://app.invify.org';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const { assertSecureBootConfiguration } = require('../src/config/security-boot');
      expect(() => assertSecureBootConfiguration()).toThrow(/Production domains must not be allowed/);
    });
  });

  describe('Payment idempotency tenant scoping (mock registry)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      process.env.BUILD_VARIANT = 'LOCAL';
      process.env.IDEMPOTENCY_USE_MOCK = 'true';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const { IdempotencyRegistry } = require('../src/services/idempotency/IdempotencyRegistry');
      IdempotencyRegistry.clearMockData();
    });

    test('same key + same tenant + same operation → duplicate rejected / replay', async () => {
      const { IdempotencyRegistry } = require('../src/services/idempotency/IdempotencyRegistry');
      const tenant = '11111111-1111-1111-1111-111111111111';
      await IdempotencyRegistry.insertKey({
        tenant_id: tenant,
        operation: 'payment.create',
        idempotency_key: 'idem-abc',
        status: 'COMPLETED',
        response_body: { reference: 'QNX-1' },
      });

      await expect(
        IdempotencyRegistry.insertKey({
          tenant_id: tenant,
          operation: 'payment.create',
          idempotency_key: 'idem-abc',
          status: 'PENDING',
        }),
      ).rejects.toMatchObject({ code: '23505' });

      const existing = await IdempotencyRegistry.getKeyScoped(tenant, 'payment.create', 'idem-abc');
      expect(existing?.response_body).toEqual({ reference: 'QNX-1' });
    });

    test('same key + different tenant → no cross-tenant collision', async () => {
      const { IdempotencyRegistry } = require('../src/services/idempotency/IdempotencyRegistry');
      const t1 = '11111111-1111-1111-1111-111111111111';
      const t2 = '22222222-2222-2222-2222-222222222222';

      await IdempotencyRegistry.insertKey({
        tenant_id: t1,
        operation: 'payment.create',
        idempotency_key: 'shared-key',
        status: 'COMPLETED',
        response_body: { reference: 'T1' },
      });

      const t2Row = await IdempotencyRegistry.insertKey({
        tenant_id: t2,
        operation: 'payment.create',
        idempotency_key: 'shared-key',
        status: 'COMPLETED',
        response_body: { reference: 'T2' },
      });

      expect(t2Row.tenant_id).toBe(t2);
      const t1Row = await IdempotencyRegistry.getKeyScoped(t1, 'payment.create', 'shared-key');
      expect(t1Row?.response_body).toEqual({ reference: 'T1' });
      expect(t2Row.response_body).toEqual({ reference: 'T2' });
    });
  });

  describe('Health contract', () => {
    let app: any;
    beforeAll(() => {
      process.env.NODE_ENV = 'test';
      process.env.BUILD_VARIANT = 'LOCAL';
      process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-min!!';
      process.env.SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret-32ch!!';
      process.env.LICENSE_HMAC_SECRET = 'test-license-hmac-secret-32ch!!';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      app = require('../src/app').default;
    });

    test('GET /livez returns 200', async () => {
      const request = require('supertest');
      const res = await request(app).get('/livez');
      expect(res.status).toBe(200);
    });

    test('GET /readyz returns status payload', async () => {
      const request = require('supertest');
      const res = await request(app).get('/readyz');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toBeDefined();
    });

    test('GET /health compatibility endpoint returns 200', async () => {
      const request = require('supertest');
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });
});

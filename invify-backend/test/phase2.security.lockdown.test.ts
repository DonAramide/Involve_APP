/**
 * Phase 2 security & financial lockdown tests.
 * Uses BUILD_VARIANT / env manipulation carefully with BuildVariantService.resetInstance().
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

describe('Phase 2 — Security & Financial Lockdown', () => {
  const originalEnv = { ...process.env };
  let app: any;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ENV = 'test';
    process.env.BUILD_VARIANT = 'LOCAL';
    process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-min!!';
    process.env.SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret-32ch!!';
    process.env.LICENSE_HMAC_SECRET = 'test-license-hmac-secret-32ch!!';
    process.env.OFFLINE_LOCAL_AUTH = 'false';
    require('../src/config/build-variant').BuildVariantService.resetInstance();
    app = require('../src/app').default;
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  describe('A1 — Payment routes require authentication', () => {
    const paths = [
      ['post', '/payments/create'],
      ['post', '/payments/initialize'],
      ['post', '/payments/intents'],
      ['get', '/payments/intents/abc'],
      ['post', '/payments/intents/abc/cancel'],
      ['post', '/payments/intents/abc/refund'],
      ['get', '/payments/history'],
      ['get', '/api/admin/finance/disputes'],
      ['post', '/api/admin/finance/disputes'],
      ['post', '/api/admin/finance/disputes/abc/approve'],
      ['post', '/api/admin/finance/disputes/abc/reject'],
    ] as const;

    paths.forEach(([method, path]) => {
      test(`${method.toUpperCase()} ${path} without auth → 401`, async () => {
        const res = await (request(app) as any)[method](path).send({ amount: 100 });
        expect(res.status).toBe(401);
      });
    });
  });

  describe('B1 — JWT verification fail-closed', () => {
    test('forged JWT rejected when secret configured', async () => {
      process.env.BUILD_VARIANT = 'LOCAL';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      process.env.SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret-32ch!!';
      require('../src/config/build-variant').BuildVariantService.resetInstance();

      const forged = jwt.sign(
        { sub: 'attacker', role: 'super_admin', email: 'x@y.com' },
        'wrong-secret-key-not-the-real-one!!',
      );

      const res = await request(app)
        .get('/payments/history')
        .set('Authorization', `Bearer ${forged}`);
      expect([401, 503]).toContain(res.status);
    });

    test('STAGING rejects mock-super-admin', async () => {
      process.env.BUILD_VARIANT = 'STAGING';
      process.env.SUPABASE_JWT_SECRET = 'staging-supabase-jwt-secret-32!!';
      process.env.JWT_SECRET = 'staging-jwt-secret-key-32chars!!!';
      process.env.LICENSE_HMAC_SECRET = 'staging-license-hmac-secret-32!!';
      require('../src/config/build-variant').BuildVariantService.resetInstance();

      const res = await request(app)
        .get('/payments/history')
        .set('Authorization', 'Bearer mock-super-admin');
      expect(res.status).toBe(401);

      process.env.BUILD_VARIANT = 'LOCAL';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
    });

    test('PROD rejects mock-super-admin', async () => {
      process.env.BUILD_VARIANT = 'PROD';
      process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
      process.env.SUPABASE_JWT_SECRET = 'prod-supabase-jwt-secret-32chars!';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!!';
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32chars!';
      require('../src/config/build-variant').BuildVariantService.resetInstance();

      const res = await request(app)
        .post('/payments/intents/abc/refund')
        .set('Authorization', 'Bearer mock-super-admin')
        .send({ amount: 10 });
      expect(res.status).toBe(401);

      process.env.BUILD_VARIANT = 'LOCAL';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
    });
  });

  describe('A6 — Payout feature gate', () => {
    test('withdraw blocked when FEATURE_REAL_MONEY_PAYOUTS unset', async () => {
      process.env.BUILD_VARIANT = 'LOCAL';
      delete process.env.FEATURE_REAL_MONEY_PAYOUTS;
      require('../src/config/build-variant').BuildVariantService.resetInstance();

      // LOCAL mock token allowed
      process.env.OFFLINE_LOCAL_AUTH = 'true';
      require('../src/config/constants');

      const res = await request(app)
        .post('/api/payout/withdraw')
        .set('Authorization', 'Bearer mock-super-admin')
        .set('x-tenant-id', '00000000-0000-0000-0000-000000000099')
        .send({ amount: 5000 });

      // Either feature gate 403 or role/tenant handling — must not succeed
      expect(res.status).not.toBe(200);
      expect([400, 403, 500]).toContain(res.status);

      process.env.OFFLINE_LOCAL_AUTH = 'false';
    });
  });

  describe('A4 — Webhook mock secret removed', () => {
    test('source contract: whsec_mock_quasar_key must not be used as fallback', () => {
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '../src/controllers/webhook.controller.ts'),
        'utf8',
      );
      expect(src).not.toMatch(/pushSecret\(\s*['"]whsec_mock_quasar_key['"]\s*\)/);
    });
  });

  describe('B3/B4 — No automatic super_admin / email hardcodes in auth middleware', () => {
    test('auth.middleware does not hardcode email → super_admin', () => {
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '../src/middleware/auth.middleware.ts'),
        'utf8',
      );
      expect(src).not.toContain('averyd777@gmail.com');
      expect(src).not.toMatch(/decodedRole\s*=\s*[\s\S]{0,80}'super_admin'/);
    });
  });

  describe('D — JWT secret fallback removed', () => {
    test('onboarding controller has no hardcoded JWT fallback', () => {
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '../src/controllers/onboarding.controller.ts'),
        'utf8',
      );
      expect(src).not.toContain('your-super-secret-key-2026');
    });

    test('security boot refuses known insecure JWT default in staging', () => {
      process.env.NODE_ENV = 'staging';
      process.env.BUILD_VARIANT = 'STAGING';
      process.env.APP_ENV = 'staging';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      process.env.OFFLINE_MOCK_AUTH = 'false';
      process.env.JWT_SECRET = 'your-super-secret-key-2026';
      process.env.SUPABASE_JWT_SECRET = 'staging-supabase-jwt-secret-32!!';
      process.env.LICENSE_HMAC_SECRET = 'staging-license-hmac-secret-32!!';
      process.env.STAGING_SUPABASE_URL = 'https://staging-project.supabase.co';
      process.env.STAGING_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_staging-placeholder-key';
      process.env.STAGING_SUPABASE_SECRET_KEY = 'sb_secret_staging-placeholder-key';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const { assertSecureBootConfiguration } = require('../src/config/security-boot');
      expect(() => assertSecureBootConfiguration()).toThrow(/insecure default/);
    });
  });

  describe('C — Compromised license HMAC constant removed from backend', () => {
    test('license.util does not embed INVOLVE-SECURE-HMAC-SECRET-2024', () => {
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(path.join(__dirname, '../src/utils/license.util.ts'), 'utf8');
      expect(src).not.toContain('INVOLVE-SECURE-HMAC-SECRET-2024');
    });
  });

  describe('Refund fail-closed contract', () => {
    test('payment.service does not proceed locally after Quasar refund failure', () => {
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(path.join(__dirname, '../src/services/payment.service.ts'), 'utf8');
      expect(src).not.toMatch(/Quasar refund[\s\S]{0,80}proceeding locally/i);
      expect(src).toMatch(/failing closed/i);
    });
  });
});

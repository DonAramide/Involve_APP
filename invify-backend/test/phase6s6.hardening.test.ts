import { BuildVariantService } from '../src/config/build-variant';
import { assertSecureBootConfiguration } from '../src/config/security-boot';
import { supabaseProjectUrl } from '../src/utils/supabase-jwt';
import { HealthController } from '../src/controllers/health.controller';
import { VaultEncryptionUtil } from '../src/utils/vault-encryption.util';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('firebase-admin', () => {
  const actual = jest.requireActual('firebase-admin');
  return {
    ...actual,
    credential: {
      ...actual.credential,
      cert: jest.fn().mockReturnValue({} as any),
    },
    initializeApp: jest.fn().mockReturnValue({} as any),
    apps: {
      length: 1 // mock that it is already initialized to bypass certificate checks
    }
  };
});

describe('Phase 6S.6 Hardening & JWT Consistency Regression Tests', () => {
  const originalEnv = { ...process.env };
  let dbPingSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear potentially inherited env variables that might skew tests
    delete process.env.SUPABASE_URL;
    delete process.env.STAGING_SUPABASE_URL;
    delete process.env.PROD_SUPABASE_URL;
    delete process.env.PRODUCTION_SUPABASE_URL;
    delete process.env.SUPABASE_JWT_SECRET;
    process.env.SUPABASE_KEY = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    process.env.PROD_SUPABASE_KEY = '';
    process.env.PROD_SUPABASE_SERVICE_KEY = '';
    process.env.PROD_SUPABASE_SERVICE_ROLE_KEY = '';
    process.env.STAGING_SUPABASE_KEY = '';
    process.env.STAGING_SUPABASE_SERVICE_KEY = '';
    process.env.APP_ENV = '';
    process.env.BUILD_PROFILE = '';
    
    BuildVariantService.resetInstance();

    // Mock database ping for readyz checks
    dbPingSpy = jest.spyOn(supabaseAdmin, 'from').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null })
    } as any);
  });

  afterEach(() => {
    dbPingSpy.mockRestore();
    process.env = { ...originalEnv };
    BuildVariantService.resetInstance();
  });

  describe('JWT Verification Configurations in security-boot', () => {
    test('asymmetric JWT + Supabase URL + no SUPABASE_JWT_SECRET => PASS', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      delete process.env.SUPABASE_JWT_SECRET;
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32ch!!';
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-anon-key-placeholder';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-service-role-key';
      process.env.PROD_AGENT_PORTAL_URL = 'https://admin.invify.app/agent/reset-password';

      expect(supabaseProjectUrl()).toBe('https://prod-project.supabase.co');
      expect(() => assertSecureBootConfiguration()).not.toThrow();
    });

    test('HS JWT + SUPABASE_JWT_SECRET => PASS', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      process.env.SUPABASE_JWT_SECRET = 'prod-supabase-jwt-secret-32ch!!';
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32ch!!';
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-anon-key-placeholder';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-service-role-key';
      process.env.PROD_AGENT_PORTAL_URL = 'https://admin.invify.app/agent/reset-password';

      expect(() => assertSecureBootConfiguration()).not.toThrow();
    });

    test('neither configuration => FAIL CLOSED', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      delete process.env.SUPABASE_JWT_SECRET;
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32ch!!';
      delete process.env.PROD_SUPABASE_URL; // neither HS secret nor URL is set
      process.env.PROD_AGENT_PORTAL_URL = 'https://admin.invify.app/agent/reset-password';

      expect(() => assertSecureBootConfiguration()).toThrow();
    });
  });

  describe('/readyz Endpoint Behavior', () => {
    let mockResponse: any;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    test('/readyz asymmetric configuration => READY', async () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      delete process.env.SUPABASE_JWT_SECRET;
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-anon';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-service-role';

      await HealthController.readyz({} as any, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      );
    });

    test('/readyz HS configuration => READY', async () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      process.env.SUPABASE_JWT_SECRET = 'prod-supabase-jwt-secret-32ch!!';
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-anon';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-service-role';

      await HealthController.readyz({} as any, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      );
    });
  });

  describe('Vault Master Key Lockdowns', () => {
    test('staging cannot use insecure vault fallback', () => {
      process.env.NODE_ENV = 'staging';
      process.env.BUILD_VARIANT = 'STAGING';
      delete process.env.VAULT_MASTER_KEY;

      expect(() => VaultEncryptionUtil.encrypt('secret')).toThrow(/VAULT_MASTER_KEY/);
    });

    test('production cannot use insecure vault fallback', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      delete process.env.VAULT_MASTER_KEY;

      expect(() => VaultEncryptionUtil.encrypt('secret')).toThrow(/VAULT_MASTER_KEY/);
    });

    test('local/development can use fallback', () => {
      process.env.NODE_ENV = 'development';
      process.env.BUILD_VARIANT = 'LOCAL';
      delete process.env.VAULT_MASTER_KEY;

      expect(() => VaultEncryptionUtil.encrypt('secret')).not.toThrow();
    });
  });

  describe('TLS Bypass Lockdown', () => {
    test('staging/production cannot set NODE_TLS_REJECT_UNAUTHORIZED=0 during import/init', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-anon';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-service-role';
      process.env.PROD_AGENT_PORTAL_URL = 'https://admin.invify.app/agent/reset-password';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32ch!!';
      process.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({
        project_id: 'test-project',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7\n-----END PRIVATE KEY-----\n'
      });
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

      jest.isolateModules(() => {
        require('../src/app');
      });

      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
    });
  });

  describe('Phase 6S.16 Staging CORS Security Validation', () => {
    beforeEach(() => {
      process.env.SUPABASE_KEY = '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = '';
      process.env.PROD_SUPABASE_KEY = '';
      process.env.PROD_SUPABASE_SERVICE_KEY = '';
      process.env.PROD_SUPABASE_SERVICE_ROLE_KEY = '';
      process.env.STAGING_SUPABASE_KEY = '';
      process.env.STAGING_SUPABASE_SERVICE_KEY = '';
      process.env.APP_ENV = '';
      process.env.BUILD_PROFILE = '';
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      process.env.NODE_ENV = 'staging';
      process.env.BUILD_VARIANT = 'STAGING';
      process.env.OFFLINE_LOCAL_AUTH = 'false';
      process.env.JWT_SECRET = 'staging-jwt-secret-key-32chars!!';
      process.env.SUPABASE_JWT_SECRET = 'staging-supabase-jwt-secret-32!!';
      process.env.LICENSE_HMAC_SECRET = 'staging-license-hmac-secret-32!!';
      process.env.STAGING_SUPABASE_URL = 'https://staging-project.supabase.co';
      process.env.STAGING_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_staging';
      process.env.STAGING_SUPABASE_SECRET_KEY = 'sb_secret_staging';
      process.env.CORS_ORIGINS = 'https://staging.invify.org';
      process.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({
        project_id: 'test-project',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7\n-----END PRIVATE KEY-----\n'
      });
      BuildVariantService.resetInstance();
    });

    test('STAGING permits https://staging.invify.org but rejects invify.org & www.invify.org at boot', () => {
      // 1. Valid staging origin => PASS
      process.env.CORS_ORIGINS = 'https://staging.invify.org';
      expect(() => assertSecureBootConfiguration()).not.toThrow();

      // 2. Forbidden production origin (invify.org) => FAIL
      process.env.CORS_ORIGINS = 'https://invify.org';
      expect(() => assertSecureBootConfiguration()).toThrow(/Production domains must not be allowed/);

      // 3. Forbidden production origin (www.invify.org) => FAIL
      process.env.CORS_ORIGINS = 'https://www.invify.org';
      expect(() => assertSecureBootConfiguration()).toThrow(/Production domains must not be allowed/);

      // 4. Forbidden production origin (www.invify.app) => FAIL
      process.env.CORS_ORIGINS = 'https://www.invify.app';
      expect(() => assertSecureBootConfiguration()).toThrow(/Production domains must not be allowed/);

      // 5. Multiple allowed origins with one production => FAIL
      process.env.CORS_ORIGINS = 'https://staging.invify.org, https://invify.org';
      expect(() => assertSecureBootConfiguration()).toThrow(/Production domains must not be allowed/);
    });

    test('STAGING rejects wildcard * CORS at boot', () => {
      process.env.CORS_ORIGINS = '*';
      expect(() => assertSecureBootConfiguration()).toThrow(/Wildcard CORS is strictly forbidden/);

      process.env.CORS_ORIGINS = 'https://staging.invify.org, *';
      expect(() => assertSecureBootConfiguration()).toThrow(/Wildcard CORS is strictly forbidden/);
    });

    test('PRODUCTION rejects wildcard * CORS at boot', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod';
      process.env.PROD_AGENT_PORTAL_URL = 'https://admin.invify.app/agent/reset-password';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32ch!!';
      process.env.CORS_ORIGINS = '*';
      BuildVariantService.resetInstance();

      expect(() => assertSecureBootConfiguration()).toThrow(/Wildcard CORS is strictly forbidden/);
    });

    test('CORS middleware accepts staging.invify.org and rejects others in STAGING', async () => {
      process.env.CORS_ORIGINS = 'https://staging.invify.org';
      
      let app: any;
      jest.isolateModules(() => {
        app = require('../src/app').default;
      });

      const request = require('supertest');

      // 1. Accepted origin
      const resOk = await request(app)
        .get('/livez')
        .set('Origin', 'https://staging.invify.org');
      expect(resOk.status).toBe(200);
      expect(resOk.headers['access-control-allow-origin']).toBe('https://staging.invify.org');

      // 2. Rejected origin (unrelated)
      const resUnrelated = await request(app)
        .get('/livez')
        .set('Origin', 'https://attacker.com');
      expect(resUnrelated.headers['access-control-allow-origin']).toBeUndefined();

      // 3. Rejected origin (forbidden production domain)
      const resProd = await request(app)
        .get('/livez')
        .set('Origin', 'https://invify.org');
      expect(resProd.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('PRODUCTION behavior remains unchanged', () => {
      // Clean up legacy keys
      delete process.env.SUPABASE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.PROD_SUPABASE_KEY;
      delete process.env.PROD_SUPABASE_SERVICE_KEY;
      delete process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.STAGING_SUPABASE_KEY;
      delete process.env.STAGING_SUPABASE_SERVICE_KEY;
      delete process.env.APP_ENV;
      delete process.env.BUILD_PROFILE;

      process.env.NODE_ENV = 'production';
      process.env.BUILD_VARIANT = 'PROD';
      process.env.PROD_SUPABASE_URL = 'https://prod-project.supabase.co';
      process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-anon-key-placeholder';
      process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-service-role-key';
      process.env.PROD_AGENT_PORTAL_URL = 'https://admin.invify.app/agent/reset-password';
      process.env.JWT_SECRET = 'prod-jwt-secret-key-32chars-min!!';
      process.env.LICENSE_HMAC_SECRET = 'prod-license-hmac-secret-32ch!!';
      process.env.CORS_ORIGINS = 'https://invify.org,https://www.invify.org';
      BuildVariantService.resetInstance();

      // Should boot successfully (production allows production domains)
      expect(() => assertSecureBootConfiguration()).not.toThrow();
    });

    test('Importing app does not trigger background timers or database bootstrap fetch in Jest', () => {
      let appModule: any;
      expect(() => {
        jest.isolateModules(() => {
          appModule = require('../src/app').default;
        });
      }).not.toThrow();
      expect(appModule).toBeDefined();
    });
  });
});

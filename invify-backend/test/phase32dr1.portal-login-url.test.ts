import { BuildVariantService } from '../src/config/build-variant';
import { EmailService } from '../src/services/email.service';

function resetVariantEnv(extra: Record<string, string | undefined> = {}) {
  const keys = [
    'BUILD_VARIANT',
    'APP_ENV',
    'NODE_ENV',
    'BUILD_PROFILE',
    'APP_URL',
    'PROD_APP_URL',
    'STAGING_APP_URL',
    'LOCAL_APP_URL',
  ];
  for (const k of keys) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  BuildVariantService.resetInstance();
}

describe('Phase 32D.R1 portal login URL configuration', () => {
  afterEach(() => {
    resetVariantEnv({ BUILD_VARIANT: 'LOCAL', NODE_ENV: 'test' });
  });

  test('PROD → https://app.invify.org (admin + tenant)', () => {
    resetVariantEnv({
      BUILD_VARIANT: 'PROD',
      NODE_ENV: 'production',
      APP_ENV: 'production',
    });
    const v = BuildVariantService.getInstance();
    expect(v.getAppPortalBaseUrl()).toBe('https://app.invify.org');
    expect(v.getLoginUrl('admin')).toBe('https://app.invify.org/admin/login');
    expect(v.getLoginUrl('tenant')).toBe('https://app.invify.org/tenant/login');
  });

  test('STAGING → https://staging.invify.org', () => {
    resetVariantEnv({
      BUILD_VARIANT: 'STAGING',
      APP_ENV: 'staging',
      NODE_ENV: 'staging',
    });
    const v = BuildVariantService.getInstance();
    expect(v.getAppPortalBaseUrl()).toBe('https://staging.invify.org');
    expect(v.getLoginUrl('admin')).toBe('https://staging.invify.org/admin/login');
  });

  test('PROD rejects staging portal URL override (fail closed)', () => {
    resetVariantEnv({
      BUILD_VARIANT: 'PROD',
      NODE_ENV: 'production',
      APP_ENV: 'production',
      PROD_APP_URL: 'https://staging.invify.org',
    });
    const v = BuildVariantService.getInstance();
    expect(() => v.getAppPortalBaseUrl()).toThrow(/staging/i);
  });

  test('PROD rejects APP_URL pointing at staging (fail closed)', () => {
    resetVariantEnv({
      BUILD_VARIANT: 'PROD',
      NODE_ENV: 'production',
      APP_ENV: 'production',
      APP_URL: 'https://staging.invify.org',
    });
    const v = BuildVariantService.getInstance();
    expect(() => v.getLoginUrl('admin')).toThrow(/staging/i);
  });

  test('email helper never defaults to staging under PROD', async () => {
    resetVariantEnv({
      BUILD_VARIANT: 'PROD',
      NODE_ENV: 'production',
      APP_ENV: 'production',
    });
    const svc = new EmailService();
    const resolve = (svc as any).resolveLoginUrl.bind(svc);
    expect(resolve(undefined, 'admin')).toBe('https://app.invify.org/admin/login');
    expect(() => resolve('https://staging.invify.org/admin/login', 'admin')).toThrow(
      /staging login URL/i,
    );
  });

  test('email helper uses staging default under STAGING', () => {
    resetVariantEnv({
      BUILD_VARIANT: 'STAGING',
      APP_ENV: 'staging',
      NODE_ENV: 'staging',
    });
    const svc = new EmailService();
    const resolve = (svc as any).resolveLoginUrl.bind(svc);
    expect(resolve(undefined, 'admin')).toBe('https://staging.invify.org/admin/login');
  });

  test('PROD_APP_URL override is honored when safe', () => {
    resetVariantEnv({
      BUILD_VARIANT: 'PROD',
      NODE_ENV: 'production',
      APP_ENV: 'production',
      PROD_APP_URL: 'https://app.invify.org/',
    });
    expect(BuildVariantService.getInstance().getAppPortalBaseUrl()).toBe('https://app.invify.org');
  });
});

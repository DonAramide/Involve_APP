import { privilegedAdminCreateClientArgs } from '../src/db/postgrest-service-key';
import { VaultEncryptionUtil } from '../src/utils/vault-encryption.util';
import { BuildVariantService } from '../src/config/build-variant';

describe('privileged vs public Supabase clients', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    BuildVariantService.resetInstance();
  });

  it('STAGING service key is STAGING_SUPABASE_SECRET_KEY and public key is publishable', () => {
    process.env.NODE_ENV = 'staging';
    process.env.BUILD_VARIANT = 'STAGING';
    process.env.STAGING_SUPABASE_URL = 'https://rpcjelhacmkhzguljdgi.supabase.co';
    process.env.STAGING_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unit-test';
    process.env.STAGING_SUPABASE_SECRET_KEY = 'sb_secret_unit-test';
    BuildVariantService.resetInstance();
    const cfg = BuildVariantService.getInstance().getSupabaseConfig();
    expect(cfg.url).toContain('rpcjelhacmkhzguljdgi');
    expect(cfg.key).toBe('sb_publishable_unit-test');
    expect(cfg.serviceRoleKey).toBe('sb_secret_unit-test');
    expect(cfg.key).not.toBe(cfg.serviceRoleKey);

    const admin = privilegedAdminCreateClientArgs(cfg.serviceRoleKey, 'w'.repeat(32));
    expect(admin.apiKey).toBe('sb_secret_unit-test');
    expect(admin.apiKey.startsWith('sb_secret_')).toBe(true);
  });

  it('PROD config still uses PROD_* keys, not STAGING_*', () => {
    process.env.NODE_ENV = 'production';
    process.env.BUILD_VARIANT = 'PROD';
    process.env.PROD_SUPABASE_URL = 'https://jjixrywfnaijvahmvcwj.supabase.co';
    process.env.PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod-unit';
    process.env.PROD_SUPABASE_SECRET_KEY = 'sb_secret_prod-unit';
    process.env.STAGING_SUPABASE_SECRET_KEY = 'sb_secret_should-not-be-used';
    process.env.PROD_APP_URL = 'https://app.invify.org';
    BuildVariantService.resetInstance();
    const cfg = BuildVariantService.getInstance().getSupabaseConfig();
    expect(cfg.url).toContain('jjixrywfnaijvahmvcwj');
    expect(cfg.serviceRoleKey).toBe('sb_secret_prod-unit');
    expect(cfg.serviceRoleKey).not.toBe(process.env.STAGING_SUPABASE_SECRET_KEY);
  });

  it('vault encrypt/decrypt round-trip succeeds with test master key', () => {
    const payload = VaultEncryptionUtil.encrypt('unit-test-smtp-password');
    expect(payload.encryptedValue).toBeTruthy();
    expect(payload.iv).toBeTruthy();
    expect(payload.authTag).toBeTruthy();
    expect(VaultEncryptionUtil.decrypt(payload)).toBe('unit-test-smtp-password');
  });
});

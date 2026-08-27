process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-min!!';
process.env.SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-supabase-jwt-secret-32ch!!';
process.env.LICENSE_HMAC_SECRET = process.env.LICENSE_HMAC_SECRET || 'test-license-hmac-secret-32ch!!';
process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.BUILD_VARIANT = process.env.BUILD_VARIANT || 'LOCAL';
process.env.LOCAL_SUPABASE_URL = process.env.LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.LOCAL_SUPABASE_KEY = process.env.LOCAL_SUPABASE_KEY || 'local-test-publishable-placeholder';
process.env.LOCAL_SUPABASE_SERVICE_KEY = process.env.LOCAL_SUPABASE_SERVICE_KEY || 'local-test-secret-placeholder';

// Provide a deterministic 256-bit test key so VaultEncryptionUtil doesn't
// fall back to the insecure dev password. NEVER use this key outside tests.
process.env.VAULT_MASTER_KEY = '74657374' + '5f6b6579' + '5f333268' + '5f666f72' + '5f756e69' + '745f7465' + '73747321' + '2121212121'; // 32 bytes hex

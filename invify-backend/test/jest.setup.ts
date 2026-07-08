// Jest setup — sets NODE_ENV to 'test' before any modules are loaded
// This prevents app.ts from binding to a real port during Supertest runs
process.env.NODE_ENV = 'test';

// Provide a deterministic 256-bit test key so VaultEncryptionUtil doesn't
// fall back to the insecure dev password. NEVER use this key outside tests.
process.env.VAULT_MASTER_KEY = '74657374' + '5f6b6579' + '5f333268' + '5f666f72' + '5f756e69' + '745f7465' + '73747321' + '2121212121'; // 32 bytes hex

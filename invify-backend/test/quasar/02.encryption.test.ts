// test/quasar/02.encryption.test.ts
/**
 * Contract Test — VaultEncryptionUtil + QuasarIntegrationStore secret handling
 *
 * Validates:
 *  - AES-256-GCM encrypt/decrypt round-trip
 *  - Ciphertext is never the plaintext
 *  - Each encryption produces unique IV/ciphertext
 *  - Auth tag tampering is detected
 *  - QuasarIntegrationStore encrypt/decrypt helpers work correctly
 *
 * Offline — no DB calls (store methods are tested via VaultEncryptionUtil).
 */

import { VaultEncryptionUtil } from '../../src/utils/vault-encryption.util';
import { QuasarIntegrationStore } from '../../src/integrations/quasar/quasar-integration.store';

const PLAINTEXT_SK = 'sk_test_abc123_supersecret_apikey_value_do_not_log';
const PLAINTEXT_SIGNING = 'signing_secret_xyz987_webhook_hmac_key';

describe('VaultEncryptionUtil — AES-256-GCM', () => {

  it('round-trips: decrypt(encrypt(x)) === x for sk_secret', () => {
    const enc = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    expect(VaultEncryptionUtil.decrypt(enc)).toBe(PLAINTEXT_SK);
  });

  it('round-trips: decrypt(encrypt(x)) === x for signingSecret', () => {
    const enc = VaultEncryptionUtil.encrypt(PLAINTEXT_SIGNING);
    expect(VaultEncryptionUtil.decrypt(enc)).toBe(PLAINTEXT_SIGNING);
  });

  it('ciphertext is never the plaintext', () => {
    const enc = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    expect(enc.encryptedValue).not.toContain(PLAINTEXT_SK);
    expect(enc.iv).not.toBe(PLAINTEXT_SK);
  });

  it('each encryption produces a unique IV (non-deterministic)', () => {
    const enc1 = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    const enc2 = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.encryptedValue).not.toBe(enc2.encryptedValue);
  });

  it('produces all required fields', () => {
    const enc = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    expect(enc).toHaveProperty('encryptedValue');
    expect(enc).toHaveProperty('iv');
    expect(enc).toHaveProperty('authTag');
    expect(enc).toHaveProperty('keyVersion');
  });

  it('detects auth tag tampering (GCM integrity)', () => {
    const enc = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    const tampered = {
      ...enc,
      authTag: 'ffffffffffffffffffffffffffffffff', // wrong tag
    };
    expect(() => VaultEncryptionUtil.decrypt(tampered)).toThrow();
  });

  it('detects ciphertext tampering', () => {
    const enc = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    const tampered = {
      ...enc,
      encryptedValue: enc.encryptedValue.slice(0, -2) + 'ff',
    };
    expect(() => VaultEncryptionUtil.decrypt(tampered)).toThrow();
  });

  it('detects IV tampering', () => {
    const enc = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    const tampered = {
      ...enc,
      iv: 'ffffffffffffffffffffffffffffffff',
    };
    expect(() => VaultEncryptionUtil.decrypt(tampered)).toThrow();
  });
});

describe('QuasarIntegrationStore — decrypt helpers (offline)', () => {

  it('decryptSkSecret round-trips via JSON-encoded EncryptedPayload', () => {
    const encPayload = VaultEncryptionUtil.encrypt(PLAINTEXT_SK);
    const fakeRecord: any = {
      quasar_sk_secret_enc: JSON.stringify(encPayload),
    };
    const decrypted = QuasarIntegrationStore.decryptSkSecret(fakeRecord);
    expect(decrypted).toBe(PLAINTEXT_SK);
  });

  it('decryptSigningSecret round-trips via JSON-encoded EncryptedPayload', () => {
    const encPayload = VaultEncryptionUtil.encrypt(PLAINTEXT_SIGNING);
    const fakeRecord: any = {
      quasar_webhook_signing_secret_enc: JSON.stringify(encPayload),
    };
    const decrypted = QuasarIntegrationStore.decryptSigningSecret(fakeRecord);
    expect(decrypted).toBe(PLAINTEXT_SIGNING);
  });

  it('throws when signingSecret field is absent', () => {
    const fakeRecord: any = {
      quasar_webhook_signing_secret_enc: null,
    };
    expect(() => QuasarIntegrationStore.decryptSigningSecret(fakeRecord)).toThrow(
      'No webhook signing secret stored for this tenant',
    );
  });
});

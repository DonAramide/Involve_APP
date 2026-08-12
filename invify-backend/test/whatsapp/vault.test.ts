/**
 * Meta WhatsApp Integration Vault helpers
 */
import { IntegrationVaultService } from '../../src/services/integration-vault.service';

jest.mock('../../src/db/supabase', () => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
  };
  return {
    supabase: { from: jest.fn(() => chain) },
    supabaseAdmin: { from: jest.fn(() => chain) },
  };
});

jest.mock('../../src/utils/vault-encryption.util', () => ({
  VaultEncryptionUtil: {
    encrypt: jest.fn(() => ({
      encryptedValue: 'enc',
      iv: 'iv',
      authTag: 'tag',
      keyVersion: 1,
    })),
    decrypt: jest.fn(() => 'decrypted'),
  },
}));

describe('IntegrationVaultService Meta WhatsApp', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of IntegrationVaultService.META_WHATSAPP_KEYS) {
      delete process.env[key];
    }
  });

  it('upserts Meta WhatsApp keys into vault and hydrates process.env', async () => {
    const ensureSpy = jest
      .spyOn(IntegrationVaultService, 'ensureMetaWhatsAppVault')
      .mockResolvedValue('vault-wa-1');
    const addSpy = jest
      .spyOn(IntegrationVaultService, 'addCredential')
      .mockResolvedValue({ id: 'cred-1' } as any);

    const result = await IntegrationVaultService.upsertMetaWhatsAppCredentials(
      {
        PUBLIC_API_BASE_URL: 'https://api.invify.app',
        WHATSAPP_GRAPH_API_VERSION: 'v19.0',
        WHATSAPP_ACCESS_TOKEN: 'token-abc',
        WHATSAPP_APP_SECRET: 'app-secret',
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify-token',
        WHATSAPP_BUSINESS_ACCOUNT_ID: 'waba-1',
        WHATSAPP_PHONE_NUMBER_ID: 'pnid-1',
      },
      'PRODUCTION'
    );

    expect(ensureSpy).toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledTimes(7);
    expect(result.keys).toEqual(
      expect.arrayContaining([
        'PUBLIC_API_BASE_URL',
        'WHATSAPP_GRAPH_API_VERSION',
        'WHATSAPP_ACCESS_TOKEN',
        'WHATSAPP_APP_SECRET',
        'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
        'WHATSAPP_BUSINESS_ACCOUNT_ID',
        'WHATSAPP_PHONE_NUMBER_ID',
      ])
    );
    expect(process.env.WHATSAPP_ACCESS_TOKEN).toBe('token-abc');
    expect(process.env.META_ACCESS_TOKEN).toBe('token-abc');
    expect(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN).toBe('verify-token');
  });

  it('skips empty values on partial upsert', async () => {
    jest.spyOn(IntegrationVaultService, 'ensureMetaWhatsAppVault').mockResolvedValue('vault-wa-1');
    const addSpy = jest
      .spyOn(IntegrationVaultService, 'addCredential')
      .mockResolvedValue({ id: 'cred-1' } as any);

    const result = await IntegrationVaultService.upsertMetaWhatsAppCredentials({
      WHATSAPP_PHONE_NUMBER_ID: 'pnid-only',
      WHATSAPP_ACCESS_TOKEN: '',
    });

    expect(result.keys).toEqual(['WHATSAPP_PHONE_NUMBER_ID']);
    expect(addSpy).toHaveBeenCalledTimes(1);
  });
});

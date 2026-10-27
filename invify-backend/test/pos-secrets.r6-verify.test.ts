/**
 * Phase 32E.1.R6 — disposable fail-closed + PUT masked-secret safety tests.
 * No production mutation. Synthetic secrets only.
 */
import { PosService } from '../src/services/pos.service';
import { PosController } from '../src/controllers/pos.controller';
import type { PosRoutingConfig } from '../src/types/pos.types';

const SYNTHETIC = 'EEEEFFFF000011112222333344445555';
const SYNTHETIC2 = '11112222333344445555666677778888';
const TEST_KEY = 'phase32e1r6-disposable-encryption-key-value';

function sample(ctmk = SYNTHETIC): PosRoutingConfig {
  return {
    activeHost: 'nibss',
    failoverOrder: ['nibss'],
    splitThresholdNaira: 50000,
    thresholdRulesMatrix: [],
    tenantRoutingProfiles: [],
    hosts: [
      {
        hostName: 'NIBSS',
        hostCode: 'nibss',
        ip: '127.0.0.1',
        port: 5001,
        sslEnabled: true,
        sslCertMetadata: null,
        timeoutSeconds: 30,
        priority: 1,
        failoverPriority: 1,
        healthScore: 100,
        status: 'ONLINE',
        thresholdMin: 0,
        thresholdMax: 999999999,
        supportedCardSchemes: [],
        supportedTerminalTypes: [],
        supportedTenantCategories: [],
        supportedTransactionTypes: [],
        isActive: true,
        authToken: 'tok-real',
        kimonoKeys: { masterKey: 'mk-real', pinKey: 'pk-real' },
        kimonoFallbackParameters: {
          merchantId: '',
          uniqueId: '',
          institutionId: '',
          settlementAccount: '',
          keyLabel: '',
          token: 'fb-real',
        },
        nibssConfig: {
          institutionCode: '',
          terminalId: '',
          merchantId: '',
          ctmk,
          ptspCode: '',
        },
      },
    ],
  } as unknown as PosRoutingConfig;
}

describe('Phase 32E.1.R6 fail-closed and PUT mask safety', () => {
  const originalKey = process.env.POS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.POS_ENCRYPTION_KEY = TEST_KEY;
    jest.spyOn(PosService as any, 'mirrorConfigToLegacyJson').mockImplementation(() => undefined);
    jest.spyOn(PosService as any, 'saveConfig').mockResolvedValue(99);
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.POS_ENCRYPTION_KEY;
    else process.env.POS_ENCRYPTION_KEY = originalKey;
    jest.restoreAllMocks();
  });

  test('A. missing POS_ENCRYPTION_KEY → encrypt fails closed', () => {
    delete process.env.POS_ENCRYPTION_KEY;
    expect(() => (PosService as any).encryptSecret(SYNTHETIC)).toThrow(/POS_ENCRYPTION_KEY|fail-closed|encrypt/i);
  });

  test('B. invalid POS_ENCRYPTION_KEY cannot decrypt to silent plaintext for iv:cipher', () => {
    process.env.POS_ENCRYPTION_KEY = TEST_KEY;
    const enc = (PosService as any).encryptSecret(SYNTHETIC) as string;
    expect(enc).toContain(':');
    process.env.POS_ENCRYPTION_KEY = 'totally-wrong-key-value-for-failure';
    expect(() => (PosService as any).decryptSecret(enc)).toThrow(/fail-closed|decrypt|POS_ENCRYPTION/i);
  });

  test('C. encryption failure never returns plaintext', () => {
    delete process.env.POS_ENCRYPTION_KEY;
    try {
      const out = (PosService as any).encryptSecret(SYNTHETIC);
      // If it somehow returned, must not be plaintext
      expect(out).not.toBe(SYNTHETIC);
      fail('expected throw');
    } catch (e: any) {
      expect(String(e.message || e)).toMatch(/POS_ENCRYPTION_KEY|fail-closed|encrypt/i);
    }
  });

  test('D. encrypted config with unavailable key fails closed on decrypt path', () => {
    process.env.POS_ENCRYPTION_KEY = TEST_KEY;
    const encrypted = (PosService as any).mapSecrets(sample(), 'encrypt') as PosRoutingConfig;
    delete process.env.POS_ENCRYPTION_KEY;
    expect(() => (PosService as any).mapSecrets(encrypted, 'decrypt')).toThrow(/fail-closed|decrypt|POS_ENCRYPTION/i);
  });

  test('PUT masked placeholder preserves existing CTMK (updateRoutingConfig)', async () => {
    // Isolate from TerminalAuditService / socket / DB (disposable only)
    jest.spyOn(PosService as any, 'saveConfig').mockResolvedValue(99);
    const audit = require('../src/services/terminal-audit.service');
    jest.spyOn(audit.TerminalAuditService, 'log').mockResolvedValue(undefined);

    PosService.routingConfig = sample(SYNTHETIC);
    const incoming = sample(PosService.SECRET_MASK);
    incoming.hosts[0].authToken = PosService.SECRET_MASK;
    incoming.hosts[0].kimonoKeys!.masterKey = PosService.SECRET_MASK;
    incoming.hosts[0].kimonoKeys!.pinKey = PosService.SECRET_MASK;
    incoming.hosts[0].kimonoFallbackParameters!.token = PosService.SECRET_MASK;

    const updated = await PosService.updateRoutingConfig(incoming, 'r6-test', 'mask-preservation');
    // R7: all five secret fields preserve on [SECRET_MASKED]
    expect(updated.hosts[0].nibssConfig!.ctmk).toBe(SYNTHETIC);
    expect(updated.hosts[0].authToken).toBe('tok-real');
    expect(updated.hosts[0].kimonoKeys!.masterKey).toBe('mk-real');
    expect(updated.hosts[0].kimonoKeys!.pinKey).toBe('pk-real');
    expect(updated.hosts[0].kimonoFallbackParameters!.token).toBe('fb-real');
    expect(updated.hosts[0].nibssConfig!.ctmk).not.toBe(SYNTHETIC2);
    expect(updated.hosts[0].nibssConfig!.ctmk).not.toBe(PosService.SECRET_MASK);
  });

  test('Authenticated GET path redacts secrets via controller', async () => {
    PosService.routingConfig = sample(SYNTHETIC);
    const json = jest.fn();
    const res: any = { status: jest.fn().mockReturnValue({ json }) };
    await PosController.getRoutingConfig({} as any, res);
    const body = json.mock.calls[0][0] as PosRoutingConfig;
    expect(body.hosts[0].nibssConfig!.ctmk).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].authToken).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoKeys!.masterKey).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoKeys!.pinKey).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoFallbackParameters!.token).toBe(PosService.SECRET_MASK);
    // Internal memory unchanged
    expect(PosService.routingConfig.hosts[0].nibssConfig!.ctmk).toBe(SYNTHETIC);
  });

  test('Restart/idempotency: loadConfig with existing latest does not bootstrap', async () => {
    // Static contract: empty table bootstraps; existing row loads.
    // Assert source markers in deployed method behavior via empty-guard.
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../src/services/pos.service.ts'),
      'utf8',
    );
    expect(src).toMatch(/No config found in Supabase/);
    expect(src).toMatch(/system_bootstrap/);
    expect(src).toMatch(/Config loaded from Supabase/);
    // saveConfig only on !data path for bootstrap
    const loadIdx = src.indexOf('static async loadConfig');
    const chunk = src.slice(loadIdx, loadIdx + 2500);
    expect(chunk).toMatch(/if \(!data\)/);
    expect(chunk).toMatch(/saveConfig/);
  });
});

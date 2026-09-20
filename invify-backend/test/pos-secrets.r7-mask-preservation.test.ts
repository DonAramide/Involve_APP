/**
 * Phase 32E.1.R7 — masked-secret preservation for POST /pos/routing.
 * Synthetic secrets only. Never embeds the former production CTMK.
 */
import * as crypto from 'crypto';
import { PosService } from '../src/services/pos.service';
import { PosController } from '../src/controllers/pos.controller';
import type { PosRoutingConfig } from '../src/types/pos.types';

const FORBIDDEN_CTMK_SHA256 =
  '655a5f83c223f4c7bb3ce24c90d16bce7ac8ef9034ce04b24674a2fc8da11298';

const SYN_CTMK = 'AAAA1111BBBB2222CCCC3333DDDD4444';
const SYN_AUTH = 'r7-auth-token-synthetic';
const SYN_MASTER = 'r7-master-key-synthetic';
const SYN_PIN = 'r7-pin-key-synthetic';
const SYN_FALLBACK = 'r7-fallback-token-synthetic';
const SYN_NEW = 'r7-explicit-replacement-secret99';
const TEST_KEY = 'phase32e1r7-disposable-encryption-key-value';

function sha256(v: string): string {
  return crypto.createHash('sha256').update(v).digest('hex');
}

function sample(overrides?: Partial<{
  ctmk: string;
  authToken: string;
  masterKey: string;
  pinKey: string;
  token: string;
}>): PosRoutingConfig {
  const o = overrides || {};
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
        authToken: o.authToken ?? SYN_AUTH,
        kimonoKeys: {
          masterKey: o.masterKey ?? SYN_MASTER,
          pinKey: o.pinKey ?? SYN_PIN,
        },
        kimonoFallbackParameters: {
          merchantId: '',
          uniqueId: '',
          institutionId: '',
          settlementAccount: '',
          keyLabel: '',
          token: o.token ?? SYN_FALLBACK,
        },
        nibssConfig: {
          institutionCode: '',
          terminalId: 'TID-KEEP',
          merchantId: '',
          ctmk: o.ctmk ?? SYN_CTMK,
          ptspCode: '',
        },
      },
    ],
  } as unknown as PosRoutingConfig;
}

describe('Phase 32E.1.R7 masked-secret preservation', () => {
  const originalKey = process.env.POS_ENCRYPTION_KEY;
  let savedPayload: any;

  beforeEach(() => {
    process.env.POS_ENCRYPTION_KEY = TEST_KEY;
    savedPayload = undefined;
    jest.spyOn(PosService as any, 'mirrorConfigToLegacyJson').mockImplementation(() => undefined);
    jest.spyOn(PosService as any, 'saveConfig').mockImplementation(async function (this: typeof PosService) {
      // Capture what would be encrypted/persisted without touching any DB
      const encrypted = (PosService as any).mapSecrets(PosService.routingConfig, 'encrypt');
      savedPayload = encrypted;
      return 99;
    });
    const audit = require('../src/services/terminal-audit.service');
    jest.spyOn(audit.TerminalAuditService, 'log').mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.POS_ENCRYPTION_KEY;
    else process.env.POS_ENCRYPTION_KEY = originalKey;
    jest.restoreAllMocks();
  });

  test('A. CTMK + [SECRET_MASKED] preserves existing', async () => {
    PosService.routingConfig = sample();
    const incoming = sample({ ctmk: PosService.SECRET_MASK });
    const updated = await PosService.updateRoutingConfig(incoming, 'r7', 'A');
    expect(updated.hosts[0].nibssConfig!.ctmk).toBe(SYN_CTMK);
    expect(updated.hosts[0].nibssConfig!.ctmk).not.toBe(PosService.SECRET_MASK);
  });

  test('B. authToken + [SECRET_MASKED] preserves existing', async () => {
    PosService.routingConfig = sample();
    const incoming = sample({ authToken: PosService.SECRET_MASK });
    const updated = await PosService.updateRoutingConfig(incoming, 'r7', 'B');
    expect(updated.hosts[0].authToken).toBe(SYN_AUTH);
  });

  test('C. Kimono masterKey + [SECRET_MASKED] preserves existing', async () => {
    PosService.routingConfig = sample();
    const incoming = sample({ masterKey: PosService.SECRET_MASK });
    const updated = await PosService.updateRoutingConfig(incoming, 'r7', 'C');
    expect(updated.hosts[0].kimonoKeys!.masterKey).toBe(SYN_MASTER);
  });

  test('D. Kimono pinKey + [SECRET_MASKED] preserves existing', async () => {
    PosService.routingConfig = sample();
    const incoming = sample({ pinKey: PosService.SECRET_MASK });
    const updated = await PosService.updateRoutingConfig(incoming, 'r7', 'D');
    expect(updated.hosts[0].kimonoKeys!.pinKey).toBe(SYN_PIN);
  });

  test('E. fallback token + [SECRET_MASKED] preserves existing', async () => {
    PosService.routingConfig = sample();
    const incoming = sample({ token: PosService.SECRET_MASK });
    const updated = await PosService.updateRoutingConfig(incoming, 'r7', 'E');
    expect(updated.hosts[0].kimonoFallbackParameters!.token).toBe(SYN_FALLBACK);
  });

  test('F. all five masked simultaneously → all preserved', async () => {
    PosService.routingConfig = sample();
    const incoming = sample({
      ctmk: PosService.SECRET_MASK,
      authToken: PosService.SECRET_MASK,
      masterKey: PosService.SECRET_MASK,
      pinKey: PosService.SECRET_MASK,
      token: PosService.SECRET_MASK,
    });
    // Non-secret metadata still updates
    incoming.hosts[0].hostName = 'NIBSS-RENAMED';
    incoming.hosts[0].port = 5002;

    const updated = await PosService.updateRoutingConfig(incoming, 'r7', 'F');
    expect(updated.hosts[0].nibssConfig!.ctmk).toBe(SYN_CTMK);
    expect(updated.hosts[0].authToken).toBe(SYN_AUTH);
    expect(updated.hosts[0].kimonoKeys!.masterKey).toBe(SYN_MASTER);
    expect(updated.hosts[0].kimonoKeys!.pinKey).toBe(SYN_PIN);
    expect(updated.hosts[0].kimonoFallbackParameters!.token).toBe(SYN_FALLBACK);
    expect(updated.hosts[0].hostName).toBe('NIBSS-RENAMED');
    expect(updated.hosts[0].port).toBe(5002);
    expect(updated.hosts[0].nibssConfig!.terminalId).toBe('TID-KEEP');
  });

  test('G. explicit new secret value is encrypted for persistence', async () => {
    PosService.routingConfig = sample();
    const incoming = sample({ ctmk: SYN_NEW, masterKey: SYN_NEW });
    await PosService.updateRoutingConfig(incoming, 'r7', 'G');
    expect(PosService.routingConfig.hosts[0].nibssConfig!.ctmk).toBe(SYN_NEW);
    expect(savedPayload.hosts[0].nibssConfig.ctmk).toContain(':');
    expect(savedPayload.hosts[0].nibssConfig.ctmk).not.toBe(SYN_NEW);
    expect(savedPayload.hosts[0].kimonoKeys.masterKey).toContain(':');
    expect(savedPayload.hosts[0].kimonoKeys.masterKey).not.toBe(SYN_NEW);
  });

  test('H. literal [SECRET_MASKED] is NEVER persisted', async () => {
    PosService.routingConfig = sample();
    const incoming = sample({
      ctmk: PosService.SECRET_MASK,
      authToken: PosService.SECRET_MASK,
      masterKey: PosService.SECRET_MASK,
      pinKey: PosService.SECRET_MASK,
      token: PosService.SECRET_MASK,
    });
    await PosService.updateRoutingConfig(incoming, 'r7', 'H');
    const blob = JSON.stringify(savedPayload);
    expect(blob).not.toContain(PosService.SECRET_MASK);
    expect(PosService.routingConfig.hosts[0].nibssConfig!.ctmk).not.toBe(PosService.SECRET_MASK);
    expect(PosService.routingConfig.hosts[0].authToken).not.toBe(PosService.SECRET_MASK);
    expect(PosService.routingConfig.hosts[0].kimonoKeys!.masterKey).not.toBe(PosService.SECRET_MASK);
    expect(PosService.routingConfig.hosts[0].kimonoKeys!.pinKey).not.toBe(PosService.SECRET_MASK);
    expect(PosService.routingConfig.hosts[0].kimonoFallbackParameters!.token).not.toBe(PosService.SECRET_MASK);
  });

  test('I. missing encryption key + new secret → fail closed', async () => {
    delete process.env.POS_ENCRYPTION_KEY;
    PosService.routingConfig = sample();
    const incoming = sample({ ctmk: SYN_NEW });
    await expect(PosService.updateRoutingConfig(incoming, 'r7', 'I')).rejects.toThrow(
      /POS_ENCRYPTION_KEY|fail-closed|encrypt|Refusing/i,
    );
  });

  test('J. encryption failure never leaves plaintext in persist payload', async () => {
    delete process.env.POS_ENCRYPTION_KEY;
    PosService.routingConfig = sample();
    const incoming = sample({ masterKey: SYN_NEW });
    let threw = false;
    try {
      await PosService.updateRoutingConfig(incoming, 'r7', 'J');
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    // saveConfig mock must not have produced a plaintext persist payload for the new secret
    if (savedPayload) {
      expect(JSON.stringify(savedPayload)).not.toContain(SYN_NEW);
    }
  });

  test('POST /pos/routing controller preserves masks and redacts response', async () => {
    PosService.routingConfig = sample();
    const bodyConfig = sample({
      ctmk: PosService.SECRET_MASK,
      authToken: PosService.SECRET_MASK,
      masterKey: PosService.SECRET_MASK,
      pinKey: PosService.SECRET_MASK,
      token: PosService.SECRET_MASK,
    });
    const json = jest.fn();
    const res: any = { status: jest.fn().mockReturnValue({ json }) };
    await PosController.updateRoutingConfig(
      { body: { config: bodyConfig, adminId: 'r7-ctrl', reason: 'mask-post' } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    const body = json.mock.calls[0][0] as PosRoutingConfig;
    // Response always redacted
    expect(body.hosts[0].nibssConfig!.ctmk).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].authToken).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoKeys!.masterKey).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoKeys!.pinKey).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoFallbackParameters!.token).toBe(PosService.SECRET_MASK);
    // Internal memory kept real secrets
    expect(PosService.routingConfig.hosts[0].nibssConfig!.ctmk).toBe(SYN_CTMK);
    expect(PosService.routingConfig.hosts[0].kimonoKeys!.masterKey).toBe(SYN_MASTER);
    expect(PosService.routingConfig.hosts[0].kimonoKeys!.pinKey).toBe(SYN_PIN);
    expect(PosService.routingConfig.hosts[0].kimonoFallbackParameters!.token).toBe(SYN_FALLBACK);
  });

  test('static scan: tests do not embed forbidden CTMK', () => {
    expect(sha256(SYN_CTMK)).not.toBe(FORBIDDEN_CTMK_SHA256);
    expect(sha256(SYN_NEW)).not.toBe(FORBIDDEN_CTMK_SHA256);
  });
});

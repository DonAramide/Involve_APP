/**
 * Phase 32E.1.R2 — POS routing secret-handling remediation tests.
 * Synthetic secrets only. Never embeds the former production CTMK.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PosService } from '../src/services/pos.service';
import { PosController } from '../src/controllers/pos.controller';
import type { PosRoutingConfig } from '../src/types/pos.types';

/** SHA-256 of the retired hardcoded CTMK (value never stored in tests). */
const FORBIDDEN_CTMK_SHA256 =
  '655a5f83c223f4c7bb3ce24c90d16bce7ac8ef9034ce04b24674a2fc8da11298';

const SYNTHETIC_CTMK = 'AAAABBBBCCCCDDDDEEEEFFFF00001111';
const SYNTHETIC_AUTH = 'test-auth-token-not-real';
const SYNTHETIC_MASTER = 'test-master-key-not-real';
const SYNTHETIC_PIN = 'test-pin-key-not-real';
const SYNTHETIC_FALLBACK = 'test-fallback-token-not-real';
const TEST_POS_KEY = 'phase32e1r2-test-pos-encryption-key';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sampleConfig(withSecrets = true): PosRoutingConfig {
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
        authToken: withSecrets ? SYNTHETIC_AUTH : '',
        kimonoKeys: withSecrets
          ? { masterKey: SYNTHETIC_MASTER, pinKey: SYNTHETIC_PIN }
          : { masterKey: '', pinKey: '' },
        kimonoFallbackParameters: {
          merchantId: '',
          uniqueId: '',
          institutionId: '',
          settlementAccount: '',
          keyLabel: '',
          token: withSecrets ? SYNTHETIC_FALLBACK : '',
        },
        nibssConfig: {
          institutionCode: '',
          terminalId: '',
          merchantId: '',
          ctmk: withSecrets ? SYNTHETIC_CTMK : '',
          ptspCode: '',
        },
      },
    ],
  } as unknown as PosRoutingConfig;
}

describe('Phase 32E.1.R2 POS secret-handling remediation', () => {
  const originalKey = process.env.POS_ENCRYPTION_KEY;
  let mirrorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.POS_ENCRYPTION_KEY = TEST_POS_KEY;
    // Prevent filesystem writes during unit tests
    mirrorSpy = jest.spyOn(PosService as any, 'mirrorConfigToLegacyJson').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.POS_ENCRYPTION_KEY;
    else process.env.POS_ENCRYPTION_KEY = originalKey;
    mirrorSpy?.mockRestore();
    jest.restoreAllMocks();
  });

  test('1. CTMK default is empty', () => {
    const nibss = PosService.routingConfig.hosts.find((h) => h.hostCode === 'nibss');
    expect(nibss?.nibssConfig?.ctmk).toBe('');
  });

  test('2. Repository contains no hardcoded production CTMK (hash scan)', () => {
    const roots = [
      path.resolve(__dirname, '../src'),
      path.resolve(__dirname, '../pos_routing_config.json'),
      path.resolve(__dirname, '.'),
    ];
    const files: string[] = [];
    const walk = (p: string) => {
      if (!fs.existsSync(p)) return;
      const st = fs.statSync(p);
      if (st.isFile()) {
        if (/\.(ts|js|json|vue|md)$/.test(p)) files.push(p);
        return;
      }
      for (const name of fs.readdirSync(p)) {
        if (name === 'node_modules' || name === 'dist') continue;
        walk(path.join(p, name));
      }
    };
    for (const r of roots) walk(r);

    let hits = 0;
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      // Match standalone 32-char hex tokens and compare hash — never assert the literal
      const re = /\b[0-9A-Fa-f]{32}\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        if (sha256(m[0]) === FORBIDDEN_CTMK_SHA256 || sha256(m[0].toLowerCase()) === FORBIDDEN_CTMK_SHA256) {
          hits += 1;
        }
      }
    }
    expect(hits).toBe(0);
  });

  test('3-4. CTMK is encrypted by mapSecrets and decrypts in memory', () => {
    const cfg = sampleConfig(true);
    const encrypted = (PosService as any).mapSecrets(cfg, 'encrypt') as PosRoutingConfig;
    const encCtmk = encrypted.hosts[0].nibssConfig!.ctmk;
    expect(encCtmk).toContain(':');
    expect(encCtmk).not.toBe(SYNTHETIC_CTMK);
    expect(/^[0-9a-f]+:[0-9a-f]+$/i.test(encCtmk)).toBe(true);

    const decrypted = (PosService as any).mapSecrets(encrypted, 'decrypt') as PosRoutingConfig;
    expect(decrypted.hosts[0].nibssConfig!.ctmk).toBe(SYNTHETIC_CTMK);
    // Original in-memory sample untouched by mapSecrets clone semantics
    expect(cfg.hosts[0].nibssConfig!.ctmk).toBe(SYNTHETIC_CTMK);
  });

  test('5-6. Missing POS_ENCRYPTION_KEY causes encryption to fail closed (never plaintext)', () => {
    delete process.env.POS_ENCRYPTION_KEY;
    expect(() => (PosService as any).encryptSecret(SYNTHETIC_CTMK)).toThrow(/POS_ENCRYPTION_KEY|fail-closed|encrypt/i);
  });

  test('7-11. sanitizeRoutingConfigForClient never exposes POS secrets', () => {
    const cfg = sampleConfig(true);
    const sanitized = PosService.sanitizeRoutingConfigForClient(cfg);
    const h = sanitized.hosts[0];
    expect(h.nibssConfig!.ctmk).toBe(PosService.SECRET_MASK);
    expect(h.authToken).toBe(PosService.SECRET_MASK);
    expect(h.kimonoKeys!.masterKey).toBe(PosService.SECRET_MASK);
    expect(h.kimonoKeys!.pinKey).toBe(PosService.SECRET_MASK);
    expect(h.kimonoFallbackParameters!.token).toBe(PosService.SECRET_MASK);
    // Internal config still has plaintext
    expect(cfg.hosts[0].nibssConfig!.ctmk).toBe(SYNTHETIC_CTMK);
  });

  test('GET /pos/routing response path uses server-side redaction', async () => {
    const cfg = sampleConfig(true);
    PosService.routingConfig = cfg;
    const json = jest.fn();
    const res: any = { status: jest.fn().mockReturnValue({ json }) };
    await PosController.getRoutingConfig({} as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = json.mock.calls[0][0] as PosRoutingConfig;
    expect(body.hosts[0].nibssConfig!.ctmk).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].authToken).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoKeys!.masterKey).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoKeys!.pinKey).toBe(PosService.SECRET_MASK);
    expect(body.hosts[0].kimonoFallbackParameters!.token).toBe(PosService.SECRET_MASK);
  });

  test('12. Legacy mirror never receives plaintext secrets', () => {
    mirrorSpy.mockRestore();
    const os = require('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-mirror-r2-'));
    const prevCwd = process.cwd();
    try {
      process.chdir(tmpDir);
      PosService.routingConfig = sampleConfig(true);
      PosService.mirrorConfigToLegacyJson();
      const mirrorPath = path.join(tmpDir, 'pos_routing_config.json');
      expect(fs.existsSync(mirrorPath)).toBe(true);
      const raw = fs.readFileSync(mirrorPath, 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed.hosts[0].nibssConfig.ctmk).toBe(PosService.SECRET_MASK);
      expect(parsed.hosts[0].authToken).toBe(PosService.SECRET_MASK);
      expect(raw).not.toContain(SYNTHETIC_CTMK);
      expect(raw).not.toContain(SYNTHETIC_AUTH);
    } finally {
      process.chdir(prevCwd);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      mirrorSpy = jest.spyOn(PosService as any, 'mirrorConfigToLegacyJson').mockImplementation(() => undefined);
    }
  });

  test('13. key_version=2 is CURRENT_KEY_VERSION for newly encrypted configuration', () => {
    expect(PosService.CURRENT_KEY_VERSION).toBe(2);
  });

  test('14. key_version=1 plaintext CTMK remains readable via decrypt path (compat)', () => {
    // Plaintext-era value (no iv:cipher) passes through decryptSecret unchanged
    const plain = (PosService as any).decryptSecret(SYNTHETIC_CTMK);
    expect(plain).toBe(SYNTHETIC_CTMK);
  });

  test('15. Built dist (if present) contains no forbidden CTMK hash', () => {
    const dist = path.resolve(__dirname, '../dist');
    if (!fs.existsSync(dist)) {
      // Build may not have run yet in this jest invocation; skip soft
      expect(true).toBe(true);
      return;
    }
    let hits = 0;
    const walk = (p: string) => {
      for (const name of fs.readdirSync(p)) {
        const full = path.join(p, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (/\.(js|json)$/.test(name)) {
          const text = fs.readFileSync(full, 'utf8');
          const re = /\b[0-9A-Fa-f]{32}\b/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(text))) {
            if (sha256(m[0]) === FORBIDDEN_CTMK_SHA256) hits += 1;
          }
        }
      }
    };
    walk(dist);
    expect(hits).toBe(0);
  });

  test('16. Encryption path does not log secret values (smoke)', () => {
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      logs.push(args.map(String).join(' '));
    });
    const cfg = sampleConfig(true);
    (PosService as any).mapSecrets(cfg, 'encrypt');
    spy.mockRestore();
    const joined = logs.join('\n');
    expect(joined).not.toContain(SYNTHETIC_CTMK);
    expect(joined).not.toContain(SYNTHETIC_AUTH);
    expect(joined).not.toContain(TEST_POS_KEY);
  });
});

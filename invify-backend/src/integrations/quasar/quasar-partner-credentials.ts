import axios from 'axios';
import { IntegrationVaultService } from '../../services/integration-vault.service';
import { resolveQuasarBaseUrl } from './quasar-base-url';

export type InvifyPartnerVertical = 'invify_retail' | 'invify_school' | 'invify_services';

const VERTICALS: InvifyPartnerVertical[] = ['invify_retail', 'invify_school', 'invify_services'];

const VERTICAL_KEYS: Record<InvifyPartnerVertical, {
  idEnv: string[];
  secretEnv: string[];
  idVault: string[];
  secretVault: string[];
  defaultClientId: string;
}> = {
  invify_school: {
    idEnv: ['INVIFY_SCHOOL_CLIENT_ID'],
    secretEnv: ['INVIFY_SCHOOL_CLIENT_SECRET'],
    idVault: ['INVIFY_SCHOOL_CLIENT_ID', 'qip.schoolClientId'],
    secretVault: ['INVIFY_SCHOOL_CLIENT_SECRET', 'qip.schoolClientSecret'],
    defaultClientId: 'INVIFY_SCHOOL',
  },
  invify_services: {
    idEnv: ['INVIFY_SERVICES_CLIENT_ID'],
    secretEnv: ['INVIFY_SERVICES_CLIENT_SECRET'],
    idVault: ['INVIFY_SERVICES_CLIENT_ID', 'qip.servicesClientId'],
    secretVault: ['INVIFY_SERVICES_CLIENT_SECRET', 'qip.servicesClientSecret'],
    defaultClientId: 'INVIFY_SERVICES',
  },
  invify_retail: {
    idEnv: ['INVIFY_RETAIL_CLIENT_ID', 'QUASAR_CLIENT_ID'],
    secretEnv: ['INVIFY_RETAIL_CLIENT_SECRET', 'QUASAR_CLIENT_SECRET', 'QUASAR_SERVICE_SECRET'],
    idVault: ['INVIFY_RETAIL_CLIENT_ID', 'QUASAR_CLIENT_ID', 'qip.retailClientId'],
    secretVault: ['INVIFY_RETAIL_CLIENT_SECRET', 'QUASAR_CLIENT_SECRET', 'qip.retailClientSecret'],
    defaultClientId: 'INVIFY_RETAIL',
  },
};

const VAULT_SERVICES = ['quasar', 'qip'];
const VAULT_ENVS = ['STAGING', 'PRODUCTION', 'SANDBOX'];

export function normalizePartnerVertical(raw?: string): InvifyPartnerVertical {
  const v = String(raw || '').trim().toLowerCase();
  if (v.includes('school') || v.includes('education')) return 'invify_school';
  if (v.includes('service')) return 'invify_services';
  if (v === 'invify_retail' || v === 'retail') return 'invify_retail';
  if (VERTICALS.includes(v as InvifyPartnerVertical)) return v as InvifyPartnerVertical;
  return 'invify_retail';
}

export function verticalFromKeyName(keyName?: string): InvifyPartnerVertical | null {
  const key = String(keyName || '').toUpperCase();
  if (key.includes('SCHOOL')) return 'invify_school';
  if (key.includes('SERVICES')) return 'invify_services';
  if (key.includes('RETAIL') || key === 'QUASAR_CLIENT_ID' || key === 'QUASAR_CLIENT_SECRET') {
    return 'invify_retail';
  }
  return null;
}

async function readVaultValue(keyNames: string[]): Promise<string | null> {
  for (const service of VAULT_SERVICES) {
    for (const env of VAULT_ENVS) {
      for (const key of keyNames) {
        const value = await IntegrationVaultService.getDecryptedCredential(
          service,
          env,
          undefined,
          key,
          { allowStandby: true },
        );
        if (value?.trim()) return value.trim();
      }
    }
  }
  return null;
}

function readEnvValue(keys: string[]): string | null {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return null;
}

export async function resolveQuasarPartnerCredentials(verticalRaw?: string): Promise<{
  vertical: InvifyPartnerVertical;
  clientId: string;
  clientSecret: string;
  source: string;
}> {
  const vertical = normalizePartnerVertical(verticalRaw);
  const cfg = VERTICAL_KEYS[vertical];

  const vaultSecret = await readVaultValue(cfg.secretVault);
  const vaultId = await readVaultValue(cfg.idVault);
  const envSecret = readEnvValue(cfg.secretEnv);
  const envId = readEnvValue(cfg.idEnv);

  const clientSecret = vaultSecret || envSecret || '';
  const clientId = vaultId || envId || cfg.defaultClientId;
  const source = [
    vaultId ? 'vault-id' : (envId ? 'env-id' : 'default-id'),
    vaultSecret ? 'vault-secret' : (envSecret ? 'env-secret' : 'missing-secret'),
  ].join('+');

  return { vertical, clientId, clientSecret, source };
}

export async function pingQuasarWithPartnerCreds(clientId: string, clientSecret: string): Promise<{
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  detail: string;
}> {
  const base = resolveQuasarBaseUrl().replace(/\/+$/, '');
  // Quasar: GET /integration/platform/tenants/{id} only. {id} must be a real
  // Quasar tenant UUID. 200 = headers + id good; 401 = bad partner keys;
  // 404 = UUID not on this staging DB (auth still accepted).
  const probeId =
    String(process.env.QUASAR_PLATFORM_PROBE_TENANT_ID || '').trim() ||
    'ea99aa3a-c5cf-4ed0-988b-bba4919bbb0f';
  const url = `${base}/integration/platform/tenants/${probeId}`;
  const start = Date.now();
  try {
    const res = await axios.get(url, {
      headers: {
        Accept: 'application/json',
        'X-Quasar-Client-Id': clientId,
        'X-Quasar-Client-Secret': clientSecret,
      },
      timeout: 12_000,
      validateStatus: () => true,
    });
    const latencyMs = Date.now() - start;
    const raw =
      typeof res.data === 'string' ? res.data : JSON.stringify(res.data || {});
    if (/cannot get/i.test(raw)) {
      return {
        ok: false,
        httpStatus: res.status,
        latencyMs,
        detail: `Wrong Quasar URL or old API: ${url}`,
      };
    }
    const message =
      res.data?.responseMessage ||
      res.data?.error ||
      res.data?.message ||
      `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        httpStatus: res.status,
        latencyMs,
        detail: `Quasar rejected these partner credentials at ${base}. ${message}`,
      };
    }
    if (res.status === 200 || res.status === 404) {
      return {
        ok: true,
        httpStatus: res.status,
        latencyMs,
        detail: `Quasar accepted these partner credentials at ${base}`,
      };
    }
    return {
      ok: false,
      httpStatus: res.status,
      latencyMs,
      detail: `${message} (${url})`,
    };
  } catch (error: any) {
    return {
      ok: false,
      httpStatus: error?.response?.status || null,
      latencyMs: Date.now() - start,
      detail: `${error?.message || 'Quasar request failed'} (${url})`,
    };
  }
}

export async function testQuasarPartnerVertical(verticalRaw?: string) {
  const creds = await resolveQuasarPartnerCredentials(verticalRaw);
  if (!creds.clientSecret) {
    return {
      vertical: creds.vertical,
      ok: false,
      httpStatus: null,
      latencyMs: 0,
      source: creds.source,
      clientId: creds.clientId,
      detail: `No client secret found for ${creds.vertical}. Promote INVIFY_*_CLIENT_SECRET in the vault or set it in env.`,
    };
  }
  const ping = await pingQuasarWithPartnerCreds(creds.clientId, creds.clientSecret);
  return {
    vertical: creds.vertical,
    source: creds.source,
    clientId: creds.clientId,
    ...ping,
  };
}

export async function testAllQuasarPartnerVerticals() {
  const results = [];
  for (const vertical of VERTICALS) {
    results.push(await testQuasarPartnerVertical(vertical));
  }
  return results;
}

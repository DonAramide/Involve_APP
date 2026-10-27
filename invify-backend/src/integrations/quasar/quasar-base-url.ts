/**
 * Resolve Quasar API base URL (…/api/v1).
 *
 * Priority:
 *  1. Explicit override (set when superadmin saves Platform Config / POS Switch Board)
 *  2. global_settings.json → quasar_base_url
 *  3. process.env.QUASAR_BASE_URL
 *  4. Production default
 */
import * as fs from 'fs';
import * as path from 'path';

const PRODUCTION_DEFAULT = 'https://api-quasar.invify.org/api/v1';

/** Only set via setQuasarBaseUrlOverride after an admin save. */
let explicitOverride: string | null = null;

const STRIP_SUFFIXES = [
  '/pos/card-transaction',
  '/pos/icc-data',
  '/pos/transactionFromMpos',
  '/pos/icc',
];

/** Normalize to …/api/v1 without trailing slash. Accepts full card-tx URLs. */
export function normalizeQuasarBaseUrl(input: string | null | undefined): string {
  let u = String(input || '').trim();
  if (!u) return '';

  u = u.split('?')[0].split('#')[0];
  u = u.replace(/\/+$/, '');

  for (const suffix of STRIP_SUFFIXES) {
    if (u.toLowerCase().endsWith(suffix)) {
      u = u.slice(0, -suffix.length).replace(/\/+$/, '');
      break;
    }
  }

  return u;
}

function readFromGlobalSettingsFile(): string {
  try {
    const settingsPath = path.join(process.cwd(), 'global_settings.json');
    if (!fs.existsSync(settingsPath)) return '';
    const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return normalizeQuasarBaseUrl(raw?.quasar_base_url || raw?.quasarBaseUrl || '');
  } catch {
    return '';
  }
}

export function invalidateQuasarBaseUrlCache(): void {
  explicitOverride = null;
}

/** Call after superadmin saves quasar_base_url so new clients pick it up immediately. */
export function setQuasarBaseUrlOverride(url: string | null | undefined): void {
  const normalized = normalizeQuasarBaseUrl(url);
  explicitOverride = normalized || null;
}

export function resolveQuasarBaseUrl(): string {
  if (explicitOverride) return explicitOverride;

  const fromFile = readFromGlobalSettingsFile();
  if (fromFile) return fromFile;

  const fromEnv = normalizeQuasarBaseUrl(process.env.QUASAR_BASE_URL);
  if (fromEnv) return fromEnv;

  return PRODUCTION_DEFAULT;
}

export function quasarCardTransactionUrl(): string {
  return `${resolveQuasarBaseUrl()}/pos/card-transaction`;
}

export function quasarIccDataUrl(): string {
  return `${resolveQuasarBaseUrl()}/pos/icc-data`;
}

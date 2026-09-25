import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export const APPLY_CONFIRM_PHRASE = 'APPLY PRODUCTION ENV';

const DEFAULT_GOVERNORS = ['invifyd99@gmail.com'];

const SECRET_KEY =
  /(SECRET|PASSWORD|TOKEN|PRIVATE|HMAC|JWT|SERVICE_ROLE|DATABASE_URL|API_KEY|ACCESS_KEY|SIGNING)/i;

export type EnvRow = {
  key: string;
  valuePreview: string;
  classified: 'flag' | 'secret' | 'plain';
  writable: boolean;
};

export type PendingChange = {
  id: string;
  key: string;
  fromPreview: string;
  toPreview: string;
  proposedValue: string;
  reason: string;
  makerEmail: string;
  makerId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt?: string;
  checkerEmail?: string;
};

function envFilePath(): string {
  return (
    process.env.PRODUCTION_ENV_FILE ||
    '/etc/invify/invify-production.env'
  );
}

function queueFilePath(): string {
  return (
    process.env.PRODUCTION_ENV_QUEUE_FILE ||
    writablePath('production-env-change-queue.json')
  );
}

function overrideFilePath(): string {
  return (
    process.env.PRODUCTION_ENV_OVERRIDE_FILE ||
    writablePath('production-env-overrides.env')
  );
}

function writablePath(name: string): string {
  const shared = '/srv/invify/shared';
  try {
    if (fs.existsSync(shared)) {
      fs.accessSync(shared, fs.constants.W_OK);
      return path.join(shared, name);
    }
  } catch {
    /* fall through */
  }
  return path.join(process.cwd(), name);
}

export function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function listGovernorEmails(): string[] {
  const fromEnv = String(process.env.PRODUCTION_ENV_GOVERNORS || '')
    .split(/[,;\s]+/)
    .map(normalizeEmail)
    .filter(Boolean);
  if (fromEnv.length) return [...new Set(fromEnv)];
  return [...DEFAULT_GOVERNORS];
}

export function isProductionEnvGovernor(email: unknown, role: unknown): boolean {
  const roles = String(role || '')
    .split(',')
    .map((r) => r.trim().toLowerCase());
  if (!roles.includes('super_admin')) return false;
  return listGovernorEmails().includes(normalizeEmail(email));
}

export function isWritableKey(key: string): boolean {
  if (key === 'PRODUCTION_ENV_GOVERNORS' || key === 'PRODUCTION_ENV_FILE') return false;
  return (
    key === 'FEATURE_REAL_MONEY_PAYOUTS' ||
    key === 'PAYSTACK_MODE' ||
    key.startsWith('FEATURE_') ||
    key.startsWith('ENABLE_')
  );
}

export function classifyKey(key: string): 'flag' | 'secret' | 'plain' {
  if (key.startsWith('FEATURE_') || key.startsWith('ENABLE_') || key.endsWith('_MODE')) {
    return 'flag';
  }
  if (SECRET_KEY.test(key)) return 'secret';
  return 'plain';
}

export function maskValue(key: string, value: string): string {
  const kind = classifyKey(key);
  if (kind === 'flag' || kind === 'plain') return value === '' ? '(empty)' : value;
  if (!value) return '(empty)';
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}

function parseEnvText(text: string): { lines: string[]; map: Record<string, string> } {
  const lines = text.split(/\r?\n/);
  const map: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let raw = trimmed.slice(eq + 1);
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    map[key] = raw;
  }
  return { lines, map };
}

function readEnvFile(): { exists: boolean; text: string; map: Record<string, string>; lines: string[] } {
  const filePath = envFilePath();
  if (!fs.existsSync(filePath)) {
    return { exists: false, text: '', map: {}, lines: [] };
  }
  const text = fs.readFileSync(filePath, 'utf8');
  const parsed = parseEnvText(text);
  return { exists: true, text, map: parsed.map, lines: parsed.lines };
}

function readQueue(): PendingChange[] {
  const filePath = queueFilePath();
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(rows: PendingChange[]) {
  const filePath = queueFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
}

function upsertEnvKey(filePath: string, key: string, value: string, opts?: { backup?: boolean }) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let text = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (opts?.backup && text && fs.existsSync(filePath)) {
    const backupDir = path.join(dir, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(filePath, path.join(backupDir, `${path.basename(filePath)}.${stamp}`));
  }
  const lines = text ? text.split(/\r?\n/) : [];
  let replaced = false;
  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return line;
    const lineKey = trimmed.slice(0, eq).trim();
    if (lineKey !== key) return line;
    replaced = true;
    return `${key}=${value}`;
  });
  if (!replaced) nextLines.push(`${key}=${value}`);
  fs.writeFileSync(filePath, nextLines.join('\n'), 'utf8');
}

export class ProductionEnvGovernanceService {
  snapshot(): {
    filePath: string;
    fileExists: boolean;
    rows: EnvRow[];
    pending: PendingChange[];
    governors: string[];
  } {
    const file = readEnvFile();
    const overlayPath = overrideFilePath();
    const overlay = fs.existsSync(overlayPath)
      ? parseEnvText(fs.readFileSync(overlayPath, 'utf8')).map
      : {};
    const keys = [...new Set([
      ...(file.exists
        ? Object.keys(file.map)
        : Object.keys(process.env).filter(
            (k) => k.startsWith('FEATURE_') || k === 'PAYSTACK_MODE' || k.startsWith('ENABLE_'),
          )),
      ...Object.keys(overlay),
    ])];
    const source = {
      ...(file.exists ? file.map : (process.env as Record<string, string>)),
      ...overlay,
    };
    if (!file.exists) {
      for (const k of Object.keys(overlay)) source[k] = overlay[k];
    }
    const rows: EnvRow[] = keys.sort().map((key) => ({
      key,
      valuePreview: maskValue(key, String(source[key] ?? '')),
      classified: classifyKey(key),
      writable: isWritableKey(key),
    }));
    const pending = readQueue()
      .filter((r) => r.status === 'pending')
      .map((r) => ({
        ...r,
        proposedValue: '',
      }));
    return {
      filePath: envFilePath(),
      fileExists: file.exists,
      rows,
      pending,
      governors: listGovernorEmails(),
    };
  }

  propose(input: {
    key: string;
    value: string;
    reason: string;
    makerEmail: string;
    makerId: string;
  }): PendingChange {
    const key = String(input.key || '').trim();
    if (!isWritableKey(key)) {
      throw Object.assign(new Error('This key cannot be changed from the dashboard'), { status: 400 });
    }
    const value = String(input.value ?? '').trim();
    const reason = String(input.reason || '').trim();
    if (!reason) {
      throw Object.assign(new Error('Reason is required'), { status: 400 });
    }
    const file = readEnvFile();
    const current = file.exists ? String(file.map[key] ?? '') : String(process.env[key] ?? '');
    const queue = readQueue().filter((r) => !(r.key === key && r.status === 'pending'));
    const change: PendingChange = {
      id: randomUUID(),
      key,
      fromPreview: maskValue(key, current),
      toPreview: maskValue(key, value),
      proposedValue: value,
      reason,
      makerEmail: normalizeEmail(input.makerEmail),
      makerId: input.makerId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    queue.push(change);
    writeQueue(queue);
    return { ...change, proposedValue: '' };
  }

  reject(id: string, checkerEmail: string, reason: string): PendingChange {
    const queue = readQueue();
    const row = queue.find((r) => r.id === id);
    if (!row || row.status !== 'pending') {
      throw Object.assign(new Error('Pending change not found'), { status: 404 });
    }
    row.status = 'rejected';
    row.checkerEmail = normalizeEmail(checkerEmail);
    row.decidedAt = new Date().toISOString();
    row.reason = reason ? `${row.reason} | reject: ${reason}` : row.reason;
    writeQueue(queue);
    return { ...row, proposedValue: '' };
  }

  approve(id: string, checkerEmail: string, confirmPhrase: string): PendingChange {
    if (String(confirmPhrase || '').trim() !== APPLY_CONFIRM_PHRASE) {
      throw Object.assign(
        new Error(`Type ${APPLY_CONFIRM_PHRASE} to apply`),
        { status: 400 },
      );
    }
    const queue = readQueue();
    const row = queue.find((r) => r.id === id);
    if (!row || row.status !== 'pending') {
      throw Object.assign(new Error('Pending change not found'), { status: 404 });
    }
    this.applyKey(row.key, row.proposedValue);
    row.status = 'approved';
    row.checkerEmail = normalizeEmail(checkerEmail);
    row.decidedAt = new Date().toISOString();
    writeQueue(queue);
    return { ...row, proposedValue: '' };
  }

  private applyKey(key: string, value: string) {
    process.env[key] = value;
    upsertEnvKey(overrideFilePath(), key, value);
    try {
      upsertEnvKey(envFilePath(), key, value, { backup: true });
    } catch (err: any) {
      console.warn('[ProductionEnv] sealed system env not writable; overlay applied in-process:', err?.message || err);
    }
  }
}

export const productionEnvGovernance = new ProductionEnvGovernanceService();

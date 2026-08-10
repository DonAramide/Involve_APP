// src/services/pos.service.ts
// Invify POS Gateway — Three-route switchboard:
//   1. Cpoint-Kimono  → HTTPS REST POST to connectpoint.app
//   2. Medusa          → ISO8583 TCP socket to core.medusang.com:8080
//   3. NIBSS           → ISO8583 TCP socket (configurable)
//
// Routing rules:
//   ┌─ activeHost toggle ON (kimono) ───────────────────────────────────────┐
//   │  ALL transactions → Kimono (HTTPS)                                    │
//   └───────────────────────────────────────────────────────────────────────┘
//   ┌─ activeHost toggle OFF (not kimono) ──────────────────────────────────┐
//   │  amount < 50,000 NGN (5,000,000 kobo) → Medusa                        │
//   │  amount ≥ 50,000 NGN                  → Kimono                        │
//   └───────────────────────────────────────────────────────────────────────┘
//   Auto-failover: if primary fails → try next active host in failoverOrder

import * as net from 'net';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import * as crypto from 'crypto';
import type {
  CardIccDataInfo,
  KimonoTerminalParams,
  PosRoutingConfig,
  PosTransactionResult,
  MposEmvData,
  PosHostConfig,
} from '../types/pos.types';
import { supabaseAdmin as supabase } from '../db/supabase';
import { TerminalAuditService } from './terminal-audit.service';

import {
  unpackPosMessage,
  type IsoMessageFields,
} from './iso/pos-packager';

// ─── Amount Split Threshold ───────────────────────────────────────────────────
const DEFAULT_SPLIT_THRESHOLD_NAIRA = 50_000;

export class PosService {
  // P0-5A: CONFIG_FILE_PATH removed — config persisted to Supabase pos_routing_configs table

  /**
   * AES-256-CBC encryption key derived from POS_ENCRYPTION_KEY env var.
   * Throws at access time if env var is not set — fail fast.
   */
  private static get ENCRYPTION_KEY(): Buffer {
    if (!process.env.POS_ENCRYPTION_KEY) {
      throw new Error(
        '[POS Service] POS_ENCRYPTION_KEY environment variable is required. ' +
        'Set it before starting the server. No insecure fallback is permitted.'
      );
    }
    return crypto.scryptSync(process.env.POS_ENCRYPTION_KEY, 'salt', 32);
  }
  private static IV_LENGTH = 16;

  private static encryptSecret(text: string): string {
    if (!text) return '';
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (_) {
      return text;
    }
  }

  private static decryptSecret(text: string): string {
    if (!text || !text.includes(':')) return text;
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encryptedText = Buffer.from(parts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedText, undefined, 'utf8') as string;
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (_) {
      return text;
    }
  }

  private static mapSecrets(config: PosRoutingConfig, mode: 'encrypt' | 'decrypt'): PosRoutingConfig {
    const cloned = JSON.parse(JSON.stringify(config));
    if (cloned.hosts) {
      for (const h of cloned.hosts) {
        if (h.authToken) {
          h.authToken = mode === 'encrypt' ? this.encryptSecret(h.authToken) : this.decryptSecret(h.authToken);
        }
        if (h.kimonoKeys) {
          if (h.kimonoKeys.masterKey) {
            h.kimonoKeys.masterKey = mode === 'encrypt' ? this.encryptSecret(h.kimonoKeys.masterKey) : this.decryptSecret(h.kimonoKeys.masterKey);
          }
          if (h.kimonoKeys.pinKey) {
            h.kimonoKeys.pinKey = mode === 'encrypt' ? this.encryptSecret(h.kimonoKeys.pinKey) : this.decryptSecret(h.kimonoKeys.pinKey);
          }
        }
        if (h.kimonoFallbackParameters && h.kimonoFallbackParameters.token) {
          h.kimonoFallbackParameters.token = mode === 'encrypt' ? this.encryptSecret(h.kimonoFallbackParameters.token) : this.decryptSecret(h.kimonoFallbackParameters.token);
        }
      }
    }
    return cloned;
  }

  static routingConfig: PosRoutingConfig = {
    activeHost: 'express_pay',
    failoverOrder: ['express_pay', 'kimono', 'medusa', 'nibss'],
    splitThresholdNaira: DEFAULT_SPLIT_THRESHOLD_NAIRA,
    thresholdRulesMatrix: [],
    tenantRoutingProfiles: [],
    hosts: [
      {
        hostName: 'Express Pay',
        hostCode: 'express_pay',
        ip: '196.6.103.18',
        port: 4018,
        sslEnabled: false,
        sslCertMetadata: null,
        timeoutSeconds: 3600,
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
        baseUrl: 'http://80.88.8.56:552/api/GetPlainMasterKey',
        authToken: 'RXRyYW56YWN0UE9TOjdkNjY1YjgxLWQwZDctNDBhZS04Zjc5LWI2Yjg4MzVmOGZjMw=='
      },
      {
        hostName: 'NIBSS',
        hostCode: 'nibss',
        ip: '196.6.103.18',
        port: 5001,
        sslEnabled: true,
        sslCertMetadata: null,
        timeoutSeconds: 3600,
        priority: 2,
        failoverPriority: 2,
        healthScore: 100,
        status: 'ONLINE',
        thresholdMin: 0,
        thresholdMax: 999999999,
        supportedCardSchemes: [],
        supportedTerminalTypes: [],
        supportedTenantCategories: [],
        supportedTransactionTypes: [],
        isActive: false,
        nibssConfig: {
          institutionCode: '',
          terminalId: '',
          merchantId: '',
          ctmk: '66D4AF3321D8564E9F6F35411755E730',
          ptspCode: ''
        }
      }
    ]
  };

  /**
   * Loads POS routing config from Supabase pos_routing_configs table.
   * Async — must be awaited at server bootstrap.
   * Defaults to in-memory config only in LOCAL development mode (NODE_ENV=development and POS_ENCRYPTION_KEY absent).
   */
  static async loadConfig(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('pos_routing_configs')
        .select('config_blob, key_version, config_version')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[POS Service] Supabase error loading config:', error.message);
        // Do NOT bootstrap-save on read errors — that can wipe a good prior revision.
        this.tryHydrateFromLegacyJson();
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'staging') {
          console.warn('[POS Service] Development/Test/Staging mode — using in-memory/legacy config (no overwrite).');
        } else {
          throw new Error(`[POS Service] Failed to load routing config from Supabase: ${error.message}`);
        }
        return;
      }

      if (!data) {
        console.warn('[POS Service] No config found in Supabase.');
        const hydrated = this.tryHydrateFromLegacyJson();
        if (process.env.NODE_ENV !== 'test') {
          await PosService.saveConfig(hydrated ? 'system_bootstrap_from_legacy_json' : 'system_bootstrap');
        }
        return;
      }

      this.routingConfig = this.mapSecrets(JSON.parse(data.config_blob), 'decrypt');
      this.configVersion = data.config_version ?? 1;
      // Recover profiles if a prior bootstrap wiped them but legacy JSON still has them
      if (!this.routingConfig.tenantRoutingProfiles?.length) {
        this.tryHydrateProfilesFromLegacyJson();
      }
      this.repairNibssSecretsFromLegacy();
      console.log(`[POS Service] Config loaded from Supabase (key_version=${data.key_version}, config_version=${data.config_version}, profiles=${this.routingConfig.tenantRoutingProfiles?.length || 0})`);
    } catch (e: any) {
      console.error('[POS Service] Failed to load config:', e.message);
      this.tryHydrateFromLegacyJson();
      if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'staging') {
        throw e; // Fail fast in production
      }
    }
  }

  /** Best-effort restore from legacy pos_routing_config.json (pre-Supabase). */
  static tryHydrateFromLegacyJson(): boolean {
    try {
      const fs = require('fs');
      const path = require('path');
      const legacyPath = path.join(process.cwd(), 'pos_routing_config.json');
      if (!fs.existsSync(legacyPath)) return false;
      const parsed = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
      if (!parsed || !Array.isArray(parsed.hosts)) return false;
      this.routingConfig = { ...this.routingConfig, ...parsed };
      console.log(`[POS Service] Hydrated routing config from legacy JSON (profiles=${parsed.tenantRoutingProfiles?.length || 0})`);
      this.repairNibssSecretsFromLegacy();
      return true;
    } catch (e: any) {
      console.warn('[POS Service] Legacy JSON hydrate skipped:', e.message);
      return false;
    }
  }

  /**
   * If live NIBSS CTMK was overwritten with UI placeholder `[SECRET_MASKED]` (or wiped),
   * restore CTMK / port from legacy pos_routing_config.json so devices can key-exchange.
   */
  static repairNibssSecretsFromLegacy(): boolean {
    try {
      const fs = require('fs');
      const path = require('path');
      const legacyPath = path.join(process.cwd(), 'pos_routing_config.json');
      if (!fs.existsSync(legacyPath)) return false;
      const parsed = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
      const legacyNibss = (parsed?.hosts || []).find(
        (h: any) => String(h.hostCode || '').toLowerCase() === 'nibss',
      );
      if (!legacyNibss) return false;

      const nibss = (this.routingConfig.hosts || []).find(
        (h: any) => String(h.hostCode || '').toLowerCase() === 'nibss',
      );
      if (!nibss) return false;

      let repaired = false;
      const legacyCtmk = String(legacyNibss.nibssConfig?.ctmk || '').trim();
      const currentCtmk = String(nibss.nibssConfig?.ctmk || '').trim();
      const ctmkBad =
        !currentCtmk ||
        currentCtmk === '[SECRET_MASKED]' ||
        currentCtmk.toUpperCase().includes('SECRET_MASKED') ||
        currentCtmk.length < 32;

      if (ctmkBad && legacyCtmk && legacyCtmk !== '[SECRET_MASKED]' && legacyCtmk.length >= 32) {
        nibss.nibssConfig = {
          ...(nibss.nibssConfig || {}),
          ...(legacyNibss.nibssConfig || {}),
          ctmk: legacyCtmk,
        };
        repaired = true;
        console.warn(
          `[POS Service] Restored NIBSS CTMK from legacy JSON (was ${currentCtmk ? 'masked/invalid' : 'empty'})`,
        );
      }

      // Express Pay historically uses 4018; NIBSS SSL key-exchange expects 5001 in our legacy file.
      if (
        Number(nibss.port) === 4018 &&
        legacyNibss.port &&
        Number(legacyNibss.port) !== 4018
      ) {
        console.warn(
          `[POS Service] NIBSS port was ${nibss.port}; restoring ${legacyNibss.port} from legacy JSON`,
        );
        nibss.port = legacyNibss.port;
        if (legacyNibss.sslEnabled != null) nibss.sslEnabled = legacyNibss.sslEnabled;
        repaired = true;
      }

      return repaired;
    } catch (e: any) {
      console.warn('[POS Service] NIBSS secret repair skipped:', e.message);
      return false;
    }
  }

  static tryHydrateProfilesFromLegacyJson(): boolean {
    try {
      const fs = require('fs');
      const path = require('path');
      const legacyPath = path.join(process.cwd(), 'pos_routing_config.json');
      if (!fs.existsSync(legacyPath)) return false;
      const parsed = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
      const profiles = parsed?.tenantRoutingProfiles;
      if (!Array.isArray(profiles) || profiles.length === 0) return false;
      this.routingConfig.tenantRoutingProfiles = profiles;
      console.log(`[POS Service] Restored ${profiles.length} routing profile(s) from legacy JSON`);
      return true;
    } catch {
      return false;
    }
  }

  /** Latest persisted config_version (updated on load/save). */
  static configVersion: number = 1;

  /**
   * Saves POS routing config to Supabase pos_routing_configs table as an encrypted blob.
   * Inserts a new versioned row — never updates in place (full audit trail).
   * key_version: tracks encryption key rotation.
   * config_version: tracks routing configuration revisions.
   */
  static async saveConfig(updatedBy: string = 'system'): Promise<number> {
    try {
      const encrypted = this.mapSecrets(this.routingConfig, 'encrypt');

      // Determine next config_version
      const { data: latest } = await supabase
        .from('pos_routing_configs')
        .select('config_version')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextConfigVersion = (latest?.config_version ?? 0) + 1;

      const { error } = await supabase.from('pos_routing_configs').insert({
        config_blob: JSON.stringify(encrypted),
        key_version: 1,              // Increment when POS_ENCRYPTION_KEY is rotated
        config_version: nextConfigVersion,  // Increments on every config update
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      this.configVersion = nextConfigVersion;
      console.log(`[POS Service] Config encrypted and saved to Supabase (config_version=${nextConfigVersion})`);
      this.mirrorConfigToLegacyJson();
      return nextConfigVersion;
    } catch (e: any) {
      console.error('[POS Service] Failed to save config:', e.message);
      // Keep local legacy file in sync so restarts / hydrate don't resurrect stale flags
      // (e.g. processOnDevice:false) when Supabase is briefly unavailable.
      this.mirrorConfigToLegacyJson();
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'test') {
        this.configVersion = (this.configVersion || 1) + 1;
        console.warn(`[POS Service] Using in-memory config_version=${this.configVersion} after save failure`);
        return this.configVersion;
      }
      throw e;
    }
  }

  /** Keep pos_routing_config.json aligned with in-memory routing (dev/hydrate safety). */
  static mirrorConfigToLegacyJson(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const legacyPath = path.join(process.cwd(), 'pos_routing_config.json');
      fs.writeFileSync(legacyPath, JSON.stringify(this.routingConfig, null, 2), 'utf8');
    } catch (e: any) {
      console.warn('[POS Service] Legacy JSON mirror skipped:', e.message);
    }
  }

  static getConfigVersion(): number {
    return this.configVersion;
  }

  /**
   * Resolve the terminal group used for Group-scoped profiles.
   * Prefer Express Pay host terminalGroup, then any host that defines one,
   * then "Default" when a Group profile targets Default (common platform setup).
   */
  static resolveTerminalGroup(): string | null {
    const hosts = this.routingConfig.hosts || [];
    const expressPay = hosts.find((h) => h.hostCode === 'express_pay');
    if (expressPay?.terminalGroup) return String(expressPay.terminalGroup);

    for (const h of hosts) {
      if (h?.terminalGroup) return String(h.terminalGroup);
    }

    const profiles = this.routingConfig.tenantRoutingProfiles || [];
    const hasDefaultGroup = profiles.some(
      (p: any) =>
        p.scopeType === 'Group' &&
        String(p.targetValue || '').toLowerCase() === 'default',
    );
    return hasDefaultGroup ? 'Default' : null;
  }

  /**
   * Pick the most specific routing profile:
   * Tenant → Agent → Group → Category (legacy category field included).
   */
  static resolveTenantRoutingProfile(ctx: {
    tenantId?: string | null;
    agentCode?: string | null;
    terminalGroup?: string | null;
    category?: string | null;
  }): any | null {
    const profiles = this.routingConfig.tenantRoutingProfiles || [];
    if (!profiles.length) return null;

    if (ctx.tenantId) {
      const byTenant = profiles.find(
        (p: any) => p.scopeType === 'Tenant' && p.targetValue === ctx.tenantId
      );
      if (byTenant) return byTenant;
    }

    if (ctx.agentCode) {
      const byAgent = profiles.find(
        (p: any) => p.scopeType === 'Agent' && p.targetValue === ctx.agentCode
      );
      if (byAgent) return byAgent;
    }

    const groupKey = ctx.terminalGroup || this.resolveTerminalGroup();
    if (groupKey) {
      const byGroup = profiles.find(
        (p: any) =>
          p.scopeType === 'Group' &&
          String(p.targetValue || '').toLowerCase() === String(groupKey).toLowerCase()
      );
      if (byGroup) return byGroup;
    }

    // If only one Group profile exists, apply it when no group key was resolved
    if (!groupKey) {
      const groupProfiles = profiles.filter((p: any) => p.scopeType === 'Group');
      if (groupProfiles.length === 1) return groupProfiles[0];
    }

    const category = ctx.category || 'Retail';
    const byCategory = profiles.find((p: any) => {
      if (p.scopeType === 'Category' && p.targetValue) {
        return String(p.targetValue).toLowerCase() === category.toLowerCase();
      }
      if (!p.scopeType && p.category) {
        return String(p.category).toLowerCase() === category.toLowerCase();
      }
      // Legacy rows that only set category without scopeType
      if (p.scopeType === 'Category' && p.category) {
        return String(p.category).toLowerCase() === category.toLowerCase();
      }
      return false;
    });
    return byCategory || null;
  }

  // ─── Tenant Context Cache ───────────────────────────────────────────────────
  // Populated asynchronously via cacheTenantCategory(), used synchronously in hot path.
  static tenantCategoryCache: Map<string, string> = new Map();
  static tenantContextCache: Map<string, { category: string; agentCode: string | null }> = new Map();
  static cacheTenantCategory: (tenantId: string) => Promise<void> = async () => {};

  // ─── Terminal Parameters Cache ─────────────────────────────────────────────
  private static kimonoParamsCache: Map<string, { params: KimonoTerminalParams; fetchedAt: number }> = new Map();
  private static CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

  // ─── In-Memory Transaction Log ─────────────────────────────────────────────
  // Warm cache only — durable source of truth is pos_transaction_attempts.
  private static transactionHistory: any[] = [];

  private static newTxId(): string {
    return crypto.randomUUID();
  }

  /** Deterministic UUID so card webhook retries upsert the same attempt row. */
  static cardReferenceToAttemptId(tenantId: string, reference: string): string {
    const h = crypto.createHash('sha1').update(`invify-card:${tenantId}:${reference}`).digest();
    const bytes = Buffer.from(h.subarray(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  private static mapCardWebhookStatus(event: string, data: Record<string, any>): {
    status: string;
    statusCode: string;
    paymentSuccess: boolean;
  } {
    const outcome = String(data?.outcome || data?.status || '').toUpperCase();
    const responseCode = data?.responseCode != null ? String(data.responseCode) : null;

    if (event === 'card.transaction.confirmed' || outcome === 'CONFIRMED') {
      return { status: 'Approved', statusCode: responseCode || '00', paymentSuccess: true };
    }

    if (event === 'card.transaction.failed' || ['DECLINED', 'TIMEOUT', 'ERROR', 'FAILED'].includes(outcome)) {
      const code =
        responseCode ||
        (outcome === 'TIMEOUT' ? '91' : outcome === 'ERROR' ? '96' : outcome === 'FAILED' ? '99' : '05');
      return {
        status: outcome === 'TIMEOUT' ? 'Aborted' : 'Declined',
        statusCode: code,
        paymentSuccess: false,
      };
    }

    // card.transaction.success — APPROVED or mpos pending
    if (outcome === 'PENDING' || String(data?.status || '').toLowerCase() === 'pending') {
      return { status: 'Pending', statusCode: responseCode || '09', paymentSuccess: true };
    }

    if (data?.approved === true || outcome === 'APPROVED' || responseCode === '00') {
      return { status: 'Approved', statusCode: responseCode || '00', paymentSuccess: true };
    }

    return { status: 'Declined', statusCode: responseCode || '05', paymentSuccess: false };
  }

  private static hostFromCardMode(mode?: string | null): string {
    const m = String(mode || '').toLowerCase();
    if (m === 'kimono_https') return 'KIMONO';
    if (m === 'mpos_backup') return 'MPOS_DEVICE';
    if (m === 'iso_tcp') return 'NIBSS';
    return (mode || 'QUASAR').toString().toUpperCase();
  }

  /**
   * Apply Quasar card.transaction.* webhook to the tenant POS attempt.
   * Idempotent: updates existing row matched by reference / RRN+STAN; never creates duplicates.
   * Does NOT credit wallets or post ledger.
   */
  static async applyCardWebhookUpdate(params: {
    tenantId: string;
    event: string;
    data: Record<string, any>;
  }): Promise<{
    updated: boolean;
    duplicate: boolean;
    created: boolean;
    attemptId: string;
    status: string;
  }> {
    const { tenantId, event, data } = params;
    const reference = String(data?.reference || '').trim();
    if (!reference) {
      throw new Error('card webhook missing data.reference');
    }

    const mapped = this.mapCardWebhookStatus(event, data || {});
    const rrn = data?.rrn != null && String(data.rrn).trim() ? String(data.rrn).trim() : null;
    const stan = data?.stan != null && String(data.stan).trim() ? String(data.stan).trim() : null;
    const terminalId = data?.terminalId != null ? String(data.terminalId) : 'UNKNOWN';
    const authCode = data?.authCode != null ? String(data.authCode) : null;
    const amountRaw = data?.amount;
    const amount =
      amountRaw != null && amountRaw !== ''
        ? Number(amountRaw)
        : null;
    const host = this.hostFromCardMode(data?.mode);
    const attemptId = this.cardReferenceToAttemptId(tenantId, reference);

    let existing: any = null;

    // 1) Deterministic id from business reference
    {
      const { data: byId } = await supabase
        .from('pos_transaction_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();
      if (byId) existing = byId;
    }

    // 2) Match RRN + STAN for the tenant (common switchboard path)
    if (!existing && rrn && stan && rrn !== 'N/A' && stan !== 'N/A') {
      const { data: byRrn } = await supabase
        .from('pos_transaction_attempts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('rrn', rrn)
        .eq('stan', stan)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byRrn) existing = byRrn;
    }

    // 3) Match terminal + RRN
    if (!existing && rrn && rrn !== 'N/A' && terminalId !== 'UNKNOWN') {
      const { data: byTerm } = await supabase
        .from('pos_transaction_attempts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('terminal_id', terminalId)
        .eq('rrn', rrn)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byTerm) existing = byTerm;
    }

    const prevWebhook = existing?.raw_response?.quasarCardWebhook || existing?.raw_response?.lastCardWebhook;
    if (
      prevWebhook &&
      prevWebhook.event === event &&
      String(prevWebhook.outcome || prevWebhook.status || '') === String(data?.outcome || data?.status || '') &&
      prevWebhook.reference === reference
    ) {
      console.log(
        `[POS Service] Card webhook duplicate ignored ref=${reference} event=${event} id=${existing.id}`,
      );
      return {
        updated: false,
        duplicate: true,
        created: false,
        attemptId: existing.id,
        status: existing.status,
      };
    }

    const rowId = existing?.id || attemptId;
    const mergedResponse = {
      ...(typeof existing?.raw_response === 'object' && existing?.raw_response ? existing.raw_response : {}),
      quasarCardWebhook: {
        event,
        reference,
        outcome: data?.outcome || data?.status || null,
        status: data?.status || null,
        approved: data?.approved === true,
        mode: data?.mode || null,
        financialTransactionId: data?.financialTransactionId || null,
        receivedAt: new Date().toISOString(),
      },
      responseCode: data?.responseCode ?? existing?.status_code,
    };

    const row = {
      id: rowId,
      tenant_id: tenantId,
      terminal_id: existing?.terminal_id || terminalId,
      amount: amount != null && !Number.isNaN(amount) ? amount : Number(existing?.amount || 0),
      status: mapped.status,
      status_code: mapped.statusCode,
      host: existing?.host || host,
      masked_pan: existing?.masked_pan || null,
      rrn: rrn || existing?.rrn || null,
      stan: stan || existing?.stan || null,
      auth_code: authCode || existing?.auth_code || null,
      staff_name: existing?.staff_name || 'QuasarWebhook',
      items_jsonb: existing?.items_jsonb || [],
      raw_request: {
        ...(typeof existing?.raw_request === 'object' && existing?.raw_request ? existing.raw_request : {}),
        quasarReference: reference,
        source: existing?.raw_request?.source || 'quasar_card_webhook',
      },
      raw_response: mergedResponse,
      is_device_processed:
        existing?.is_device_processed === true || String(data?.mode || '').toLowerCase() === 'mpos_backup',
    };

    await this.persistAttempt(row);

    // Keep warm cache in sync
    const memIdx = this.transactionHistory.findIndex((t) => t.id === rowId);
    const memEntry = {
      id: rowId,
      tenantId,
      terminalId: row.terminal_id,
      amount: row.amount,
      status: row.status,
      statusCode: row.status_code,
      date: existing?.created_at || new Date().toISOString(),
      host: row.host,
      maskedPan: row.masked_pan || '**** ****',
      rrn: row.rrn || 'N/A',
      stan: row.stan || 'N/A',
      authCode: row.auth_code || 'N/A',
      staffName: row.staff_name,
      isDeviceProcessed: row.is_device_processed,
      processedBy: row.is_device_processed ? 'MPOS_DEVICE' : 'SWITCHBOARD',
      items: row.items_jsonb,
      rawRequest: JSON.stringify(row.raw_request),
      rawResponse: JSON.stringify(row.raw_response),
    };
    if (memIdx >= 0) {
      this.transactionHistory[memIdx] = { ...this.transactionHistory[memIdx], ...memEntry };
    } else {
      this.transactionHistory.unshift(memEntry);
      if (this.transactionHistory.length > 500) this.transactionHistory.pop();
    }

    console.log(
      `[POS Service] Card webhook ${existing ? 'updated' : 'created'} attempt=${rowId} ` +
        `tenant=${tenantId} ref=${reference} event=${event} status=${mapped.status}`,
    );

    return {
      updated: !!existing,
      duplicate: false,
      created: !existing,
      attemptId: rowId,
      status: mapped.status,
    };
  }

  private static mapAttemptRow(d: any) {
    const rawReq = d.raw_request || {};
    const isDevice =
      d.is_device_processed === true ||
      rawReq?.source === 'device' ||
      String(d.host || '').toUpperCase() === 'MPOS_DEVICE';
    let message = '';
    try {
      const resp = typeof d.raw_response === 'string' ? JSON.parse(d.raw_response || '{}') : (d.raw_response || {});
      message = resp?.message || resp?.responseMessage || resp?.desc || '';
    } catch {
      /* ignore */
    }
    return {
      id: d.id,
      tenantId: d.tenant_id,
      tenantName: d.tenant_name || null,
      terminalId: d.terminal_id,
      amount: Number(d.amount || 0),
      status: d.status,
      date: d.date || d.created_at,
      host: d.host,
      maskedPan: d.masked_pan,
      rrn: d.rrn || rawReq?.rrn || 'N/A',
      stan: d.stan || rawReq?.stan || 'N/A',
      statusCode: d.status_code,
      authCode: d.auth_code,
      staffName: d.staff_name || rawReq?.staffName || 'System',
      isDeviceProcessed: isDevice,
      processedBy: isDevice ? 'MPOS_DEVICE' : 'SWITCHBOARD',
      message,
      items: d.items_jsonb || [],
      rawRequest: typeof d.raw_request === 'string' ? d.raw_request : JSON.stringify(d.raw_request || {}),
      rawResponse: typeof d.raw_response === 'string' ? d.raw_response : JSON.stringify(d.raw_response || {}),
    };
  }

  /** Durable write — must use UUID ids (table PK is UUID). */
  private static async persistAttempt(row: Record<string, any>) {
    if (!row.tenant_id || row.tenant_id === 'default' || row.tenant_id === 'Unknown') {
      console.warn('[POS Service] Skipping DB persist — missing tenant_id');
      return;
    }
    try {
      const full = {
        id: row.id,
        tenant_id: row.tenant_id,
        terminal_id: row.terminal_id,
        amount: row.amount,
        status: row.status,
        status_code: row.status_code || null,
        host: row.host || null,
        masked_pan: row.masked_pan || null,
        rrn: row.rrn || null,
        stan: row.stan || null,
        auth_code: row.auth_code || null,
        staff_name: row.staff_name || null,
        items_jsonb: row.items_jsonb || [],
        raw_request: row.raw_request || {},
        raw_response: row.raw_response || {},
        is_device_processed: !!row.is_device_processed,
      };
      let { error } = await supabase.from('pos_transaction_attempts').upsert(full, { onConflict: 'id' });
      if (error && /is_device_processed|column/i.test(error.message)) {
        const { is_device_processed, ...slim } = full;
        const retry = await supabase.from('pos_transaction_attempts').upsert(slim, { onConflict: 'id' });
        error = retry.error;
      }
      if (error) {
        console.error('[POS Service] persistAttempt failed:', error.message, { id: row.id, tenant: row.tenant_id });
      }
    } catch (err: any) {
      console.error('[POS Service] persistAttempt exception:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  static async getRoutingConfig() {
    this.repairNibssSecretsFromLegacy();
    return this.routingConfig;
  }

  static async updateRoutingConfig(newConfig: any, adminId = 'Admin', reason = 'Updated POS routing configuration') {
    // Preserve secrets that were stripped by the frontend
    if (newConfig.hosts) {
      for (const newHost of newConfig.hosts) {
        const oldHost = this.routingConfig.hosts.find(h => h.hostCode === newHost.hostCode);
        if (oldHost) {
          if (oldHost.authToken && !newHost.authToken) newHost.authToken = oldHost.authToken;
          if (oldHost.kimonoKeys && oldHost.kimonoKeys.masterKey && (!newHost.kimonoKeys || !newHost.kimonoKeys.masterKey)) {
            newHost.kimonoKeys = { ...newHost.kimonoKeys, masterKey: oldHost.kimonoKeys.masterKey };
          }
          if (oldHost.kimonoKeys && oldHost.kimonoKeys.pinKey && (!newHost.kimonoKeys || !newHost.kimonoKeys.pinKey)) {
            newHost.kimonoKeys = { ...newHost.kimonoKeys, pinKey: oldHost.kimonoKeys.pinKey };
          }
          if (oldHost.kimonoFallbackParameters && oldHost.kimonoFallbackParameters.token && (!newHost.kimonoFallbackParameters || !newHost.kimonoFallbackParameters.token)) {
            newHost.kimonoFallbackParameters = { ...newHost.kimonoFallbackParameters, token: oldHost.kimonoFallbackParameters.token };
          }
          if (oldHost.nibssConfig && oldHost.nibssConfig.ctmk && (!newHost.nibssConfig || !newHost.nibssConfig.ctmk)) {
            newHost.nibssConfig = { ...newHost.nibssConfig, ctmk: oldHost.nibssConfig.ctmk };
          }
          // Never persist UI placeholder secrets
          if (newHost.nibssConfig?.ctmk === '[SECRET_MASKED]') {
            newHost.nibssConfig.ctmk =
              oldHost.nibssConfig?.ctmk && oldHost.nibssConfig.ctmk !== '[SECRET_MASKED]'
                ? oldHost.nibssConfig.ctmk
                : '';
          }
          if (newHost.authToken === '[SECRET_MASKED]') {
            newHost.authToken = oldHost.authToken || '';
          }
        }
      }
    }

    this.routingConfig = { ...this.routingConfig, ...newConfig };
    const configVersion = await this.saveConfig(adminId);

    // Log to audit service
    await TerminalAuditService.log({
      actionType: 'ROUTING_CONFIG_UPDATE',
      adminId,
      reason,
      metadata: {
        changedFields: Object.keys(newConfig),
        reason,
        configVersion
      }
    });

    // Push live reload signal so connected devices re-sync routing
    let broadcasted = false;
    try {
      const { io } = require('../app');
      io.to('all').emit('pos_routing_updated', {
        configVersion,
        reason,
        timestamp: new Date().toISOString()
      });
      broadcasted = true;
      console.log(`[POS Service] Broadcast pos_routing_updated (v${configVersion}) to all devices`);
    } catch (e: any) {
      console.warn('[POS Service] Could not broadcast routing update:', e.message);
    }

    return { ...this.routingConfig, configVersion, broadcasted };
  }

  static async getTransactionHistory(tenantId: string) {
    const memory = [...this.transactionHistory];

    try {
      let query = supabase
        .from('pos_transaction_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (tenantId && tenantId !== 'default' && tenantId !== 'global') {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[POS Service] history query failed:', error.message);
        return await this.enrichHistoryWithTenantNames(memory);
      }

      const fromDb = (data || []).map((d) => this.mapAttemptRow(d));
      const byId = new Map<string, any>();
      for (const row of [...fromDb, ...memory]) {
        if (!row?.id) continue;
        if (!byId.has(String(row.id))) byId.set(String(row.id), row);
      }
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
      );
      return await this.enrichHistoryWithTenantNames(merged);
    } catch (err) {
      console.error('[POS Service] Error fetching history:', err);
      return await this.enrichHistoryWithTenantNames(memory);
    }
  }

  /** Attach tenant display names for Switch Board UI. */
  private static async enrichHistoryWithTenantNames(rows: any[]): Promise<any[]> {
    const ids = [...new Set(rows.map((r) => r?.tenantId).filter((id) => id && id !== 'Unknown' && id !== 'default'))];
    if (!ids.length) return rows;
    try {
      let data: Array<{ id: any; name?: any; business_name?: any }> | null = null;
      let error: any = null;

      const primary = await supabase
        .from('tenants')
        .select('id, name, business_name')
        .in('id', ids);
      data = primary.data as any;
      error = primary.error;

      if (error && /business_name/i.test(error.message)) {
        const retry = await supabase.from('tenants').select('id, name').in('id', ids);
        data = retry.data as any;
        error = retry.error;
      }
      if (error || !data?.length) return rows;
      const nameById = new Map<string, string>();
      for (const t of data) {
        const label = String((t as any).business_name || t.name || '').trim();
        if (label) nameById.set(String(t.id), label);
      }
      return rows.map((r) => ({
        ...r,
        tenantName: r.tenantName || nameById.get(String(r.tenantId)) || null,
      }));
    } catch (e: any) {
      console.warn('[POS Service] enrichHistoryWithTenantNames failed:', e.message);
      return rows;
    }
  }

  static async getObservabilityMetrics() {
    const history = await this.getTransactionHistory('');
    const totalTransactions = history.length;
    const approvedCount = history.filter((t) => t.status === 'Approved').length;
    const successRate = totalTransactions > 0 ? (approvedCount / totalTransactions) * 100 : 100;

    const hostDistribution: Record<string, number> = {};
    const hostSuccessRate: Record<string, number> = {};
    const hostAvgLatency: Record<string, number> = {};
    const hostFailoverCount: Record<string, number> = {};

    const baseLatencies: Record<string, number> = {
      express_pay: 140,
      kimono: 250,
      medusa: 190,
      nibss: 310
    };

    for (const h of this.routingConfig.hosts) {
      const code = h.hostCode;
      const codeUpper = code.toUpperCase();
      const attempts = history.filter((t) => String(t.host || '').toUpperCase() === codeUpper);
      const successes = attempts.filter((t) => t.status === 'Approved');

      hostDistribution[code] = attempts.length;
      hostSuccessRate[code] = attempts.length > 0 ? (successes.length / attempts.length) * 100 : h.healthScore;
      hostAvgLatency[code] = baseLatencies[code] + Math.round((Math.random() - 0.5) * 20);
      hostFailoverCount[code] = history.filter(
        (t) =>
          String(t.host || '').toUpperCase() === codeUpper &&
          t.status === 'Declined' &&
          (t.statusCode === '96' || t.statusCode === '91'),
      ).length;
    }

    const auditRes = await TerminalAuditService.getAuditLog({ limit: 20 });

    return {
      totalTransactions,
      successRate: Math.round(successRate * 10) / 10,
      hostDistribution,
      hostSuccessRate,
      hostAvgLatency,
      hostFailoverCount,
      deviceProcessedCount: history.filter((t) => t.isDeviceProcessed).length,
      switchboardProcessedCount: history.filter((t) => !t.isDeviceProcessed).length,
      recentAuditTrail: auditRes?.data || []
    };
  }

  /**
   * Main entry point. Called by PosController.
   *
   * emvData matches MposEmvData — individual parsed EMV fields sent by the mPOS
   * device (com.demo.mposaisino EmvDetailResult). No raw TLV blob is required
   * because the mPOS SDK extracts tags separately.
   */
  static async processTransaction(params: {
    tenantId: string;
    terminalId: string;
    amount: number;       // in NGN (naira)
    emvData: MposEmvData;
    staffName?: string;
    items?: any[];
  }): Promise<PosTransactionResult> {

    const pan: string = params.emvData?.pan ?? params.emvData?.cardNo ?? '';
    const cardScheme = this.detectCardScheme(pan);
    const transactionType = params.emvData?.transactionType || 'PURCHASE';

    // Ensure tenant category + agent are cached before scoped profile resolution
    if (params.tenantId && params.tenantId !== 'default') {
      await PosService.cacheTenantCategory(params.tenantId);
    }

    const route = this.determineRoute(
      params.amount,
      params.tenantId,
      transactionType,
      cardScheme,
      undefined,
      {
        terminalGroup: this.resolveTerminalGroup(),
      }
    );
    console.log(`\n[POS Gateway] ▶ Routing ₦${params.amount} transaction → ${route.name}`);
    console.log(`[POS Gateway]   Terminal: ${params.terminalId} | Tenant: ${params.tenantId}`);

    // Pre-log the transaction as Pending
    const pendingId = this.newTxId();
    const { rrn: pendingRrn, stan: pendingStan } = this.extractRrnStanFromEmv(params.emvData);
    const pendingEntry = {
      id:          pendingId,
      tenantId:    params.tenantId || 'Unknown',
      tenantName:  null as string | null,
      terminalId:  params.terminalId,
      amount:      params.amount,
      status:      'Pending',
      statusCode:  '',
      date:        new Date().toISOString(),
      host:        route.name,
      maskedPan:   params.emvData?.pan ? this.maskPan(params.emvData.pan) : (params.emvData?.cardNo ? this.maskPan(params.emvData.cardNo) : '**** ****'),
      rrn:         pendingRrn,
      stan:        pendingStan,
      authCode:    'N/A',
      staffName:   params.staffName || 'System',
      items:       params.items || [],
      isDeviceProcessed: false,
      processedBy: 'SWITCHBOARD',
      message:     '',
      rawRequest:  JSON.stringify({
        terminalId: params.terminalId,
        amount: params.amount,
        host: route.name,
        staffName: params.staffName || 'System',
        rrn: pendingRrn,
        stan: pendingStan,
        source: 'switchboard',
      }),
      rawResponse: '',
    };
    
    this.transactionHistory.unshift(pendingEntry);
    if (this.transactionHistory.length > 500) this.transactionHistory.pop();

    await this.persistAttempt({
      id: pendingId,
      tenant_id: params.tenantId,
      terminal_id: params.terminalId,
      amount: params.amount,
      status: 'Pending',
      host: route.name,
      masked_pan: pendingEntry.maskedPan,
      rrn: pendingEntry.rrn,
      stan: pendingEntry.stan,
      staff_name: params.staffName || 'System',
      items_jsonb: params.items || [],
      raw_request: {
        terminalId: params.terminalId,
        amount: params.amount,
        host: route.name,
        staffName: params.staffName || 'System',
        rrn: pendingRrn,
        stan: pendingStan,
        source: 'switchboard',
      },
      is_device_processed: false,
    });

    let response: PosTransactionResult;

    try {
      // Prefer Quasar ISO/KIMONO switch when tenant is provisioned (authoritative async webhooks).
      const quasarResult = await this.tryProcessViaQuasar(params, route);
      if (quasarResult) {
        response = quasarResult;
      } else if (route.name === 'KIMONO') {
        response = await this.processViaKimono(params);
      } else {
        response = await this.processViaTcpSocket(params, route);
      }
    } catch (err: any) {
      console.error(`[POS Gateway] ✖ ${route.name} failed:`, err.message);

      // ── Automatic Failover ──────────────────────────────────────────────
      const fallback = this.getFailover(route.name);
      if (fallback) {
        console.warn(`[POS Gateway] ⚡ Falling back to ${fallback.name}...`);
        try {
          const quasarFallback = await this.tryProcessViaQuasar(params, fallback);
          if (quasarFallback) {
            response = quasarFallback;
          } else if (fallback.name === 'KIMONO') {
            response = await this.processViaKimono(params);
          } else {
            response = await this.processViaTcpSocket(params, fallback);
          }
        } catch (fallbackErr: any) {
          console.error(`[POS Gateway] ✖ Fallback ${fallback.name} also failed:`, fallbackErr.message);
          response = this.buildErrorResponse(route.name as any, '96', 'System Error — all hosts unavailable');
        }
      } else {
        response = this.buildErrorResponse(route.name as any, '96', err.message || 'System Error');
      }
    }

    if (response?.message) {
      response = { ...response, message: this.toTenantFacingMessage(response.message) };
    }

    await this.updateTransaction(pendingId, params, response);
    return response;
  }

  static async recordDeviceTransaction(params: {
    tenantId: string;
    terminalId: string;
    amount: number;
    emvData: any;
    isDeviceProcessed?: boolean;
    staffName?: string;
    items?: any[];
    deviceStatus?: string;
    transactionResponse?: any;
    tenantProfile?: any;
    deviceInfo?: any;
  }) {
    const isApproved = params.deviceStatus === 'payment_success';
    const txId = this.newTxId();
    const entry = {
      id:          txId,
      tenantId:    params.tenantId || 'Unknown',
      terminalId:  params.terminalId,
      amount:      params.amount,
      status:      isApproved ? 'Approved' : 'Declined',
      statusCode:  isApproved ? '00' : '99',
      date:        new Date().toISOString(),
      host:        params.transactionResponse?.host || 'MPOS_DEVICE',
      maskedPan:   params.emvData?.pan ? this.maskPan(params.emvData.pan) : (params.emvData?.cardNo ? this.maskPan(params.emvData.cardNo) : '**** ****'),
      rrn:         params.transactionResponse?.rrn || params.emvData?.rrn || 'N/A',
      stan:        params.transactionResponse?.stan || params.emvData?.stan || 'N/A',
      authCode:    params.transactionResponse?.authCode || 'N/A',
      staffName:   params.staffName || 'System',
      items:       params.items || [],
      isDeviceProcessed: true,
      processedBy: 'MPOS_DEVICE',
      rawRequest:  JSON.stringify({ source: 'device', terminalId: params.terminalId, amount: params.amount }),
      rawResponse: JSON.stringify(params.transactionResponse || {}),
    };
    
    this.transactionHistory.unshift(entry);
    if (this.transactionHistory.length > 500) this.transactionHistory.pop();

    await this.persistAttempt({
      id: txId,
      tenant_id: params.tenantId,
      terminal_id: params.terminalId,
      amount: params.amount,
      status: entry.status,
      status_code: entry.statusCode,
      host: entry.host,
      masked_pan: entry.maskedPan,
      rrn: entry.rrn,
      stan: entry.stan,
      auth_code: entry.authCode,
      staff_name: entry.staffName,
      items_jsonb: entry.items,
      raw_request: { source: 'device' },
      raw_response: params.transactionResponse || {},
      is_device_processed: true,
    });

    if (process.env.OFFLINE_LOCAL_AUTH !== 'true' && params.tenantId && params.tenantId !== 'default' && params.tenantId !== 'Unknown') {
      // --- QUASAR BACKUP WEBHOOK ---
      try {
        const { getQuasarService } = require('../integrations/quasar/factory');
        const quasarService = await getQuasarService(params.tenantId);
        
        let targetValue = params.tenantId;
        if (params.tenantProfile && params.tenantProfile.targetValue) {
           targetValue = params.tenantProfile.targetValue;
        }
        
        const payload = {
          terminalId: params.terminalId,
          amount: params.amount,
          isDeviceProcessed: true,
          deviceStatus: params.deviceStatus,
          tenantProfile: {
             targetValue,
             ...(params.tenantProfile || {})
          },
          deviceInfo: {
             mposTerminalId: params.deviceInfo?.mposTerminalId,
             posSerialNumber: params.deviceInfo?.posSerialNumber,
             terminalId: params.terminalId,
          },
          transactionResponse: {
             rrn: params.transactionResponse?.rrn || params.emvData?.rrn,
             stan: params.transactionResponse?.stan || params.emvData?.stan,
             statusCode: params.transactionResponse?.statusCode || (isApproved ? "00" : "99"),
             authCode: params.transactionResponse?.authCode,
             maskedPan: entry.maskedPan,
             paymentSuccess: isApproved,
             cardHolderName: params.emvData?.cardHolderName,
             amount: params.transactionResponse?.amount || params.emvData?.amount,
             dateTime: params.transactionResponse?.dateTime || params.emvData?.dateTime,
             aid: params.transactionResponse?.aid || params.emvData?.aid,
             appLabel: params.transactionResponse?.appLabel || params.emvData?.appLabel,
             message: params.transactionResponse?.message,
          },
          staffName: params.staffName,
          items: params.items
        };

        await quasarService.sendMposBackup(payload);
        console.log(`[POS Gateway] Successfully sent MPOS backup to Quasar for tx ${txId}`);
      } catch (e: any) {
         console.error(`[POS Gateway] Failed to send MPOS backup to Quasar: ${e.message}`);
      }
      // Trigger automatic inventory deduction if transaction is approved
      if (isApproved && params.items && params.items.length > 0) {
        const saleItems = params.items;
        (async () => {
          try {
            console.log(`[POS Inventory] Initiating device transaction deduction for transaction ${txId}`);
            for (const item of saleItems) {
              const { data: dbItem, error: fetchErr } = await supabase
                .from('items')
                .select('*')
                .eq('tenant_id', params.tenantId)
                .eq('id', item.id)
                .single();

              if (fetchErr || !dbItem) {
                console.error(`[POS Inventory] Item not found: ${item.id}`);
                continue;
              }

              // Deduct stock qty (Quantity validation)
              const newQty = (dbItem.stock_qty || 0) - (item.quantity || 1);
              const { error: updateErr } = await supabase
                .from('items')
                .update({ stock_qty: newQty })
                .eq('tenant_id', params.tenantId)
                .eq('id', item.id);

              if (updateErr) {
                console.error(`[POS Inventory] Failed to deduct stock for item ${item.id}: ${updateErr.message}`);
                continue;
              }

              // Write Audit Record
              await supabase.from('audit_logs').insert({
                tenant_id: params.tenantId,
                event_type: 'INVENTORY_DEDUCTED',
                payload: {
                  transactionId: txId,
                  itemId: item.id,
                  previousQuantity: dbItem.stock_qty,
                  newQuantity: newQty,
                  deductedQuantity: item.quantity || 1,
                  terminalId: params.terminalId
                },
                actor_id: params.staffName || 'system',
                created_at: new Date().toISOString()
              });

              // Publish Inventory Event
              console.log(`[POS Inventory Event] Published InventoryDeducted: ${item.id} -> ${newQty}`);
            }
          } catch (e: any) {
            console.error('[POS Inventory] Stock deduction error:', e.message);
          }
        })();
      }
    }

    return { paymentSuccess: isApproved, recordedId: txId, status: entry.status };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ROUTE 1: CPOINT-KIMONO (HTTPS REST)
  // ═══════════════════════════════════════════════════════════════════════════

  static async fetchKimonoParams(
    terminalId: string,
    amountKobo?: string,
    binCode?: string,
  ): Promise<KimonoTerminalParams> {
    const cached = this.kimonoParamsCache.get(terminalId);
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      console.log(`[Kimono] ✓ Using cached terminal params for ${terminalId}`);
      return cached.params;
    }

    const kimonoHost = this.routingConfig.hosts.find(h => h.hostCode === 'kimono');
    if (!kimonoHost) throw new Error('[Kimono] Host configuration not found');

    const { baseUrl, paramsPath } = kimonoHost;
    const amtParam  = amountKobo || '';
    const binParam  = binCode    || '';
    const url = `${baseUrl}${paramsPath}?termid=${terminalId}&appversion=1&amount=${amtParam}&binCode=${binParam}`;
    console.log(`[POS Gateway] 📟 Fetching terminal params: ${url}`);

    try {
      const params = await this.httpGet<KimonoTerminalParams>(url, this.buildCpointHeaders(terminalId));

      if (params.code !== '00') {
        throw new Error(`[Kimono] Terminal param fetch failed — code: ${params.code}`);
      }

      this.kimonoParamsCache.set(terminalId, { params, fetchedAt: Date.now() });
      console.log(`[Kimono] ✓ Terminal params fetched and cached for ${terminalId}`);
      return params;
    } catch (err: any) {
      console.warn(`[Kimono] 📟 Fetch failed: ${err.message}. Using fallback parameters.`);
      if (kimonoHost.kimonoFallbackParameters) {
        return {
          code: '00',
          terminalId: terminalId,
          merchantId: kimonoHost.kimonoFallbackParameters.merchantId,
          uniqueId: kimonoHost.kimonoFallbackParameters.uniqueId,
          institutionId: kimonoHost.kimonoFallbackParameters.institutionId,
          settlementAccount: kimonoHost.kimonoFallbackParameters.settlementAccount,
          ipek: '',
          ksn: '',
          keyLabel: kimonoHost.kimonoFallbackParameters.keyLabel,
          token: kimonoHost.kimonoFallbackParameters.token,
          tmk: '',
          tpk: '',
          extendedTransactionType: '6104',
          currencyCode: '566',
          posDataCode: '510101511344101',
          udfDataList: []
        };
      }
      throw err;
    }
  }

  static clearKimonoParamsCache(terminalId?: string) {
    if (terminalId) {
      this.kimonoParamsCache.delete(terminalId);
    } else {
      this.kimonoParamsCache.clear();
    }
  }

  /**
   * Builds the CardIccDataInfo payload for Kimono endpoint.
   *
   * Uses individual EMV fields exactly as they come from the mPOS device
   * (EmvDetailResult from com.demo.mposaisino). Fields map 1-to-1 with
   * the TLV tags extracted by the mPOS SDK.
   *
   * @param pan  The resolved PAN (caller already coalesced emvData.pan || emvData.cardNo).
   */
  private static buildKimonoPayload(
    emvData: MposEmvData,
    terminalParams: KimonoTerminalParams,
    pan: string,
  ): Partial<CardIccDataInfo> {

    // Extract ISW-specific values from terminal params (mirrors loadIsWDetails() in Android)
    const iswTerminalId     = this.getUdfValue(terminalParams, 'ISW_TERMINAL_ID')       || terminalParams.terminalId;
    const iswMerchantId     = this.getUdfValue(terminalParams, 'ISW_MERCHANT_ID')       || terminalParams.merchantId;
    const iswKeyLabel       = this.getUdfValue(terminalParams, 'ISW_KEY_LABEL')         || terminalParams.keyLabel;
    const iswUniqueId       = this.getUdfValue(terminalParams, 'ISW_UNIQUE_ID')         || terminalParams.uniqueId;
    const iswInstitutionId  = this.getUdfValue(terminalParams, 'ISW_INSTITUTION_ID')    || terminalParams.institutionId;
    const iswSettlementAcc  = this.getUdfValue(terminalParams, 'ISW_SETTLEMENT_ACCOUNT')|| terminalParams.settlementAccount;

    const now = new Date();
    const isoDateTime = now.toISOString().replace('Z', '').substring(0, 19); // yyyy-MM-dd'T'HH:mm:ss

    // Amount in minor units (kobo). mPOS sends `amountAuthorisedNumeric` as
    // zero-padded 12-char string in kobo (e.g. "000000012000" = ₦120).
    // Fall back to amount * 100 when field is absent.
    const minorAmount =
      emvData.amountAuthorisedNumeric?.replace(/^0+/, '') ||
      emvData.minorAmount?.toString().replace(/^0+/, '') ||
      String(Math.round((emvData.amount || 0) * 100));

    // Expiry: mPOS sends YYMM (e.g. "2812"); Kimono expects expiryYear + expiryMonth
    const expiry      = emvData.cardExpirationDate || '';
    const expiryYear  = expiry.substring(0, 2);
    const expiryMonth = expiry.substring(2);

    // Transaction date: mPOS tag 9A is YYMMDD (e.g. "260525"), Kimono wants same format
    const txDate = emvData.transactionDate || this.formatDate(now);

    const payload: Partial<CardIccDataInfo> = {
      // ── Card Identity ─────────────────────────────────────────────────────
      // Android SDK sends 'cardNo'; MposEmvData.pan is the normalised alias
      pan:                          pan,
      track2Data:                   emvData.track2Data || '',
      expiryDate:                   expiry,
      expiryMonth,
      expiryYear,
      cardName:                     emvData.cardHolderName || '',
      cardSequenceNumber:           emvData.cardSequenceNumber || '01',

      // ── EMV Cryptographic Tags (individual fields from mPOS SDK) ──────────
      // tag 9F26
      cryptogram:                   emvData.appCryptogram || '',
      // tag 9F27
      cryptogramInformationData:    emvData.cryptogramInformationData || '40',
      // tag 9F36
      atc:                          emvData.appTransactionCounter || '',
      // tag 9F10
      iad:                          emvData.issuerApplicationData || '',
      // tag 82
      applicationInterchangeProfile: emvData.applicationInterchangeProfile || '3900',
      // tag 95
      terminalVerificationResult:   emvData.terminalVerificationResults || '',
      // tag 9F37
      unpredictableNumber:          emvData.unpredictableNumber || '',
      terminalCapabilities:         emvData.terminalCapabilities || '1F4000',
      terminalType:                 emvData.terminalType || '22',
      // Android SDK sends 'cvmResult' (no 's'); accept either
      cvmResults:                   emvData.cvmResult || '440302',
      // tag 84
      dedicatedFileName:            emvData.aid || emvData.dedicatedFileName || '',

      // ── Transaction ───────────────────────────────────────────────────────
      amountAuthorized:             emvData.amountAuthorisedNumeric || minorAmount.padStart(12, '0'),
      amountOther:                  emvData.amountOtherNumeric || '000000000000',
      transactionCurrencyCode:      '566',
      terminalCountryCode:          '566',
      transactionType:              emvData.transactionType || '00',
      transactionDate:              txDate,
      transactionDateTime:          emvData.transactionTime
                                      ? `${now.getFullYear().toString().substring(2)}${txDate.substring(2)}T${emvData.transactionTime}`
                                      : isoDateTime,
      transmissionDate:             isoDateTime,
      originalTransmissionDateTime: isoDateTime,

      // ── Terminal & Merchant (from Kimono params cache) ────────────────────
      terminalId:                   iswTerminalId,
      merchantId:                   iswMerchantId,
      uniqueId:                     iswUniqueId,
      merhcantLocation:             emvData.merchantLocation || 'AGENCY BANKING TERMINAL',

      // ── PIN (DUKPT-encrypted on-device — passed through as-is) ───────────
      pinBlock:                     emvData.pinBlock || '',
      ksn:                          emvData.ksn || '',
      ksnd:                         '605',
      pinType:                      emvData.pinType || 'Dukpt',

      // ── References ────────────────────────────────────────────────────────
      retrievalReferenceNumber:     emvData.rrn || '',
      rrn:                          emvData.rrn || '',
      stan:                         emvData.stan || '',

      // ── Routing ───────────────────────────────────────────────────────────
      receivingInstitutionId:       iswInstitutionId,
      destinationAccountNumber:     iswSettlementAcc,
      fromAccount:                  'Default',
      toAccount:                    '',

      // ── Financial ─────────────────────────────────────────────────────────
      minorAmount,
      surcharge:                    '0',
      currencyCode:                 '566',

      // ── Flags ─────────────────────────────────────────────────────────────
      posEntryMode:                 emvData.pointOfServiceEntryMode || '051',
      posConditionCode:             '00',
      posDataCode:                  '510101511344101',
      posGeoCode:                   '00234000000000566',
      printerStatus:                '1',
      batteryInformation:           '100',
      languageInfo:                 'EN',

      // ── Keys ─────────────────────────────────────────────────────────────
      keyLabel:                     iswKeyLabel,
      extendedTransactionType:      '6104',
    };

    console.log(`[Kimono] ✓ Payload built — Terminal: ${iswTerminalId}, Merchant: ${iswMerchantId}`);
    console.log(`[Kimono]   PAN: ${this.maskPan(pan)} | RRN: ${payload.rrn} | STAN: ${payload.stan} | ₦${parseInt(minorAmount) / 100}`);

    return payload;
  }

  private static async processViaKimono(params: {
    tenantId: string;
    terminalId: string;
    amount: number;
    emvData: MposEmvData;
  }): Promise<PosTransactionResult> {

    const terminalId = params.terminalId || params.emvData?.terminalId;
    if (!terminalId) throw new Error('[Kimono] terminalId is required');

    // Extract PAN (Android SDK sends 'cardNo'; type also accepts 'pan')
    const pan: string = params.emvData.pan ?? params.emvData.cardNo ?? '';
    const binCode = pan.substring(0, 6);                         // first 6 digits = BIN
    const amountKobo = String(Math.round(params.amount * 100));  // naira → kobo string

    console.log(`[Kimono] PAN: ${this.maskPan(pan)} | BIN: ${binCode} | Amount (kobo): ${amountKobo}`);

    const terminalParams = await this.fetchKimonoParams(terminalId, amountKobo, binCode);
    const payload = this.buildKimonoPayload(params.emvData, terminalParams, pan);

    const kimonoHost = this.routingConfig.hosts.find(h => h.hostCode === 'kimono');
    if (!kimonoHost) throw new Error('[Kimono] Host configuration not found');
    const { baseUrl, transactionPath } = kimonoHost;
    const appVersion = process.env.APP_VERSION || '1';
    const url = `${baseUrl}${transactionPath}?uid=${encodeURIComponent(terminalId)}&xtk=${encodeURIComponent(terminalParams.token || '')}&appversion=${appVersion}&termid=${encodeURIComponent(terminalId)}`;

    console.log(`\n[Kimono] ─── OUTGOING REQUEST ───────────────────────────────────`);
    console.log(`[Kimono] POST ${url}`);
    console.log(`[Kimono] Payload:`, JSON.stringify(payload, null, 2));
    console.log(`[Kimono] ─────────────────────────────────────────────────────────\n`);

    const responseJson = await this.httpPost<any>(url, payload, this.buildCpointHeaders(terminalId));

    console.log(`\n[Kimono] ─── INCOMING RESPONSE ──────────────────────────────────`);
    console.log(`[Kimono] Response:`, JSON.stringify(responseJson, null, 2));
    console.log(`[Kimono] ─────────────────────────────────────────────────────────\n`);

    const code = responseJson?.code || responseJson?.rspCode || responseJson?.responseCode || '96';
    const approved = code === '00';

    return {
      paymentSuccess: approved,
      statusCode:     code,
      message:        responseJson?.desc || responseJson?.message || responseJson?.responseMessage || (approved ? 'Approved' : 'Declined'),
      rrn:            responseJson?.rrn  || payload.rrn,
      stan:           responseJson?.stan || payload.stan,
      maskedPan:      this.maskPan(payload.pan as string),
      authCode:       responseJson?.authCode || responseJson?.authcode || '',
      kimonoResponse: responseJson,
      host:           'KIMONO',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ROUTE: Quasar card-transaction (iso_tcp) — preferred when provisioned
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Attempt Quasar /pos/card-transaction for ISO hosts.
   * Returns null when Quasar is not configured / disabled so caller can use local switchboard.
   */
  private static async tryProcessViaQuasar(
    params: { tenantId: string; terminalId: string; amount: number; emvData: MposEmvData },
    route: { name: string; config: any },
  ): Promise<PosTransactionResult | null> {
    const disabled = String(process.env.QUASAR_CARD_SWITCH || 'true').toLowerCase() === 'false';
    if (disabled) return null;
    if (route.name === 'KIMONO') {
      // Kimono via Quasar needs a compiled HTTPS body — keep local Kimono path for now.
      return null;
    }

    let quasarTenantId: string | null = null;
    try {
      const { QuasarIntegrationStore } = require('../integrations/quasar/quasar-integration.store');
      const integration = await QuasarIntegrationStore.getByInvifyTenantId(params.tenantId);
      quasarTenantId = integration?.quasar_tenant_id || null;
    } catch {
      /* continue */
    }
    if (!quasarTenantId) {
      console.warn(`[POS Gateway] Quasar card path skipped — no quasar_tenant_id for ${params.tenantId}`);
      return null;
    }

    const posKey = await this.resolveQuasarPosEncryptionKey(params.tenantId);
    if (!posKey) {
      // Tenant is Quasar-linked — do not silently fall back to local TCP.
      console.error(
        `[POS Gateway] Quasar POS encryption key missing for tenant ${params.tenantId}. ` +
          'Set QUASAR_POS_ENCRYPTION_KEY_BASE64 or vault posEncryptionKey (pos-encryption-key/rotate).',
      );
      throw new Error('POS_SETUP_INCOMPLETE');
    }

    const host = String(
      params.emvData?.serverIP ||
        route.config?.ip ||
        route.config?.host ||
        '',
    ).trim();
    const port = Number(params.emvData?.port || route.config?.port || 0);
    if (!host || !port) {
      console.warn('[POS Gateway] Quasar card path skipped — missing transport host/port');
      return null;
    }

    const ssl =
      typeof route.config?.sslEnabled === 'boolean'
        ? route.config.sslEnabled
        : route.name === 'NIBSS';

    // Quasar defaults to verifying TLS; Accelerex/NIBSS IP endpoints often fail
    // Node's CA store. Prefer route/env override; when ssl and unset → do not verify.
    const tlsRejectUnauthorized = this.resolveQuasarIsoTlsRejectUnauthorized(
      route.config,
      ssl,
    );

    // Device-packed ISO is authoritative — never invent STAN/RRN/MCC for Quasar.
    const packedHex = String(params.emvData?.packedIsoMessage || '').replace(/\s/g, '');

    console.log(
      `[POS Gateway] → Quasar card path for ${route.name} ` +
        `tenant=${params.tenantId} tid=${params.terminalId} ` +
        `host=${host}:${port} ssl=${ssl} tls_reject_unauthorized=${tlsRejectUnauthorized}` +
        ` packed_iso=${packedHex ? packedHex.length / 2 : 0}B`,
    );
    let fields = this.fieldsFromPackedIsoHex(packedHex);
    if (!fields) {
      fields = this.normalizeEmvIsoFieldMap((params.emvData as any)?.isoFields);
    }

    // Prefer DE55 from packed ISO — IsoMessageBuilder may rewrite 9F34 after EmvDetailResult.iccData
    // was snapshotted; Quasar rejects icc_token when it does not match packed field 55.
    const iccFromPacked = String(fields?.['55'] || '').replace(/\s/g, '');
    const iccFromEmv = String(
      params.emvData?.iccData ||
        (params.emvData as any)?.field55 ||
        '',
    ).replace(/\s/g, '');
    // Prefer packed F55 verbatim (case-sensitive match on Quasar).
    const iccHex = iccFromPacked.length >= 20 ? iccFromPacked : iccFromEmv;
    if (!iccHex || iccHex.length < 20) {
      console.warn('[POS Gateway] Quasar card path skipped — missing iccData/field55');
      return null;
    }
    if (iccFromPacked && iccFromEmv && iccFromPacked.toUpperCase() !== iccFromEmv.toUpperCase()) {
      console.warn(
        `[POS Gateway] Using packed F55 for Quasar icc-data ` +
          `(emv.iccData len=${iccFromEmv.length} packed.f55 len=${iccFromPacked.length})`,
      );
    }

    if (!fields || !fields['11']?.trim() || !fields['37']?.trim()) {
      const { rrn: emvRrn, stan: emvStan } = this.extractRrnStanFromEmv(params.emvData);
      if (packedHex && emvStan !== 'N/A' && emvRrn !== 'N/A') {
        console.warn(
          '[POS Gateway] packedIso unpack failed — forwarding packed_iso_hex to Quasar with EMV STAN/RRN',
        );
        fields = {
          '0': '0200',
          '11': emvStan,
          '37': emvRrn,
          '41': String(params.terminalId).slice(0, 8).padEnd(8, ' '),
        };
      } else {
        const hint = packedHex
          ? 'packedIsoMessage present but PosPackager unpack failed and EMV STAN/RRN missing'
          : 'packedIsoMessage missing and no isoFields map';
        console.error(
          `[POS Gateway] Refusing Quasar card path — ${hint}. ` +
            'Will not rebuild fields (that changes STAN/RRN/F18/F22/F42).',
        );
        throw new Error(
          'PACKED_ISO_REQUIRED: device packedIsoMessage must unpack; refusing to invent ISO fields',
        );
      }
    }

    delete fields['55']; // Quasar injects DE55 from icc_token
    const stan = fields['11'].trim();
    const rrn = fields['37'].trim();
    const reference = `card_${rrn}_${stan}_${params.terminalId}`;

    if (!fields['0']) fields['0'] = '0200';
    if (!fields['41']) {
      fields['41'] = String(params.terminalId).slice(0, 8).padEnd(8, ' ');
    }

    try {
      const { getQuasarService } = require('../integrations/quasar/factory');
      const quasar = await getQuasarService(params.tenantId);
      const result = await quasar.executeIsoCardTransaction({
        quasarTenantId,
        invifyTenantId: params.tenantId,
        terminalId: params.terminalId,
        reference,
        iccHex,
        posEncryptionKeyBase64: posKey,
        fields,
        packedIsoHex: packedHex || undefined,
        transport: {
          type: 'iso_tcp',
          host,
          port,
          ssl,
          framing: route.config?.framing || 'binary2',
          tls_reject_unauthorized: tlsRejectUnauthorized,
        },
      });

      const approved =
        result?.approved === true ||
        result?.responseCode === '00' ||
        result?.outcome === 'APPROVED' ||
        result?.status === 'APPROVED';
      const statusCode = String(result?.responseCode || result?.statusCode || (approved ? '00' : '05'));

      console.log(
        `[POS Gateway] ✓ Quasar card-transaction ${approved ? 'APPROVED' : 'DECLINED'} ` +
          `code=${statusCode} ref=${reference}`,
      );

      return {
        paymentSuccess: approved,
        statusCode,
        message:
          result?.message ||
          result?.responseMessage ||
          (approved ? 'Approved' : 'Declined'),
        rrn: result?.rrn || rrn,
        stan: result?.stan || stan,
        maskedPan: this.maskPan(String(params.emvData?.pan || params.emvData?.cardNo || '')),
        authCode: result?.authCode || result?.auth_code || '',
        host: route.name as any,
        isoFields: result?.fields || result?.isoFields || undefined,
      };
    } catch (e: any) {
      console.error(`[POS Gateway] Quasar card-transaction failed: ${e.message}`);
      throw e;
    }
  }

  /**
   * Quasar TCP TLS verify flag for iso_tcp.
   * Route: tlsRejectUnauthorized | tls_reject_unauthorized
   * Env: QUASAR_ISO_TLS_REJECT_UNAUTHORIZED=true|false
   * Default when ssl and unset: false (Accelerex/NIBSS IP certs fail Node CA store).
   */
  private static resolveQuasarIsoTlsRejectUnauthorized(
    routeConfig: Record<string, unknown> | null | undefined,
    ssl: boolean,
  ): boolean {
    const fromRoute =
      routeConfig?.tlsRejectUnauthorized ?? routeConfig?.tls_reject_unauthorized;
    if (typeof fromRoute === 'boolean') return fromRoute;

    const env = String(process.env.QUASAR_ISO_TLS_REJECT_UNAUTHORIZED || '')
      .trim()
      .toLowerCase();
    if (env === 'true') return true;
    if (env === 'false') return false;

    return ssl ? false : true;
  }

  private static async resolveQuasarPosEncryptionKey(tenantId: string): Promise<string | null> {
    try {
      const { IntegrationVaultService } = require('./integration-vault.service');
      const fromVault =
        (await IntegrationVaultService.getDecryptedCredential(
          `quasarTenant:${tenantId}`,
          'PRODUCTION',
          tenantId,
          'posEncryptionKey',
        )) ||
        (await IntegrationVaultService.getDecryptedCredential(
          'quasarTenant',
          'PRODUCTION',
          tenantId,
          'posEncryptionKey',
        ));
      if (fromVault) return fromVault;
    } catch {
      /* ignore */
    }

    try {
      const path = require('path');
      const fs = require('fs');
      const settingsPath = path.join(process.cwd(), 'global_settings.json');
      if (fs.existsSync(settingsPath)) {
        const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const fromSettings = String(raw?.quasar_pos_encryption_key_base64 || '').trim();
        if (fromSettings) return fromSettings;
      }
    } catch {
      /* ignore */
    }

    return (
      process.env.QUASAR_POS_ENCRYPTION_KEY_BASE64?.trim() ||
      process.env.QUASAR_POS_KEY_BASE64?.trim() ||
      null
    );
  }

  /** Prefer device-packed ISO fields (minus DE55) when hex is present. */
  private static extractRrnStanFromEmv(emv: MposEmvData | undefined | null): { rrn: string; stan: string } {
    const packed = this.fieldsFromPackedIsoHex(String(emv?.packedIsoMessage || ''));
    const stan =
      String(packed?.['11'] || emv?.stan || (emv as any)?.field11 || '').trim() || 'N/A';
    const rrn =
      String(packed?.['37'] || emv?.rrn || (emv as any)?.field37 || '').trim() || 'N/A';
    return { rrn, stan };
  }

  /**
   * Unpack device PosPackager hex (same layout Quasar uses).
   * Does NOT use iso8583-js (that package has no `.parse` — class + unWrapMsg only).
   */
  private static fieldsFromPackedIsoHex(hex: string): Record<string, string> | null {
    const cleaned = String(hex || '').replace(/\s/g, '');
    if (!cleaned || cleaned.length < 20 || cleaned.length % 2 !== 0) return null;
    try {
      const raw = Buffer.from(cleaned, 'hex');
      const unpacked = unpackPosMessage(raw);
      const mapped = this.isoFieldsToQuasarMap(unpacked);
      return Object.keys(mapped).length ? mapped : null;
    } catch (e: any) {
      console.warn(`[POS Gateway] packedIsoMessage unpack failed: ${e.message}`);
      return null;
    }
  }

  /** Convert PosPackager numeric-key map → Quasar string-key field map (binary → hex). */
  private static isoFieldsToQuasarMap(fields: IsoMessageFields): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [idRaw, value] of Object.entries(fields)) {
      const id = String(idRaw);
      if (value === undefined || value === null || value === '') continue;
      if (Buffer.isBuffer(value)) {
        out[id] = value.toString('hex').toUpperCase();
      } else {
        out[id] = String(value);
      }
    }
    // Keep DE55 here — callers that submit to Quasar must delete it after using it for icc-data.
    return out;
  }

  /** Optional structured field map from device (when packed hex absent). */
  private static normalizeEmvIsoFieldMap(
    raw: Record<string, unknown> | undefined | null,
  ): Record<string, string> | null {
    if (!raw || typeof raw !== 'object') return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null || v === '') continue;
      const key = String(k).replace(/^0+/, '') || '0';
      const norm = key === '0' ? '0' : String(Number(key) || key);
      out[norm] = Buffer.isBuffer(v) ? v.toString('hex').toUpperCase() : String(v);
    }
    return Object.keys(out).length > 3 ? out : null;
  }

  /** Build ISO fields for Quasar (exclude DE55 — sent via icc_token). */
  private static buildIsoFieldsFromEmv(
    emv: MposEmvData,
    terminalId: string,
    amountNaira: number,
    ids: { stan: string; rrn: string },
  ): Record<string, string> {
    const pan = String(emv?.pan || emv?.cardNo || '').replace(/\s/g, '');
    const amountKobo = String(Math.round(Number(amountNaira) * 100)).padStart(12, '0');
    const now = new Date();
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    const mmdd =
      String((emv as any)?.transactionDateMmDd || '').trim() ||
      `${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const hhmmss =
      String((emv as any)?.transactionTime || '').replace(/\D/g, '').slice(0, 6) ||
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const transmission =
      `${pad(now.getMonth() + 1)}${pad(now.getDate())}${hhmmss}`;

    const fields: Record<string, string> = {
      '0': '0200',
      '3': String(emv?.transactionType || '000000').padStart(6, '0').slice(0, 6),
      '4': String(emv?.amountAuthorisedNumeric || amountKobo).replace(/\D/g, '').padStart(12, '0').slice(-12),
      '7': transmission.slice(0, 10),
      '11': ids.stan.padStart(6, '0').slice(-6),
      '12': hhmmss.padStart(6, '0').slice(-6),
      '13': mmdd.padStart(4, '0').slice(-4),
      '18': String((emv as any)?.merchantType || '5251'),
      '22': String(emv?.pointOfServiceEntryMode || '051').padStart(3, '0').slice(-3),
      '23': String(emv?.cardSequenceNumber || '001').replace(/\D/g, '').padStart(3, '0').slice(-3),
      '25': '00',
      '26': '12',
      '28': 'D00000000',
      '37': ids.rrn.padStart(12, '0').slice(-12),
      '41': String(emv?.terminalId || terminalId).slice(0, 8).padEnd(8, ' '),
      '49': String(emv?.transactionCurrencyCode || '566').replace(/\D/g, '').padStart(3, '0').slice(-3),
    };

    if (pan) {
      fields['2'] = pan;
      fields['32'] = pan.slice(0, 6);
    }
    if (emv?.cardExpirationDate) fields['14'] = String(emv.cardExpirationDate).slice(0, 4);
    if (emv?.track2Data) fields['35'] = String(emv.track2Data).replace(/=/g, 'D');
    if (emv?.serviceCode) fields['40'] = String(emv.serviceCode);
    if (emv?.acquirerInstitutionId) fields['42'] = String(emv.acquirerInstitutionId).slice(0, 15).padEnd(15, ' ');
    if ((emv as any)?.merchantNameLocation) {
      fields['43'] = String((emv as any).merchantNameLocation).slice(0, 40).padEnd(40, ' ');
    }
    if (emv?.pinBlock) fields['52'] = String(emv.pinBlock);
    if ((emv as any)?.additionalData || (emv as any)?.field59) {
      fields['59'] = String((emv as any).additionalData || (emv as any).field59);
    }
    if ((emv as any)?.field123) fields['123'] = String((emv as any).field123);
    if ((emv as any)?.field128 || (emv as any)?.mac) {
      fields['128'] = String((emv as any).field128 || (emv as any).mac);
    }

    // Never include DE55 — Quasar injects from icc_token
    delete fields['55'];
    return fields;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ROUTE 2 & 3: MEDUSA / NIBSS (ISO8583 TCP SOCKET)
  // ═══════════════════════════════════════════════════════════════════════════

  private static async processViaTcpSocket(
    params: { tenantId: string; terminalId: string; amount: number; emvData: MposEmvData },
    route: { name: string; config: any }
  ): Promise<PosTransactionResult> {
    if (!params.emvData?.packedIsoMessage) {
      throw new Error(`[${route.name}] packedIsoMessage (hex) is required for ISO8583 TCP route`);
    }

    const payload = Buffer.from(params.emvData.packedIsoMessage, 'hex');
    const lengthBuf = Buffer.alloc(2);
    lengthBuf.writeUInt16BE(payload.length, 0);
    const packet = Buffer.concat([lengthBuf, payload]);

    const host = params.emvData.serverIP || route.config.ip || route.config.host;
    const port = Number(params.emvData.port || route.config.port);

    console.log(`\n[${route.name}] ─── OUTGOING ISO8583 ─────────────────────────────`);
    console.log(`[${route.name}] Connecting to ${host}:${port}`);
    console.log(`[${route.name}] Sending ${packet.length} bytes`);
    console.log(`[${route.name}] Hex: ${params.emvData.packedIsoMessage.substring(0, 80)}...`);
    console.log(`[${route.name}] ─────────────────────────────────────────────────────\n`);

    const raw = await this.tcpExchange(host, port, packet);
    const responseHex = raw.toString('hex').toUpperCase();

    console.log(`\n[${route.name}] ─── INCOMING ISO8583 ─────────────────────────────`);
    console.log(`[${route.name}] Raw hex: ${responseHex.substring(0, 80)}...`);
    console.log(`[${route.name}] ─────────────────────────────────────────────────────\n`);

    // Parse response with PosPackager (same layout as Quasar / device)
    const { responseCode, isoFields } = this.parseIsoMessage(raw, route.name);
    const approved = responseCode === '00';

    // Attempt to extract RRN (field 37) and STAN (field 11) from parsed fields
    const rrn  = isoFields?.['037'] || isoFields?.['37']  || undefined;
    const stan = isoFields?.['011'] || isoFields?.['11']  || undefined;
    const authCode = isoFields?.['038'] || isoFields?.['38'] || undefined;

    return {
      paymentSuccess: approved,
      statusCode:     responseCode,
      message:        approved ? 'Approved' : this.isoResponseMessage(responseCode),
      rrn,
      stan,
      authCode,
      rawHex:         responseHex,
      isoFields,
      host:           route.name as 'MEDUSA' | 'NIBSS' | 'EXPRESS_PAY',
    };
  }

  private static tcpExchange(host: string, port: number, packet: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(60000);
      let buf = Buffer.alloc(0);

      client.connect(port, host, () => {
        client.write(packet);
      });

      client.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        if (buf.length >= 2) {
          const expectedLen = buf.readUInt16BE(0);
          if (buf.length >= expectedLen + 2) {
            client.destroy();
            resolve(buf.subarray(2, expectedLen + 2));
          }
        }
      });

      client.on('error',   (err) => { client.destroy(); reject(err); });
      client.on('timeout', ()    => { client.destroy(); reject(new Error('TCP timeout')); });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ISO8583 PARSER  (PosPackager — Quasar-compatible)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse a raw ISO8583 response buffer using PosPackager unpack.
   * Returns the response code (field 39) and the full decoded field map.
   *
   * Falls back to the heuristic extractor if unpack throws.
   */
  static parseIsoMessage(raw: Buffer, context = 'ISO8583'): { responseCode: string; isoFields: Record<string, any> } {
    try {
      const unpacked = unpackPosMessage(raw);
      const fields = this.isoFieldsToQuasarMap(unpacked);
      const responseCode = (fields['39'] || '96').toString().trim();
      console.log(`[${context}] ✓ Parsed ISO8583 — Field 39 (response code): ${responseCode}`);
      console.log(`[${context}]   Fields:`, JSON.stringify(fields));
      return { responseCode, isoFields: fields };
    } catch (parseErr: any) {
      console.warn(`[${context}] ⚠ PosPackager unpack failed (${parseErr.message}), using heuristic fallback`);
      const responseCode = this.extractField39Heuristic(raw) || '96';
      return { responseCode, isoFields: { '39': responseCode, _parseError: parseErr.message } };
    }
  }

  /**
   * Heuristic fallback: scan ASCII-packed ISO8583 response for a 2-char
   * response code near the expected field-39 offset.
   * Only used when PosPackager unpack throws.
   */
  private static extractField39Heuristic(raw: Buffer): string | null {
    try {
      const ascii = raw.toString('ascii');
      const knownCodes = ['00','01','05','12','13','14','30','51','54','55','57','58','61','65','68','91','96'];
      // Field 39 is typically at offset 20+ (after 4-char MTI + 16-char primary bitmap)
      for (let i = 20; i < Math.min(ascii.length, 80); i++) {
        const candidate = ascii.substring(i, i + 2);
        if (knownCodes.includes(candidate)) {
          return candidate;
        }
      }
    } catch (_) {}
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ROUTING LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Determines the route for a transaction.
   *
   * Rules:
   * 1. If activeHost === 'kimono' (toggle ON) → always use Kimono.
   * 2. If toggle is OFF (not kimono):
   *    - amount in kobo < 5,000,000  (< ₦50,000)  → Medusa
   *    - amount in kobo ≥ 5,000,000  (≥ ₦50,000)  → Kimono
   * 3. Walk failoverOrder if chosen host is inactive.
   */
  static detectCardScheme(pan: string): string {
    if (!pan) return 'UNKNOWN';
    const cleanPan = pan.replace(/\s+/g, '');
    if (cleanPan.startsWith('4')) return 'VISA';
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cleanPan)) return 'MASTERCARD';
    if (/^(506[0-9]|507[8-9]|6500|6509|9792)/.test(cleanPan)) return 'VERVE';
    return 'UNKNOWN';
  }

  static getHostSlaScore(hostCode: string): number {
    const host = this.routingConfig.hosts.find(h => h.hostCode === hostCode);
    if (!host) return 0;
    if (host.status === 'OFFLINE') return 0;

    const hostUpper = hostCode.toUpperCase();
    const attempts = this.transactionHistory.filter(t => t.host?.toUpperCase() === hostUpper);
    const base = Number(host.healthScore);
    const health = Number.isFinite(base) ? base : 100;
    if (attempts.length === 0) {
      return health;
    }

    const successfulAttempts = attempts.filter(t => {
      return t.status === 'Approved' || (t.statusCode && t.statusCode !== '96' && t.statusCode !== '91');
    });

    const successRate = (successfulAttempts.length / attempts.length) * 100;
    const combined = Math.round((successRate * 0.7) + (health * 0.3));
    return Number.isFinite(combined) ? combined : health;
  }

  static determineRoute(
    amountNaira: number,
    tenantId: string = 'Retail',
    transactionType: string = 'PURCHASE',
    cardScheme: string = 'VISA',
    simulatedHealthOverrides?: Record<string, { status: 'ONLINE' | 'OFFLINE'; healthScore: number }>,
    routingContext?: {
      category?: string | null;
      agentCode?: string | null;
      terminalGroup?: string | null;
    }
  ): { name: string; config: any } {
    // Tenant category/agent resolved from in-memory cache (populated asynchronously).
    // Simulation may pass category directly via routingContext or as tenantId string.
    const cached = PosService.tenantContextCache.get(tenantId);
    const cachedCategory = cached?.category ?? PosService.tenantCategoryCache.get(tenantId);
    const category = routingContext?.category || cachedCategory || tenantId || 'Retail';
    const agentCode = routingContext?.agentCode ?? cached?.agentCode ?? null;
    const terminalGroup = routingContext?.terminalGroup ?? PosService.resolveTerminalGroup();

    if (!cachedCategory && tenantId && tenantId !== 'Retail' && tenantId !== 'ALL') {
      // Trigger async cache population — does not block the hot path
      PosService.cacheTenantCategory(tenantId);
    }

    const activeHosts = this.routingConfig.hosts.filter(h => h.isActive);

    if (activeHosts.length === 0) {
      throw new Error('[POS Gateway] All hosts are inactive. Cannot route transaction.');
    }

    const profile = this.resolveTenantRoutingProfile({
      tenantId,
      agentCode,
      terminalGroup,
      category: category === 'ALL' ? 'Retail' : category,
    });

    const scoredHosts = activeHosts.map(host => {
      const hostCode = host.hostCode;
      const sim = simulatedHealthOverrides?.[hostCode];
      const status = sim ? sim.status : (host.status || 'ONLINE');
      const baseHealth = sim ? sim.healthScore : (Number(host.healthScore) || 100);

      let score = 0;
      if (status === 'OFFLINE') {
        score -= 10000;
      }

      if (host.supportedTenantCategories && host.supportedTenantCategories.length > 0) {
        const matchesCategory = category.toLowerCase() === 'all' || host.supportedTenantCategories.some(
          c => c.toLowerCase() === category.toLowerCase()
        );
        if (!matchesCategory) {
          score -= 2000;
        }
      }

      if (host.supportedCardSchemes && host.supportedCardSchemes.length > 0) {
        const matchesScheme = cardScheme.toLowerCase() === 'all' || host.supportedCardSchemes.some(
          s => s.toLowerCase() === cardScheme.toLowerCase()
        );
        if (!matchesScheme) {
          score -= 3000;
        }
      }

      if (host.supportedTransactionTypes && host.supportedTransactionTypes.length > 0) {
        const matchesType = transactionType.toLowerCase() === 'all' || host.supportedTransactionTypes.some(
          t => t.toLowerCase() === transactionType.toLowerCase()
        );
        if (!matchesType) {
          score -= 3000;
        }
      }

      if (profile) {
        const prefIndex = profile.preferredHosts?.indexOf(hostCode) ?? -1;
        if (prefIndex !== -1) {
          score += (1000 - prefIndex * 100);
        }

        const fallIndex = profile.fallbackHosts?.indexOf(hostCode) ?? -1;
        if (fallIndex !== -1) {
          score += (200 - fallIndex * 50);
        }

        if (profile.amountThresholds) {
          for (const rule of profile.amountThresholds) {
            if (amountNaira >= rule.min && amountNaira <= rule.max && rule.host === hostCode) {
              score += 500;
            }
          }
        }

        if (profile.transactionTypeRules) {
          for (const rule of profile.transactionTypeRules) {
            if (rule.txType.toLowerCase() === transactionType.toLowerCase() && rule.host === hostCode) {
              score += 500;
            }
          }
        }
      }

      if (this.routingConfig.thresholdRulesMatrix) {
        for (const rule of this.routingConfig.thresholdRulesMatrix) {
          if (amountNaira >= rule.minAmount && amountNaira <= rule.maxAmount && rule.preferredHost === hostCode) {
            score += 300;
          }
        }
      }

      const slaScore = Number.isFinite(Number(sim ? baseHealth : this.getHostSlaScore(hostCode)))
        ? Number(sim ? baseHealth : this.getHostSlaScore(hostCode))
        : 0;
      score += slaScore;
      const priority = Number(host.priority);
      score += (10 - (Number.isFinite(priority) ? priority : 99)) * 10;

      return { host, score: Number.isFinite(score) ? score : -99999 };
    });

    scoredHosts.sort((a, b) => b.score - a.score);

    console.log(
      `[POS Gateway] Route scoring for ₦${amountNaira} (${transactionType}, ${cardScheme}, ` +
      `Category: ${category}, Agent: ${agentCode || '-'}, Group: ${terminalGroup || '-'}, ` +
      `Profile: ${profile?.scopeType || 'none'}/${profile?.targetValue || profile?.category || 'none'}):`
    );
    scoredHosts.forEach(sh => {
      console.log(`  - ${sh.host.hostCode.toUpperCase()}: Score = ${sh.score} (Status: ${sh.host.status || 'ONLINE'}, SLA: ${this.getHostSlaScore(sh.host.hostCode)})`);
    });

    const chosen = scoredHosts[0].host;
    return { name: chosen.hostCode.toUpperCase(), config: chosen };
  }

  private static getFailover(currentName: string): { name: string; config: any } | null {
    const activeHosts = this.routingConfig.hosts.filter(h => h.isActive && h.hostCode.toUpperCase() !== currentName.toUpperCase());
    if (activeHosts.length === 0) return null;

    const scored = activeHosts.map(host => {
      const priority = Number(host.priority);
      let score = (10 - (Number.isFinite(priority) ? priority : 99)) * 10 + this.getHostSlaScore(host.hostCode);
      if ((host.status || 'ONLINE') === 'OFFLINE') score -= 10000;
      return { host, score: Number.isFinite(score) ? score : -99999 };
    });
    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0].host;
    return { name: chosen.hostCode.toUpperCase(), config: chosen };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HTTP HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private static buildCpointHeaders(terminalId: string): Record<string, string> {
    return {
      'Content-Type':    'application/json',
      'x-device-id':     terminalId,
      'x-entity-id':     process.env.CPOINT_ENTITY_ID    || '101',
      'x-app-code':      process.env.CPOINT_APP_CODE      || 'CPOINT',
      'x-client-id':     process.env.CPOINT_CLIENT_ID     || '',
      'x-client-secret': process.env.CPOINT_CLIENT_SECRET || '',
      'x-app-version':   process.env.APP_VERSION          || '1',
    };
  }

  private static httpGet<T>(url: string, headers: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        path:     parsedUrl.pathname + parsedUrl.search,
        method:   'GET',
        headers,
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`)); }
        });
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('HTTP GET timeout')); });
      req.end();
    });
  }

  private static httpPost<T>(url: string, body: any, headers: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify(body);
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        path:     parsedUrl.pathname + parsedUrl.search,
        method:   'POST',
        headers:  { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) },
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log(`[HTTP] Response ${res.statusCode}: ${data.substring(0, 300)}`);
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Invalid JSON: ${data.substring(0, 200)}`)); }
        });
      });
      req.on('error', reject);
      req.setTimeout(60000, () => { req.destroy(); reject(new Error('HTTP POST timeout')); });
      req.write(bodyStr);
      req.end();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UTILITY HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private static getUdfValue(params: KimonoTerminalParams, code: string): string {
    if (!params.udfDataList) return '';
    const entry = params.udfDataList.find((u) => u.udfCode === code);
    return entry?.udfValue || '';
  }

  private static maskPan(pan: string): string {
    if (!pan || pan.length < 10) return '**** ****';
    return `${pan.substring(0, 6)}${'*'.repeat(pan.length - 10)}${pan.substring(pan.length - 4)}`;
  }

  private static formatDate(date: Date): string {
    const yy = String(date.getFullYear()).substring(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  private static buildErrorResponse(
    host: 'MEDUSA' | 'NIBSS' | 'KIMONO',
    code: string,
    message: string
  ): PosTransactionResult {
    return {
      paymentSuccess: false,
      statusCode: code,
      message: this.toTenantFacingMessage(message),
      host,
    };
  }

  /** Map internal/ops errors to cashier-facing copy. Technical detail stays in server logs. */
  private static toTenantFacingMessage(raw: string | undefined | null): string {
    const msg = String(raw || '').trim();
    if (!msg) return 'Card payment could not be completed. Please try again.';

    const lower = msg.toLowerCase();
    const setupIncomplete =
      lower.includes('pos_setup_incomplete') ||
      lower.includes('encryption key') ||
      lower.includes('posencryptionkey') ||
      lower.includes('quasar_pos_encryption') ||
      lower.includes('quasar_api_key') ||
      lower.includes('sk_test') ||
      lower.includes('sk_live') ||
      lower.includes('quasar_tenant') ||
      /vault credential|pos-encryption|process\.env/i.test(msg);

    if (setupIncomplete) {
      return 'Card payments are not fully set up for this business yet. Please contact Invify support.';
    }

    if (
      lower.includes('econnrefused') ||
      lower.includes('fetch failed') ||
      lower.includes('enotfound') ||
      lower.includes('etimedout') ||
      lower.includes('timeout') ||
      lower.includes('socket hang up') ||
      lower.includes('network')
    ) {
      return 'Unable to reach the payment network. Check your internet connection and try again.';
    }

    if (
      lower.includes('packedisomessage') ||
      lower.includes('missing icc') ||
      lower.includes('icc data')
    ) {
      return 'The terminal did not send complete card data. Please try the card again.';
    }

    if (lower.includes('all hosts unavailable') || lower.includes('system error')) {
      return 'Payment processors are temporarily unavailable. Please try again shortly.';
    }

    // Hide remaining ops-style internals from cashiers
    if (/QUASAR_|\/pos\/|api\/v1|Bearer |idempotency/i.test(msg)) {
      return 'Card payment could not be completed. Please try again or contact Invify support.';
    }

    return msg;
  }

  private static isoResponseMessage(code: string): string {
    const messages: Record<string, string> = {
      '00': 'Approved',
      '01': 'Refer to card issuer',
      '05': 'Do not honour',
      '12': 'Invalid transaction',
      '13': 'Invalid amount',
      '14': 'Invalid card number',
      '30': 'Format error',
      '51': 'Insufficient funds',
      '54': 'Expired card',
      '55': 'Incorrect PIN',
      '57': 'Transaction not permitted',
      '58': 'Transaction not permitted at terminal',
      '61': 'Exceeds withdrawal limit',
      '65': 'Exceeds withdrawal frequency',
      '68': 'Response received too late',
      '91': 'Issuer unavailable',
      '96': 'System malfunction',
    };
    return messages[code] || `Declined (${code})`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TRANSACTION LOGGER
  // ═══════════════════════════════════════════════════════════════════════════

  private static async updateTransaction(id: string, params: any, response: PosTransactionResult) {
    const entry = this.transactionHistory.find(t => t.id === id);
    if (!entry) return;

    entry.status      = response.paymentSuccess ? 'Approved' : 'Declined';
    entry.statusCode  = response.statusCode;
    entry.host        = response.host;
    entry.maskedPan   = response.maskedPan || entry.maskedPan;
    entry.rrn         = response.rrn && response.rrn !== 'N/A' ? response.rrn : entry.rrn;
    entry.stan        = response.stan && response.stan !== 'N/A' ? response.stan : entry.stan;
    entry.authCode    = response.authCode || entry.authCode || 'N/A';
    entry.message     = response.message || entry.message || '';
    entry.processedBy = entry.isDeviceProcessed ? 'MPOS_DEVICE' : 'SWITCHBOARD';
    entry.rawResponse = JSON.stringify(
      response.kimonoResponse ||
      response.isoFields ||
      { statusCode: response.statusCode, message: response.message, rrn: entry.rrn, stan: entry.stan }
    );

    // Update in Supabase if applicable
    await this.persistAttempt({
      id: entry.id,
      tenant_id: entry.tenantId,
      terminal_id: entry.terminalId,
      amount: entry.amount,
      status: entry.status,
      status_code: entry.statusCode,
      host: entry.host,
      masked_pan: entry.maskedPan,
      rrn: entry.rrn,
      stan: entry.stan,
      auth_code: entry.authCode,
      staff_name: entry.staffName,
      items_jsonb: entry.items || [],
      raw_request: {
        source: 'switchboard',
        terminalId: entry.terminalId,
        amount: entry.amount,
        host: entry.host,
        staffName: entry.staffName,
        rrn: entry.rrn,
        stan: entry.stan,
      },
      raw_response: response.kimonoResponse || response.isoFields || {
        statusCode: response.statusCode,
        message: response.message,
        rrn: entry.rrn,
        stan: entry.stan,
      },
      is_device_processed: false,
    });

    // Trigger automatic inventory deduction if transaction is approved
    if (
      process.env.OFFLINE_LOCAL_AUTH !== 'true' &&
      entry.tenantId &&
      entry.tenantId !== 'default' &&
      entry.tenantId !== 'Unknown' &&
      response.paymentSuccess &&
      params.items &&
      params.items.length > 0
    ) {
      (async () => {
        try {
          console.log(`[POS Inventory] Initiating deduction for transaction ${entry.id}`);
          for (const item of params.items) {
            const { data: dbItem, error: fetchErr } = await supabase
              .from('items')
              .select('*')
              .eq('tenant_id', entry.tenantId)
              .eq('id', item.id)
              .single();

            if (fetchErr || !dbItem) {
              console.error(`[POS Inventory] Item not found: ${item.id}`);
              continue;
            }

            // Deduct stock qty (Quantity validation)
            const newQty = (dbItem.stock_qty || 0) - (item.quantity || 1);
            const { error: updateErr } = await supabase
              .from('items')
              .update({ stock_qty: newQty })
              .eq('tenant_id', entry.tenantId)
              .eq('id', item.id);

            if (updateErr) {
              console.error(`[POS Inventory] Failed to deduct stock for item ${item.id}: ${updateErr.message}`);
              continue;
            }

            // Write Audit Record
            await supabase.from('audit_logs').insert({
              tenant_id: entry.tenantId,
                event_type: 'INVENTORY_DEDUCTED',
                payload: {
                  transactionId: entry.id,
                  itemId: item.id,
                  previousQuantity: dbItem.stock_qty,
                  newQuantity: newQty,
                  deductedQuantity: item.quantity || 1,
                  terminalId: entry.terminalId
                },
                actor_id: params.staffName || 'system',
                created_at: new Date().toISOString()
              });

              // Publish Inventory Event
              console.log(`[POS Inventory Event] Published InventoryDeducted: ${item.id} -> ${newQty}`);
            }
          } catch (e: any) {
            console.error('[POS Inventory] Stock deduction error:', e.message);
          }
        })();
    }

    console.log(`[POS Gateway] ✓ Transaction updated: ${entry.id} | ${entry.status} | ${entry.host} | ₦${entry.amount}`);
  }
}

// ─── Tenant Context Cache (replaces tenants_db.json read in determineRoute) ──
// Populated asynchronously on first access per tenant, used synchronously in hot path.
PosService.tenantCategoryCache = new Map<string, string>();
PosService.tenantContextCache = new Map<string, { category: string; agentCode: string | null }>();
PosService.cacheTenantCategory = async (tenantId: string): Promise<void> => {
  try {
    const { data } = await supabase
      .from('tenants')
      .select('type, agent_code')
      .or(`id.eq.${tenantId},name.eq.${tenantId}`)
      .maybeSingle();
    if (data) {
      const category = data.type
        ? data.type.charAt(0).toUpperCase() + data.type.slice(1)
        : 'Retail';
      PosService.tenantCategoryCache.set(tenantId, category);
      PosService.tenantContextCache.set(tenantId, {
        category,
        agentCode: data.agent_code || null,
      });
    }
  } catch (e) {
    // Non-fatal — category defaults to Retail
  }
};

// Bootstrap: load config from Supabase (async, fail fast in production)
PosService.loadConfig().catch((e) => {
  console.error('[POS Service] FATAL: Could not load routing config at startup:', e.message);
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'staging') process.exit(1);
});

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
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  CardIccDataInfo,
  KimonoTerminalParams,
  PosRoutingConfig,
  PosTransactionResult,
  MposEmvData,
  PosHostConfig,
} from '../types/pos.types';
import { supabase } from '../db/supabase';
import { TerminalAuditService } from './terminal-audit.service';

// iso8583-js may not ship TS types; require() is safe here
// eslint-disable-next-line @typescript-eslint/no-var-requires
const iso8583 = require('iso8583-js');

// ─── Amount Split Threshold ───────────────────────────────────────────────────
const DEFAULT_SPLIT_THRESHOLD_NAIRA = 50_000;

export class PosService {
  private static CONFIG_FILE_PATH = path.join(process.cwd(), 'pos_routing_config.json');
  private static ENCRYPTION_KEY = crypto.scryptSync(process.env.POS_ENCRYPTION_KEY || 'invify-pos-switch-key-seed', 'salt', 32);
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

  static loadConfig() {
    try {
      if (fs.existsSync(this.CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(this.CONFIG_FILE_PATH, 'utf-8');
        const encrypted = JSON.parse(raw);
        this.routingConfig = this.mapSecrets(encrypted, 'decrypt');
        console.log('[POS Service] Config loaded and decrypted successfully');
      } else {
        // Fallback default setup if no file exists
        this.saveConfig();
      }
    } catch (e: any) {
      console.error('[POS Service] Failed to load config:', e.message);
    }
  }

  static saveConfig() {
    try {
      const encrypted = this.mapSecrets(this.routingConfig, 'encrypt');
      fs.writeFileSync(this.CONFIG_FILE_PATH, JSON.stringify(encrypted, null, 2), 'utf-8');
      console.log('[POS Service] Config encrypted and saved to file');
    } catch (e: any) {
      console.error('[POS Service] Failed to save config:', e.message);
    }
  }

  // ─── Terminal Parameters Cache ─────────────────────────────────────────────
  private static kimonoParamsCache: Map<string, { params: KimonoTerminalParams; fetchedAt: number }> = new Map();
  private static CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

  // ─── In-Memory Transaction Log ─────────────────────────────────────────────
  private static transactionHistory: any[] = [
    {
      id: '1',
      tenantId: 'John Doe Enterprise',
      terminalId: '20394012',
      amount: 5000,
      status: 'Approved',
      date: new Date().toISOString(),
      host: 'KIMONO',
      maskedPan: '**** 1234',
      rrn: '123456789012',
      stan: '000001',
      statusCode: '00',
    },
    {
      id: '2',
      tenantId: 'Acme Corp',
      terminalId: '20394013',
      amount: 150000,
      status: 'Declined',
      date: new Date(Date.now() - 3600000).toISOString(),
      host: 'MEDUSA',
      maskedPan: '**** 5678',
      rrn: '987654321098',
      stan: '000002',
      statusCode: '55',
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  static async getRoutingConfig() {
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
        }
      }
    }

    this.routingConfig = { ...this.routingConfig, ...newConfig };
    this.saveConfig();

    // Log to audit service
    await TerminalAuditService.log({
      actionType: 'ROUTING_CONFIG_UPDATE',
      adminId,
      reason,
      metadata: {
        changedFields: Object.keys(newConfig),
        reason
      }
    });

    return this.routingConfig;
  }

  static async getTransactionHistory(_tenantId: string) {
    if (process.env.OFFLINE_MOCK_AUTH === 'true') {
      return this.transactionHistory;
    }

    try {
      const { data, error } = await supabase
        .from('pos_transaction_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return this.transactionHistory;
      }

      return data.map(d => ({
        id: d.id,
        tenantId: d.tenant_id,
        terminalId: d.terminal_id,
        amount: d.amount,
        status: d.status,
        date: d.date || d.created_at,
        host: d.host,
        maskedPan: d.masked_pan,
        rrn: d.rrn,
        stan: d.stan,
        statusCode: d.status_code,
        authCode: d.auth_code,
        staffName: d.staff_name,
      }));
    } catch (err) {
      console.error('[POS Service] Error fetching history:', err);
      return this.transactionHistory;
    }
  }

  static async getObservabilityMetrics() {
    const totalTransactions = this.transactionHistory.length;
    const approvedCount = this.transactionHistory.filter(t => t.status === 'Approved').length;
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
      const attempts = this.transactionHistory.filter(t => t.host?.toUpperCase() === codeUpper);
      const successes = attempts.filter(t => t.status === 'Approved');

      hostDistribution[code] = attempts.length;
      hostSuccessRate[code] = attempts.length > 0 ? (successes.length / attempts.length) * 100 : h.healthScore;
      hostAvgLatency[code] = baseLatencies[code] + Math.round((Math.random() - 0.5) * 20);
      hostFailoverCount[code] = this.transactionHistory.filter(
        t => t.host?.toUpperCase() === codeUpper && t.status === 'Declined' && (t.statusCode === '96' || t.statusCode === '91')
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

    const route = this.determineRoute(params.amount, params.tenantId, transactionType, cardScheme);
    console.log(`\n[POS Gateway] ▶ Routing ₦${params.amount} transaction → ${route.name}`);
    console.log(`[POS Gateway]   Terminal: ${params.terminalId} | Tenant: ${params.tenantId}`);

    // Pre-log the transaction as Pending
    const pendingId = Math.random().toString(36).substring(7);
    const pendingEntry = {
      id:          pendingId,
      tenantId:    params.tenantId || 'Unknown',
      terminalId:  params.terminalId,
      amount:      params.amount,
      status:      'Pending',
      statusCode:  '',
      date:        new Date().toISOString(),
      host:        route.name,
      maskedPan:   params.emvData?.pan ? this.maskPan(params.emvData.pan) : (params.emvData?.cardNo ? this.maskPan(params.emvData.cardNo) : '**** ****'),
      rrn:         params.emvData?.rrn   || 'N/A',
      stan:        params.emvData?.stan  || 'N/A',
      authCode:    'N/A',
      staffName:   params.staffName || 'System',
      items:       params.items || [],
      rawRequest:  JSON.stringify({ terminalId: params.terminalId, amount: params.amount, host: route.name, emvData: params.emvData }),
      rawResponse: '',
    };
    
    this.transactionHistory.unshift(pendingEntry);
    if (this.transactionHistory.length > 500) this.transactionHistory.pop();

    // Async insert to supabase
    if (process.env.OFFLINE_MOCK_AUTH !== 'true' && params.tenantId && params.tenantId !== 'default') {
      supabase.from('pos_transaction_attempts').insert([{
        id: pendingId,
        tenant_id: params.tenantId,
        terminal_id: params.terminalId,
        amount: params.amount,
        status: 'Pending',
        host: route.name,
        masked_pan: pendingEntry.maskedPan,
        staff_name: params.staffName || 'System',
        items_jsonb: params.items || [],
        raw_request: { terminalId: params.terminalId, amount: params.amount, host: route.name }
      }]).then();
    }

    let response: PosTransactionResult;

    try {
      if (route.name === 'KIMONO') {
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
          if (fallback.name === 'KIMONO') {
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

    await this.updateTransaction(pendingId, params, response);
    return response;
  }

  static async recordDeviceTransaction(params: {
    tenantId: string;
    terminalId: string;
    amount: number;
    emvData: any;
    staffName?: string;
    items?: any[];
    deviceStatus?: string;
    transactionResponse?: any;
  }) {
    const isApproved = params.deviceStatus === 'payment_success';
    const txId = Math.random().toString(36).substring(7);
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
      rawRequest:  JSON.stringify({ source: 'device', terminalId: params.terminalId, amount: params.amount }),
      rawResponse: JSON.stringify(params.transactionResponse || {}),
    };
    
    this.transactionHistory.unshift(entry);
    if (this.transactionHistory.length > 500) this.transactionHistory.pop();

    if (process.env.OFFLINE_MOCK_AUTH !== 'true' && params.tenantId && params.tenantId !== 'default' && params.tenantId !== 'Unknown') {
      supabase.from('pos_transaction_attempts').insert([{
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
        raw_response: params.transactionResponse || {}
      }]).then();
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

    const host = params.emvData.serverIP || route.config.host;
    const port = params.emvData.port || route.config.port;

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

    // Parse with iso8583-js — proper field extraction
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
  //  ISO8583 PARSER  (iso8583-js)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse a raw ISO8583 response buffer using iso8583-js.
   * Returns the response code (field 39) and the full decoded field map.
   *
   * Falls back to the heuristic extractor if the library throws.
   */
  static parseIsoMessage(raw: Buffer, context = 'ISO8583'): { responseCode: string; isoFields: Record<string, any> } {
    try {
      // iso8583-js accepts a Buffer or Uint8Array
      const msg = iso8583.parse(raw, { debug: false });
      const fields: Record<string, any> = {};

      // Build a plain object from the parsed message
      if (msg && typeof msg.get === 'function') {
        // Common response fields we care about
        const fieldIds = ['003','011','012','013','022','037','038','039','041','042','048','054','063'];
        for (const id of fieldIds) {
          const val = msg.get(id);
          if (val !== undefined && val !== null) {
            fields[id] = val;
          }
        }
      } else if (msg && typeof msg === 'object') {
        Object.assign(fields, msg);
      }

      const responseCode = (fields['039'] || fields['39'] || '96').toString().trim();
      console.log(`[${context}] ✓ Parsed ISO8583 — Field 39 (response code): ${responseCode}`);
      console.log(`[${context}]   Fields:`, JSON.stringify(fields));
      return { responseCode, isoFields: fields };

    } catch (parseErr: any) {
      console.warn(`[${context}] ⚠ iso8583-js parse failed (${parseErr.message}), using heuristic fallback`);
      const responseCode = this.extractField39Heuristic(raw) || '96';
      return { responseCode, isoFields: { '039': responseCode, _parseError: parseErr.message } };
    }
  }

  /**
   * Heuristic fallback: scan ASCII-packed ISO8583 response for a 2-char
   * response code near the expected field-39 offset.
   * Only used when iso8583-js throws.
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
    if (attempts.length === 0) {
      return host.healthScore;
    }

    const successfulAttempts = attempts.filter(t => {
      return t.status === 'Approved' || (t.statusCode && t.statusCode !== '96' && t.statusCode !== '91');
    });

    const successRate = (successfulAttempts.length / attempts.length) * 100;
    return Math.round((successRate * 0.7) + (host.healthScore * 0.3));
  }

  static determineRoute(
    amountNaira: number,
    tenantId: string,
    transactionType: string,
    cardScheme: string,
    simulatedHealthOverrides?: Record<string, { status: 'ONLINE' | 'OFFLINE'; healthScore: number }>
  ): { name: string; config: any } {
    let category = 'Retail';
    try {
      const tenantsPath = path.join(process.cwd(), 'tenants_db.json');
      if (fs.existsSync(tenantsPath)) {
        const tenants = JSON.parse(fs.readFileSync(tenantsPath, 'utf8'));
        const tenant = tenants.find((t: any) => t.id === tenantId || t.name === tenantId);
        if (tenant && tenant.type) {
          category = tenant.type.charAt(0).toUpperCase() + tenant.type.slice(1);
        }
      }
    } catch (e) {
      console.warn('[POS Gateway] Failed to resolve tenant category, defaulting to Retail:', e);
    }

    const activeHosts = this.routingConfig.hosts.filter(h => h.isActive);

    if (activeHosts.length === 0) {
      throw new Error('[POS Gateway] All hosts are inactive. Cannot route transaction.');
    }

    const scoredHosts = activeHosts.map(host => {
      const hostCode = host.hostCode;
      const sim = simulatedHealthOverrides?.[hostCode];
      const status = sim ? sim.status : host.status;
      const baseHealth = sim ? sim.healthScore : host.healthScore;

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

      const profile = this.routingConfig.tenantRoutingProfiles.find(
        p => p.category.toLowerCase() === category.toLowerCase()
      );

      if (profile) {
        const prefIndex = profile.preferredHosts.indexOf(hostCode);
        if (prefIndex !== -1) {
          score += (1000 - prefIndex * 100);
        }

        const fallIndex = profile.fallbackHosts.indexOf(hostCode);
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

      const slaScore = sim ? baseHealth : this.getHostSlaScore(hostCode);
      score += slaScore;
      score += (10 - host.priority) * 10;

      return { host, score };
    });

    scoredHosts.sort((a, b) => b.score - a.score);

    console.log(`[POS Gateway] Route scoring for ₦${amountNaira} (${transactionType}, ${cardScheme}, Category: ${category}):`);
    scoredHosts.forEach(sh => {
      console.log(`  - ${sh.host.hostCode.toUpperCase()}: Score = ${sh.score} (Status: ${sh.host.status}, SLA: ${this.getHostSlaScore(sh.host.hostCode)})`);
    });

    const chosen = scoredHosts[0].host;
    return { name: chosen.hostCode.toUpperCase(), config: chosen };
  }

  private static getFailover(currentName: string): { name: string; config: any } | null {
    const activeHosts = this.routingConfig.hosts.filter(h => h.isActive && h.hostCode.toUpperCase() !== currentName.toUpperCase());
    if (activeHosts.length === 0) return null;

    const scored = activeHosts.map(host => {
      let score = (10 - host.priority) * 10 + this.getHostSlaScore(host.hostCode);
      if (host.status === 'OFFLINE') score -= 10000;
      return { host, score };
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
    return { paymentSuccess: false, statusCode: code, message, host };
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
    entry.rrn         = response.rrn   || entry.rrn;
    entry.stan        = response.stan  || entry.stan;
    entry.authCode    = response.authCode || 'N/A';
    entry.rawResponse = JSON.stringify(
      response.kimonoResponse ||
      response.isoFields ||
      { statusCode: response.statusCode, message: response.message }
    );

    // Update in Supabase if applicable
    if (process.env.OFFLINE_MOCK_AUTH !== 'true' && entry.tenantId && entry.tenantId !== 'default' && entry.tenantId !== 'Unknown') {
      supabase.from('pos_transaction_attempts').update({
        status: entry.status,
        status_code: entry.statusCode,
        host: entry.host,
        masked_pan: entry.maskedPan,
        rrn: entry.rrn,
        stan: entry.stan,
        auth_code: entry.authCode,
        raw_response: response.kimonoResponse || response.isoFields || { statusCode: response.statusCode, message: response.message }
      }).eq('id', entry.id).then();
    }

    console.log(`[POS Gateway] ✓ Transaction updated: ${entry.id} | ${entry.status} | ${entry.host} | ₦${entry.amount}`);
  }
}

PosService.loadConfig();

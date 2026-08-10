// test/pos.service.test.ts
// Unit tests for PosService — Kimono, Medusa, failover, and routing logic.
// Run with: npm test

import { PosService } from '../src/services/pos.service';
import type { MposEmvData } from '../src/types/pos.types';
import { packPosMessage } from '../src/services/iso/pos-packager';

// ─── Shared EMV fixture matching com.demo.mposaisino EmvDetailResult ─────────
const EMV_FIXTURE: MposEmvData = {
  pan:                          '5366132277281612',
  track2Data:                   '5366132277281612D2812221012908360F',
  cardExpirationDate:           '2812',
  cardSequenceNumber:           '01',
  cardHolderName:               'ADEBAYO/KAZEEM/ARAMIDE',
  applicationLabel:             'Debit Mastercard',
  aid:                          'A0000000041010',
  serviceCode:                  '221',
  acquirerInstitutionId:        '536613',
  terminalId:                   '2CU1F5JG',
  appCryptogram:                'C9D04E12B7F3DAC8',
  cryptogramInformationData:    '40',
  issuerApplicationData:        '0110600003220000000000000000000000FF',
  unpredictableNumber:          '3EEE7872',
  appTransactionCounter:        '00FD',
  terminalVerificationResults:  '0480008800',
  transactionDate:              '260525',
  transactionType:              '00',
  amountAuthorisedNumeric:      '000000012000',   // ₦120 in kobo
  transactionCurrencyCode:      '0566',
  applicationInterchangeProfile:'3900',
  terminalCountryCode:          '0566',
  amountOtherNumeric:           '000000000000',
  dedicatedFileName:            'A0000000041010',
  pinBlock:                     'D1A0E33AF8B5070E',
  ksn:                          '',
  pinType:                      'Dukpt',
  pointOfServiceEntryMode:      '0221',
  rrn:                          '123456789012',
  stan:                         '000001',
  iccData: '9F2608C9D04E12B7F3DAC89F2701409F10120110600003220000000000000000000000FF9F37043EEE78729F360200FD950504800088009A032605259C01009F02060000000121005F2A020566820239009F1A0205669F03060000000000005F3401018407A0000000041010',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockHttpPost(response: object) {
  const mod = require('https');
  const EventEmitter = require('events');

  jest.spyOn(mod, 'request').mockImplementation((_opts: any, cb: any) => {
    const res = new EventEmitter();
    (res as any).statusCode = 200;
    setTimeout(() => {
      res.emit('data', JSON.stringify(response));
      res.emit('end');
    }, 10);
    cb(res);
    return { on: jest.fn(), setTimeout: jest.fn(), write: jest.fn(), end: jest.fn() };
  });
}

function mockHttpGet(response: object) {
  const mod = require('https');
  const EventEmitter = require('events');

  jest.spyOn(mod, 'request').mockImplementation((_opts: any, cb: any) => {
    const res = new EventEmitter();
    (res as any).statusCode = 200;
    setTimeout(() => {
      res.emit('data', JSON.stringify(response));
      res.emit('end');
    }, 10);
    cb(res);
    return { on: jest.fn(), setTimeout: jest.fn(), end: jest.fn() };
  });
}

function setupMockHosts() {
  PosService.routingConfig.hosts = [
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
      supportedCardSchemes: [],
      supportedTerminalTypes: [],
      supportedTenantCategories: [],
      supportedTransactionTypes: [],
      isActive: true,
      thresholdMin: 0,
      thresholdMax: 999999999
    },
    {
      hostName: 'Kimono',
      hostCode: 'kimono',
      ip: '127.0.0.1',
      port: 443,
      sslEnabled: true,
      sslCertMetadata: null,
      timeoutSeconds: 3600,
      priority: 2,
      failoverPriority: 2,
      healthScore: 100,
      status: 'ONLINE',
      supportedCardSchemes: [],
      supportedTerminalTypes: [],
      supportedTenantCategories: [],
      supportedTransactionTypes: [],
      isActive: true,
      thresholdMin: 0,
      thresholdMax: 999999999,
      baseUrl: 'https://kimono-api.invify.app',
      paramsPath: '/getkimonoparams',
      transactionPath: '/postcashposwithdrawalkim'
    },
    {
      hostName: 'Medusa',
      hostCode: 'medusa',
      ip: '127.0.0.1',
      port: 8080,
      sslEnabled: false,
      sslCertMetadata: null,
      timeoutSeconds: 3600,
      priority: 3,
      failoverPriority: 3,
      healthScore: 100,
      status: 'ONLINE',
      supportedCardSchemes: [],
      supportedTerminalTypes: [],
      supportedTenantCategories: [],
      supportedTransactionTypes: [],
      isActive: true,
      thresholdMin: 0,
      thresholdMax: 999999999
    },
    {
      hostName: 'NIBSS',
      hostCode: 'nibss',
      ip: '127.0.0.1',
      port: 5000,
      sslEnabled: true,
      sslCertMetadata: null,
      timeoutSeconds: 3600,
      priority: 4,
      failoverPriority: 4,
      healthScore: 100,
      status: 'ONLINE',
      supportedCardSchemes: [],
      supportedTerminalTypes: [],
      supportedTenantCategories: [],
      supportedTransactionTypes: [],
      isActive: false,
      thresholdMin: 0,
      thresholdMax: 999999999
    }
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. ROUTING LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

describe('PosService — Routing Logic', () => {

  beforeEach(() => {
    // Reset to default (Kimono as default host)
    setupMockHosts();
    PosService.routingConfig.activeHost = 'kimono';
    PosService.routingConfig.tenantRoutingProfiles = [
      {
        category: 'Retail',
        preferredHosts: ['kimono'],
        fallbackHosts: ['medusa', 'express_pay']
      }
    ];
    PosService.routingConfig.thresholdRulesMatrix = [];
  });

  it('should route ALL amounts to Kimono when toggle is ON (activeHost=kimono)', () => {
    const route = (PosService as any).determineRoute(10000); // ₦10,000 (below split)
    expect(route.name).toBe('KIMONO');
  });

  it('should route amounts < ₦50,000 to Medusa when toggle is OFF', () => {
    PosService.routingConfig.activeHost = 'medusa';
    PosService.routingConfig.tenantRoutingProfiles = [];
    PosService.routingConfig.thresholdRulesMatrix = [
      { minAmount: 0, maxAmount: 49999, preferredHost: 'medusa' },
      { minAmount: 50000, maxAmount: 999999999, preferredHost: 'kimono' }
    ];
    const route = (PosService as any).determineRoute(30000); // ₦30,000
    expect(route.name).toBe('MEDUSA');
  });

  it('should route amounts ≥ ₦50,000 to Kimono even when toggle is OFF', () => {
    PosService.routingConfig.activeHost = 'medusa';
    PosService.routingConfig.tenantRoutingProfiles = [];
    PosService.routingConfig.thresholdRulesMatrix = [
      { minAmount: 0, maxAmount: 49999, preferredHost: 'medusa' },
      { minAmount: 50000, maxAmount: 999999999, preferredHost: 'kimono' }
    ];
    const route = (PosService as any).determineRoute(50000); // exactly ₦50,000
    expect(route.name).toBe('KIMONO');
  });

  it('should route amounts > ₦50,000 to Kimono even when toggle is OFF', () => {
    PosService.routingConfig.activeHost = 'medusa';
    PosService.routingConfig.tenantRoutingProfiles = [];
    PosService.routingConfig.thresholdRulesMatrix = [
      { minAmount: 0, maxAmount: 49999, preferredHost: 'medusa' },
      { minAmount: 50000, maxAmount: 999999999, preferredHost: 'kimono' }
    ];
    const route = (PosService as any).determineRoute(100000); // ₦100,000
    expect(route.name).toBe('KIMONO');
  });

  it('should failover to Medusa when preferred Kimono host is inactive', () => {
    PosService.routingConfig.tenantRoutingProfiles = [
      {
        category: 'Retail',
        preferredHosts: ['kimono', 'medusa'],
        fallbackHosts: ['express_pay']
      }
    ];
    PosService.routingConfig.thresholdRulesMatrix = [];
    const kimonoHost = PosService.routingConfig.hosts.find(h => h.hostCode === 'kimono');
    if (kimonoHost) kimonoHost.isActive = false;
    const route = (PosService as any).determineRoute(50000);
    expect(route.name).toBe('MEDUSA');
  });

  it('should throw when all hosts are inactive', () => {
    for (const h of PosService.routingConfig.hosts) {
      h.isActive = false;
    }
    expect(() => (PosService as any).determineRoute(5000)).toThrow('All hosts are inactive');
  });

  it('should prefer Tenant-scoped profile over Category profile', () => {
    const nibss = PosService.routingConfig.hosts.find(h => h.hostCode === 'nibss');
    if (nibss) nibss.isActive = true;
    PosService.routingConfig.tenantRoutingProfiles = [
      {
        scopeType: 'Category',
        targetValue: 'Retail',
        category: 'Retail',
        preferredHosts: ['kimono'],
        fallbackHosts: ['medusa'],
      },
      {
        scopeType: 'Tenant',
        targetValue: 'tenant-abc',
        category: 'Retail',
        preferredHosts: ['nibss'],
        fallbackHosts: ['express_pay'],
      },
    ];
    PosService.tenantContextCache.set('tenant-abc', { category: 'Retail', agentCode: null });
    const route = PosService.determineRoute(10000, 'tenant-abc', 'PURCHASE', 'VISA');
    expect(route.name).toBe('NIBSS');
  });

  it('should match Group-scoped profile via terminalGroup context', () => {
    const express = PosService.routingConfig.hosts.find(h => h.hostCode === 'express_pay');
    if (express) {
      express.isActive = true;
      express.terminalGroup = 'Default';
    }
    PosService.routingConfig.tenantRoutingProfiles = [
      {
        scopeType: 'Group',
        targetValue: 'Default',
        category: 'Retail',
        preferredHosts: ['express_pay'],
        fallbackHosts: ['nibss'],
      },
    ];
    const route = PosService.determineRoute(
      10000,
      'tenant-xyz',
      'PURCHASE',
      'VISA',
      undefined,
      { category: 'Retail', terminalGroup: 'Default' }
    );
    expect(route.name).toBe('EXPRESS_PAY');
  });

  it('should apply per-profile amountThresholds when profile matches', () => {
    const nibss = PosService.routingConfig.hosts.find(h => h.hostCode === 'nibss');
    if (nibss) nibss.isActive = true;
    PosService.routingConfig.tenantRoutingProfiles = [
      {
        scopeType: 'Category',
        targetValue: 'Retail',
        category: 'Retail',
        preferredHosts: [],
        fallbackHosts: [],
        amountThresholds: [{ min: 0, max: 20000, host: 'nibss' }],
      },
    ];
    const route = PosService.determineRoute(
      10000,
      'Retail',
      'PURCHASE',
      'VISA',
      undefined,
      { category: 'Retail' }
    );
    expect(route.name).toBe('NIBSS');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  2. ISO8583 PARSER
// ═══════════════════════════════════════════════════════════════════════════════

describe('PosService — parseIsoMessage', () => {

  it('should extract field 39 response code "00" from PosPackager buffer', () => {
    const packed = packPosMessage({
      0: '0210',
      11: '000001',
      37: '123456789012',
      39: '00',
      41: '204435SA',
    });
    const result = PosService.parseIsoMessage(packed, 'TEST');
    expect(result.responseCode).toBe('00');
    expect(result.isoFields['39']).toBe('00');
  });

  it('should return isoFields with RRN and STAN', () => {
    const packed = packPosMessage({
      0: '0210',
      11: '000001',
      37: '123456789012',
      39: '00',
    });
    const result = PosService.parseIsoMessage(packed, 'TEST');
    expect(result.isoFields['37']).toBe('123456789012');
    expect(result.isoFields['11']).toBe('000001');
  });

  it('should fall back to heuristic when PosPackager unpack fails', () => {
    // Build a buffer where "00" appears at position 20 (not a valid PosPackager body)
    const buf = Buffer.alloc(30, 0x20); // spaces
    buf.write('00', 20, 'ascii');
    const result = PosService.parseIsoMessage(buf, 'FALLBACK');
    expect(result.isoFields['_parseError']).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  3. KIMONO FLOW (HTTPS)
// ═══════════════════════════════════════════════════════════════════════════════

describe('PosService — Kimono HTTPS flow', () => {

  beforeEach(() => {
    setupMockHosts();
    PosService.routingConfig.activeHost = 'kimono';
    PosService.routingConfig.tenantRoutingProfiles = [
      {
        category: 'Retail',
        preferredHosts: ['kimono'],
        fallbackHosts: ['medusa', 'express_pay']
      }
    ];
    PosService.routingConfig.thresholdRulesMatrix = [];
    const kimonoHost = PosService.routingConfig.hosts.find(h => h.hostCode === 'kimono');
    if (kimonoHost) kimonoHost.isActive = true;
    PosService.clearKimonoParamsCache();
    jest.restoreAllMocks();
  });

  it('should return paymentSuccess=true for approved Kimono response', async () => {
    // Mock GET (getkimonoparams) then POST (postcashposwithdrawalkim)
    const https = require('https');
    const EventEmitter = require('events');

    const kimonoParams = {
      code: '00',
      terminalId: 'TID00001',
      merchantId: 'MID000000000001',
      uniqueId: 'UID001',
      institutionId: '636088',
      settlementAccount: '0000000001',
      ipek: 'AABBCC',
      ksn: '000000000000',
      keyLabel: '000002',
      token: 'TOKEN123',
      tmk: '',
      tpk: '',
      extendedTransactionType: '6104',
      currencyCode: '566',
      posDataCode: '510101511344101',
      udfDataList: [
        { udfCode: 'ISW_TERMINAL_ID', udfValue: 'TID00001' },
        { udfCode: 'ISW_MERCHANT_ID', udfValue: 'MID000000000001' },
        { udfCode: 'ISW_KEY_LABEL',   udfValue: '000002' },
        { udfCode: 'ISW_UNIQUE_ID',   udfValue: 'UID001' },
        { udfCode: 'ISW_INSTITUTION_ID', udfValue: '636088' },
        { udfCode: 'ISW_SETTLEMENT_ACCOUNT', udfValue: '0000000001' },
      ],
    };
    const kimonoTxnResponse = { code: '00', desc: 'Approved', rrn: '123456789012', stan: '000001', authCode: 'AUTH01' };

    let callCount = 0;
    jest.spyOn(https, 'request').mockImplementation((_opts: any, cb: any) => {
      const res = new EventEmitter();
      (res as any).statusCode = 200;
      const data = callCount === 0 ? kimonoParams : kimonoTxnResponse;
      callCount++;
      setTimeout(() => { res.emit('data', JSON.stringify(data)); res.emit('end'); }, 5);
      cb(res);
      return { on: jest.fn(), setTimeout: jest.fn(), write: jest.fn(), end: jest.fn() };
    });

    const result = await PosService.processTransaction({
      tenantId: 'test-tenant',
      terminalId: '2CU1F5JG',
      amount: 120,
      emvData: EMV_FIXTURE,
    });

    expect(result.paymentSuccess).toBe(true);
    expect(result.statusCode).toBe('00');
    expect(result.host).toBe('KIMONO');
    expect(result.authCode).toBe('AUTH01');
  });

  it('should return paymentSuccess=false for declined Kimono response (code 51)', async () => {
    const https = require('https');
    const EventEmitter = require('events');
    const kimonoParams = { code: '00', terminalId: 'TID00001', merchantId: 'MID', uniqueId: 'UID', institutionId: '636088', settlementAccount: '000', ipek: '', ksn: '', keyLabel: '', token: '', tmk: '', tpk: '', extendedTransactionType: '6104', currencyCode: '566', posDataCode: '', udfDataList: [] };
    const declinedResp = { code: '51', desc: 'Insufficient funds' };
    let callCount = 0;
    jest.spyOn(https, 'request').mockImplementation((_opts: any, cb: any) => {
      const res = new EventEmitter();
      (res as any).statusCode = 200;
      const data = callCount === 0 ? kimonoParams : declinedResp;
      callCount++;
      setTimeout(() => { res.emit('data', JSON.stringify(data)); res.emit('end'); }, 5);
      cb(res);
      return { on: jest.fn(), setTimeout: jest.fn(), write: jest.fn(), end: jest.fn() };
    });

    const result = await PosService.processTransaction({
      tenantId: 'test-tenant',
      terminalId: '2CU1F5JG',
      amount: 120,
      emvData: EMV_FIXTURE,
    });

    expect(result.paymentSuccess).toBe(false);
    expect(result.statusCode).toBe('51');
    expect(result.host).toBe('KIMONO');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  4. AUTO-FAILOVER: Kimono → Medusa
// ═══════════════════════════════════════════════════════════════════════════════

describe('PosService — Auto-failover (Kimono → Medusa)', () => {

  beforeEach(() => {
    setupMockHosts();
    PosService.routingConfig.activeHost = 'kimono';
    PosService.routingConfig.tenantRoutingProfiles = [
      {
        category: 'Retail',
        preferredHosts: ['kimono', 'medusa'],
        fallbackHosts: ['express_pay']
      }
    ];
    PosService.routingConfig.thresholdRulesMatrix = [];
    const kimonoHost = PosService.routingConfig.hosts.find(h => h.hostCode === 'kimono');
    if (kimonoHost) kimonoHost.isActive = true;
    const medusaHost = PosService.routingConfig.hosts.find(h => h.hostCode === 'medusa');
    if (medusaHost) medusaHost.isActive = true;
    const expressPayHost = PosService.routingConfig.hosts.find(h => h.hostCode === 'express_pay');
    if (expressPayHost) expressPayHost.isActive = false;
    PosService.clearKimonoParamsCache();
    jest.restoreAllMocks();
  });

  it('should fall back to Medusa TCP when Kimono HTTPS throws', async () => {
    // Make Kimono HTTPS fail
    const https = require('https');
    jest.spyOn(https, 'request').mockImplementation((_opts: any, _cb: any) => {
      const req = {
        on: (event: string, handler: any) => {
          if (event === 'error') setTimeout(() => handler(new Error('Kimono connection refused')), 5);
          return req;
        },
        setTimeout: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
      return req;
    });

    // Mock the private tcpExchange method to return a valid ISO response buffer
    // (2-byte length header + 4-char MTI + field 39 = "00" at offset 20)
    const fakeResponse = Buffer.alloc(30, 0x20); // 30 spaces
    fakeResponse.write('00', 20, 'ascii');        // plant response code "00" at pos 20
    jest.spyOn(PosService as any, 'tcpExchange').mockResolvedValue(fakeResponse);

    const emvWithIso: MposEmvData = { ...EMV_FIXTURE, packedIsoMessage: '30323130' };

    const result = await PosService.processTransaction({
      tenantId: 'test-tenant',
      terminalId: '2CU1F5JG',
      amount: 120,
      emvData: emvWithIso,
    });

    // Should have fallen back to Medusa
    expect(result.host).toBe('MEDUSA');
    expect(result).toHaveProperty('paymentSuccess');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  5. PAYLOAD BUILDER — mPOS field mapping
// ═══════════════════════════════════════════════════════════════════════════════

describe('PosService — buildKimonoPayload field mapping', () => {

  const dummyParams = {
    code: '00',
    terminalId: 'TID00001',
    merchantId: 'MID000000000001',
    uniqueId:   'UID001',
    institutionId: '636088',
    settlementAccount: '0000000001',
    ipek: '',
    ksn: '',
    keyLabel: '000002',
    token: '',
    tmk: '',
    tpk: '',
    extendedTransactionType: '6104',
    currencyCode: '566',
    posDataCode: '510101511344101',
    udfDataList: [
      { udfCode: 'ISW_TERMINAL_ID', udfValue: 'TID00001' },
      { udfCode: 'ISW_MERCHANT_ID', udfValue: 'MID000000000001' },
      { udfCode: 'ISW_KEY_LABEL',   udfValue: '000002' },
      { udfCode: 'ISW_UNIQUE_ID',   udfValue: 'UID001' },
      { udfCode: 'ISW_INSTITUTION_ID', udfValue: '636088' },
      { udfCode: 'ISW_SETTLEMENT_ACCOUNT', udfValue: '0000000001' },
    ],
  };

  it('should map PAN from emvData.pan', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams, EMV_FIXTURE.pan || '');
    expect(payload.pan).toBe('5366132277281612');
  });

  it('should map track2Data correctly', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams, EMV_FIXTURE.pan || '');
    expect(payload.track2Data).toBe('5366132277281612D2812221012908360F');
  });

  it('should split expiry into year and month', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams, EMV_FIXTURE.pan || '');
    expect(payload.expiryYear).toBe('28');
    expect(payload.expiryMonth).toBe('12');
  });

  it('should set minorAmount from amountAuthorisedNumeric stripped of leading zeros', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams, EMV_FIXTURE.pan || '');
    // "000000012000" → "12000"
    expect(payload.minorAmount).toBe('12000');
  });

  it('should set cryptogram (tag 9F26) from appCryptogram', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams, EMV_FIXTURE.pan || '');
    expect(payload.cryptogram).toBe('C9D04E12B7F3DAC8');
  });

  it('should set pinBlock from emvData.pinBlock', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams, EMV_FIXTURE.pan || '');
    expect(payload.pinBlock).toBe('D1A0E33AF8B5070E');
  });

  it('should set terminalId from ISW_TERMINAL_ID udf', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams, EMV_FIXTURE.pan || '');
    expect(payload.terminalId).toBe('TID00001');
  });
});

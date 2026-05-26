// test/pos.service.test.ts
// Unit tests for PosService — Kimono, Medusa, failover, and routing logic.
// Run with: npm test

import { PosService } from '../src/services/pos.service';
import type { MposEmvData } from '../src/types/pos.types';

// ─── Mock iso8583-js ──────────────────────────────────────────────────────────
jest.mock('iso8583-js', () => ({
  parse: (buf: Buffer) => {
    // Simulate a parsed message object where field 39 is "00"
    const fields: Record<string, string> = {
      '039': '00',
      '037': '123456789012',
      '011': '000001',
      '038': 'AUTH01',
    };
    return {
      get: (id: string) => fields[id] ?? null,
    };
  },
}));

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

// ═══════════════════════════════════════════════════════════════════════════════
//  1. ROUTING LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

describe('PosService — Routing Logic', () => {

  beforeEach(() => {
    // Reset to default (Kimono as default host)
    PosService.routingConfig = {
      ...PosService.routingConfig,
      activeHost: 'kimono',
      kimono: { ...PosService.routingConfig.kimono, isActive: true },
      medusa: { ...PosService.routingConfig.medusa, isActive: true },
      nibss: { ...PosService.routingConfig.nibss, isActive: false },
    };
  });

  it('should route ALL amounts to Kimono when toggle is ON (activeHost=kimono)', () => {
    const route = (PosService as any).determineRoute(10000); // ₦10,000 (below split)
    expect(route.name).toBe('KIMONO');
  });

  it('should route amounts < ₦50,000 to Medusa when toggle is OFF', () => {
    PosService.routingConfig.activeHost = 'medusa';
    const route = (PosService as any).determineRoute(30000); // ₦30,000
    expect(route.name).toBe('MEDUSA');
  });

  it('should route amounts ≥ ₦50,000 to Kimono even when toggle is OFF', () => {
    PosService.routingConfig.activeHost = 'medusa';
    const route = (PosService as any).determineRoute(50000); // exactly ₦50,000
    expect(route.name).toBe('KIMONO');
  });

  it('should route amounts > ₦50,000 to Kimono even when toggle is OFF', () => {
    PosService.routingConfig.activeHost = 'medusa';
    const route = (PosService as any).determineRoute(100000); // ₦100,000
    expect(route.name).toBe('KIMONO');
  });

  it('should failover to Medusa when preferred Kimono host is inactive', () => {
    PosService.routingConfig.kimono = { ...PosService.routingConfig.kimono, isActive: false };
    const route = (PosService as any).determineRoute(50000);
    expect(route.name).toBe('MEDUSA');
  });

  it('should throw when all hosts are inactive', () => {
    PosService.routingConfig.kimono = { ...PosService.routingConfig.kimono, isActive: false };
    PosService.routingConfig.medusa = { ...PosService.routingConfig.medusa, isActive: false };
    PosService.routingConfig.nibss  = { ...PosService.routingConfig.nibss,  isActive: false };
    expect(() => (PosService as any).determineRoute(5000)).toThrow('All hosts are inactive');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  2. ISO8583 PARSER
// ═══════════════════════════════════════════════════════════════════════════════

describe('PosService — parseIsoMessage', () => {

  it('should extract field 39 response code "00" from mocked iso8583-js', () => {
    const dummyBuf = Buffer.from('0210some_iso_message', 'ascii');
    const result = PosService.parseIsoMessage(dummyBuf, 'TEST');
    expect(result.responseCode).toBe('00');
    expect(result.isoFields['039']).toBe('00');
  });

  it('should return isoFields with RRN and STAN', () => {
    const dummyBuf = Buffer.from('0210', 'ascii');
    const result = PosService.parseIsoMessage(dummyBuf, 'TEST');
    expect(result.isoFields['037']).toBe('123456789012');
    expect(result.isoFields['011']).toBe('000001');
  });

  it('should fall back to heuristic when iso8583-js throws', () => {
    const iso = require('iso8583-js');
    jest.spyOn(iso, 'parse').mockImplementationOnce(() => { throw new Error('parse error'); });
    // Build a buffer where "00" appears at position 20
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
    PosService.routingConfig.activeHost = 'kimono';
    PosService.routingConfig.kimono = { ...PosService.routingConfig.kimono, isActive: true };
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
    PosService.routingConfig.activeHost = 'kimono';
    PosService.routingConfig.kimono = { ...PosService.routingConfig.kimono, isActive: true };
    PosService.routingConfig.medusa = { ...PosService.routingConfig.medusa, isActive: true };
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
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams);
    expect(payload.pan).toBe('5366132277281612');
  });

  it('should map track2Data correctly', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams);
    expect(payload.track2Data).toBe('5366132277281612D2812221012908360F');
  });

  it('should split expiry into year and month', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams);
    expect(payload.expiryYear).toBe('28');
    expect(payload.expiryMonth).toBe('12');
  });

  it('should set minorAmount from amountAuthorisedNumeric stripped of leading zeros', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams);
    // "000000012000" → "12000"
    expect(payload.minorAmount).toBe('12000');
  });

  it('should set cryptogram (tag 9F26) from appCryptogram', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams);
    expect(payload.cryptogram).toBe('C9D04E12B7F3DAC8');
  });

  it('should set pinBlock from emvData.pinBlock', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams);
    expect(payload.pinBlock).toBe('D1A0E33AF8B5070E');
  });

  it('should set terminalId from ISW_TERMINAL_ID udf', () => {
    const payload = (PosService as any).buildKimonoPayload(EMV_FIXTURE, dummyParams);
    expect(payload.terminalId).toBe('TID00001');
  });
});

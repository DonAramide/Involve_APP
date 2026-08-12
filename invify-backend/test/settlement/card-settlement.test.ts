import * as XLSX from 'xlsx';
import { SettlementFileParser } from '../../src/services/settlement/settlement-file.parser';
import {
  amountsClose,
  normalizeDbRrn,
  scoreSettlementMatch,
} from '../../src/services/settlement/settlement-matcher';

function buildWorkbookBuffer(headers: string[], rows: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('SettlementFileParser', () => {
  it('parses NIBSS RexConnect template rows', () => {
    const buffer = buildWorkbookBuffer(
      [
        'Transaction ID',
        'Terminal ID',
        'Merchant name',
        'Merchant id',
        'RRN',
        'Stan',
        'Network',
        'PAN/Account',
        'Amount',
        'Creation Date',
        'Currency',
        'Type',
        'Additional Data',
        'Status',
        'Auth Code',
        'Response Code',
        'Response Description',
        'Destination Name',
        'Destination RRN',
      ],
      [
        [
          'TXN-001',
          '2POS001',
          'Test Merchant',
          'MID123',
          '000000123456',
          '789012',
          'NIBSS',
          '5399****1234',
          '1500.00',
          '2026-08-10',
          'NGN',
          'Purchase',
          '',
          'Success',
          'A12345',
          '00',
          'Approved',
          '',
          '',
        ],
      ],
    );

    const parsed = SettlementFileParser.parseBuffer(buffer, 'NIBSS_REXCONNECT');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].rrn).toBe('000000123456');
    expect(parsed[0].stan).toBe('789012');
    expect(parsed[0].terminalId).toBe('2POS001');
    expect(parsed[0].amount).toBe(1500);
    expect(parsed[0].authCode).toBe('A12345');
  });

  it('parses OneView T+1 template rows', () => {
    const buffer = buildWorkbookBuffer(
      [
        'DateTime',
        'Currency_Name',
        'Local_Date_Time',
        'Terminal_ID',
        'Merchant_ID',
        'Merchant_Name_Location',
        'STAN',
        'PAN',
        'Message_Type',
        'From_Account_ID',
        'Merchant_Account_Nr',
        'Merchant_Account_Name',
        'From_Account_Type',
        'tran_type_description',
        'Response_Code_description',
        'Tran_Amount_Req',
        'Tran_Amount_Rsp',
        'Surcharge',
        'Amount_Impact',
        'merch_cat_category_name',
        'Settlement_Impact',
        'Settlement_Impact_Desc',
        'Merchant_Discount',
        'Merchant_Receivable',
        'Auth_ID',
        'Tran_ID',
        'Retrieval_Reference_Nr',
        'Totals_Group',
        'Transaction_Status',
        'Region',
        'Transaction_Type_Impact',
        'Message_Type_Desc',
        'trxn_category',
      ],
      [
        [
          '2026-08-10',
          'NGN',
          '2026-08-10 12:00',
          'TERM999',
          'MERCH1',
          'Shop',
          '445566',
          '5399****9999',
          '0200',
          '',
          '',
          '',
          '',
          'Purchase',
          'Approved',
          '2500',
          '2500',
          '0',
          '2500',
          '',
          '',
          '',
          '',
          '',
          'AUTH99',
          'TRX99',
          '998877665544',
          '',
          'Settled',
          '',
          '',
          '',
          '',
        ],
      ],
    );

    const parsed = SettlementFileParser.parseBuffer(buffer, 'ONEVIEW_T1_NIBSS');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].rrn).toBe('998877665544');
    expect(parsed[0].stan).toBe('445566');
    expect(parsed[0].terminalId).toBe('TERM999');
    expect(parsed[0].amount).toBe(2500);
    expect(parsed[0].authCode).toBe('AUTH99');
  });
});

describe('settlement-matcher', () => {
  it('normalizes numeric RRN padding', () => {
    expect(normalizeDbRrn('123456')).toBe('000000123456');
  });

  it('scores strong RRN+STAN+terminal matches', () => {
    const row = {
      rowIndex: 2,
      rrn: '000000123456',
      stan: '789012',
      terminalId: '2POS001',
      amount: 1500,
      authCode: 'A12345',
      settlementDate: null,
      processorRef: null,
      maskedPan: null,
      rawRow: {},
    };

    const score = scoreSettlementMatch(row, {
      id: 'attempt-1',
      tenant_id: 'tenant-1',
      terminal_id: '2POS001',
      amount: 1500,
      status: 'Approved',
      settlement_status: 'unsettled',
      rrn: '123456',
      stan: '789012',
      auth_code: 'A12345',
    });

    expect(score).toBeGreaterThanOrEqual(80);
    expect(amountsClose(1500, 1500)).toBe(true);
  });
});

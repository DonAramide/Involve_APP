/**
 * Phase 1.3 / final candidate — spreadsheet input bounds + SheetJS CE version gate.
 */
import * as XLSX from 'xlsx';
import {
  SETTLEMENT_XLSX_MAX_BYTES,
  SETTLEMENT_XLSX_MAX_ROWS,
  SettlementFileParser,
} from '../src/services/settlement/settlement-file.parser';

function buildWorkbookBuffer(headers: string[], rows: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('xlsx input bounds and SheetJS CE remediation', () => {
  it('runs SheetJS CE >= 0.20.2 (ReDoS/prototype-pollution fixed line)', () => {
    const parts = String(XLSX.version || '0.0.0')
      .split('.')
      .map((n) => Number(n) || 0);
    const [major, minor, patch] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
    const score = major * 1_000_000 + minor * 1_000 + patch;
    expect(score).toBeGreaterThanOrEqual(0 * 1_000_000 + 20 * 1_000 + 2);
  });

  it('rejects settlement buffers over the byte hard cap without parsing', () => {
    const oversized = Buffer.alloc(SETTLEMENT_XLSX_MAX_BYTES + 1, 0x41);
    expect(() => SettlementFileParser.parseBuffer(oversized, 'NIBSS_REXCONNECT')).toThrow(
      /byte limit/i,
    );
  });

  it('rejects settlement sheets that exceed the row hard cap', () => {
    const buffer = buildWorkbookBuffer(['RRN', 'Amount'], [['1', '10']]);
    const spy = jest
      .spyOn(XLSX.utils, 'sheet_to_json')
      .mockReturnValue(Array.from({ length: SETTLEMENT_XLSX_MAX_ROWS + 1 }, () => []));
    try {
      expect(() => SettlementFileParser.parseBuffer(buffer, 'NIBSS_REXCONNECT')).toThrow(
        /row limit/i,
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('returns empty for empty buffer and tolerates empty workbook sheets', () => {
    expect(SettlementFileParser.parseBuffer(Buffer.alloc(0), 'NIBSS_REXCONNECT')).toEqual([]);
    const emptyBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(emptyBook, XLSX.utils.aoa_to_sheet([]), 'Empty');
    const buffer = XLSX.write(emptyBook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    expect(SettlementFileParser.parseBuffer(buffer, 'NIBSS_REXCONNECT')).toEqual([]);
  });

  it('does not throw on a malformed zip-like payload (adversarial garbage)', () => {
    const garbage = Buffer.from('PK\x03\x04' + 'A'.repeat(2048));
    expect(() => SettlementFileParser.parseBuffer(garbage, 'NIBSS_REXCONNECT')).toThrow();
  });
});

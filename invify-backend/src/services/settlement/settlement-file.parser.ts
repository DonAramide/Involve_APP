import * as XLSX from 'xlsx';
import {
  NormalizedSettlementRow,
  SettlementTemplateType,
} from './settlement-template.types';
import { SETTLEMENT_COLUMN_ALIASES } from './settlement-template.registry';

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s/]/g, '');
}

function normalizeId(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'N/A' || raw === 'NA' || raw === '-') return null;
  return raw.replace(/\s+/g, '');
}

function normalizeRrn(value: unknown): string | null {
  const id = normalizeId(value);
  if (!id) return null;
  if (/^\d+$/.test(id)) return id.padStart(12, '0').slice(-12);
  return id.toUpperCase();
}

function normalizeStan(value: unknown): string | null {
  const id = normalizeId(value);
  if (!id) return null;
  if (/^\d+$/.test(id)) return id.padStart(6, '0').slice(-6);
  return id;
}

function normalizeTerminal(value: unknown): string | null {
  const id = normalizeId(value);
  if (!id) return null;
  return id.toUpperCase();
}

function parseAmount(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickField(
  row: Record<string, unknown>,
  headerIndex: Record<string, string>,
  aliases: string[],
): unknown {
  for (const alias of aliases) {
    const key = headerIndex[alias];
    if (key && row[key] != null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return null;
}

function buildHeaderIndex(headers: unknown[]): Record<string, string> {
  const index: Record<string, string> = {};
  headers.forEach((header, colIdx) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;
    index[normalized] = `col_${colIdx}`;
  });
  return index;
}

function rowToObject(headers: unknown[], cells: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  headers.forEach((header, idx) => {
    obj[`col_${idx}`] = cells[idx] ?? null;
    obj[String(header ?? idx)] = cells[idx] ?? null;
  });
  return obj;
}

function isLikelyHeaderRow(cells: unknown[]): boolean {
  const normalized = cells.map(normalizeHeader).filter(Boolean);
  if (normalized.length < 3) return false;
  const joined = normalized.join(' ');
  return (
    joined.includes('RRN') ||
    joined.includes('STAN') ||
    joined.includes('TERMINAL') ||
    joined.includes('TRANAMOUNT') ||
    joined.includes('RETRIEVAL') ||
    joined.includes('AMOUNT')
  );
}

export class SettlementFileParser {
  static parseBuffer(
    buffer: Buffer,
    templateType: SettlementTemplateType,
  ): NormalizedSettlementRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: null,
    }) as unknown[][];

    if (!matrix.length) return [];

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(matrix.length, 15); i++) {
      if (isLikelyHeaderRow(matrix[i] || [])) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = matrix[headerRowIdx] || [];
    const headerIndex = buildHeaderIndex(headers);
    const aliases = SETTLEMENT_COLUMN_ALIASES[templateType];
    const rows: NormalizedSettlementRow[] = [];

    for (let i = headerRowIdx + 1; i < matrix.length; i++) {
      const cells = matrix[i] || [];
      if (!cells.some((c) => c != null && String(c).trim() !== '')) continue;

      const rawRow = rowToObject(headers, cells);
      const amountRaw = pickField(rawRow, headerIndex, aliases.amount);
      const amount = parseAmount(amountRaw);
      const rrn = normalizeRrn(pickField(rawRow, headerIndex, aliases.rrn));
      const stan = normalizeStan(pickField(rawRow, headerIndex, aliases.stan));
      const terminalId = normalizeTerminal(pickField(rawRow, headerIndex, aliases.terminalId));

      if (!rrn && !stan && !terminalId && amount <= 0) continue;

      rows.push({
        rowIndex: i + 1,
        rrn,
        stan,
        terminalId,
        amount,
        authCode: normalizeId(pickField(rawRow, headerIndex, aliases.authCode)),
        settlementDate: pickField(rawRow, headerIndex, aliases.settlementDate)
          ? String(pickField(rawRow, headerIndex, aliases.settlementDate))
          : null,
        processorRef: normalizeId(pickField(rawRow, headerIndex, aliases.processorRef)),
        maskedPan: normalizeId(pickField(rawRow, headerIndex, aliases.maskedPan)),
        rawRow,
      });
    }

    return rows;
  }
}

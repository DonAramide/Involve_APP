// invify-backend/src/modules/health-insurance/services/hmo-excel-exchange.service.ts
import crypto from 'crypto';
import { supabaseAdmin } from '../../../db/supabase';

export type BatchStatus =
  | 'draft'
  | 'validating'
  | 'validation_failed'
  | 'ready_for_export'
  | 'exported'
  | 'submitted_to_hmo'
  | 'awaiting_hmo_response'
  | 'partially_processed'
  | 'reconciled'
  | 'completed'
  | 'cancelled';

export const ALLOWED_BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  draft: ['validating', 'ready_for_export', 'cancelled'],
  validating: ['ready_for_export', 'validation_failed', 'cancelled'],
  validation_failed: ['validating', 'ready_for_export', 'cancelled'],
  ready_for_export: ['exported', 'cancelled'],
  exported: ['exported', 'submitted_to_hmo', 'awaiting_hmo_response', 'partially_processed', 'reconciled', 'cancelled'],
  submitted_to_hmo: ['awaiting_hmo_response', 'partially_processed', 'reconciled', 'cancelled'],
  awaiting_hmo_response: ['partially_processed', 'reconciled', 'completed', 'cancelled'],
  partially_processed: ['partially_processed', 'reconciled', 'completed', 'cancelled'],
  reconciled: ['completed'],
  completed: [],
  cancelled: [],
};

const DANGEROUS_FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Protects exported/imported spreadsheet cells against CSV/Excel formula injection (CSV Injection / CWE-1236).
 * Prefixes values starting with =, +, -, @, TAB, or CR with a single quote (') unless it is a pure negative number.
 */
export function sanitizeSpreadsheetCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/\r?\n/g, ' ').trim();
  if (!str) return '';

  const firstChar = str[0];
  if (DANGEROUS_FORMULA_PREFIXES.includes(firstChar)) {
    // Allow negative numbers like -1200 only if strictly numeric; otherwise escape
    if (firstChar === '-' && /^-\d+(\.\d+)?$/.test(str)) {
      return str;
    }
    return `'${str}`;
  }
  return str;
}

/**
 * Strips leading formula-escape characters or dangerous formula prefixes on inbound HMO response values.
 */
export function cleanInboundCell(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();
  while (str.length > 0 && (DANGEROUS_FORMULA_PREFIXES.includes(str[0]) || str[0] === "'")) {
    str = str.slice(1).trim();
  }
  return str;
}

/**
 * Escapes a sanitized cell for RFC 4180 CSV output.
 */
export function escapeCsvField(value: any, delimiter = ','): string {
  const safe = sanitizeSpreadsheetCell(value);
  if (safe.includes(delimiter) || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Parses a CSV string into an array of objects keyed by normalized uppercase header names.
 */
export function parseCsvContent(csvText: string, delimiter = ','): {
  headers: string[];
  rows: Array<{ rowNumber: number; raw: Record<string, string> }>;
} {
  const normalized = String(csvText || '').replace(/^\uFEFF/, ''); // strip BOM
  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]).map((h) =>
    h.replace(/^["']|["']$/g, '').trim().toUpperCase()
  );

  const rows: Array<{ rowNumber: number; raw: Record<string, string> }> = [];
  for (let idx = 1; idx < lines.length; idx++) {
    const values = parseLine(lines[idx]);
    const record: Record<string, string> = {};
    rawHeaders.forEach((header, colIdx) => {
      if (header) {
        record[header] = values[colIdx] ?? '';
      }
    });
    rows.push({ rowNumber: idx + 1, raw: record });
  }

  return { headers: rawHeaders, rows };
}

export function formatDateByPattern(dateStr: string | null | undefined, pattern = 'YYYY-MM-DD'): string {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(dateStr);
  const [, yyyy, mm, dd] = match;
  if (pattern === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
  if (pattern === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
  return `${yyyy}-${mm}-${dd}`;
}

export function normalizeInboundDate(raw: string | null | undefined): string | null {
  const cleaned = cleanInboundCell(raw);
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const dmy = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const [, first, second, yyyy] = dmy;
    // If first > 12 it is definitely DD/MM/YYYY; default Nigerian convention is DD/MM/YYYY
    if (Number(second) <= 12) {
      return `${yyyy}-${second}-${first}`;
    }
    return `${yyyy}-${first}-${second}`;
  }
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export const DEFAULT_EXPORT_COLUMNS = [
  { sourceField: 'batch_reference', headerName: 'BATCH_REF', required: true },
  { sourceField: 'enrolment_reference', headerName: 'INVIFY_ENROLMENT_REF', required: true },
  { sourceField: 'school_name', headerName: 'SCHOOL_OR_EMPLOYER_NAME', required: true },
  { sourceField: 'member_full_name', headerName: 'MEMBER_FULL_NAME', required: true },
  { sourceField: 'member_category', headerName: 'MEMBER_CATEGORY', required: true },
  { sourceField: 'date_of_birth', headerName: 'DATE_OF_BIRTH', required: true },
  { sourceField: 'sex', headerName: 'GENDER', required: true },
  { sourceField: 'plan_code', headerName: 'HMO_PLAN_CODE', required: true },
  { sourceField: 'period_start', headerName: 'COVERAGE_START_DATE', required: true },
  { sourceField: 'period_end', headerName: 'COVERAGE_END_DATE', required: true },
  { sourceField: 'guardian_or_staff_contact', headerName: 'PRIMARY_CONTACT', required: false },
  { sourceField: 'hospital_preference', headerName: 'PREFERRED_PROVIDER', required: false },
  // Round-trip columns for HMO to fill and upload back
  { sourceField: 'hmo_member_id', headerName: 'HMO_MEMBER_ID', required: false },
  { sourceField: 'hmo_policy_number', headerName: 'HMO_POLICY_NUMBER', required: false },
  { sourceField: 'reconciliation_status', headerName: 'HMO_CONFIRMATION_STATUS', required: false },
  { sourceField: 'confirmed_effective_date', headerName: 'CONFIRMED_START_DATE', required: false },
  { sourceField: 'confirmed_expiry_date', headerName: 'CONFIRMED_END_DATE', required: false },
  { sourceField: 'assigned_facility_ref', headerName: 'ASSIGNED_HOSPITAL_CODE', required: false },
  { sourceField: 'rejection_code', headerName: 'REJECTION_CODE', required: false },
  { sourceField: 'rejection_reason', headerName: 'REJECTION_REASON', required: false },
];

export interface ReconcileRowInput {
  rowNumber: number;
  enrolmentReference: string;
  batchReference?: string;
  hmoMemberId?: string;
  hmoPolicyNumber?: string;
  confirmationStatus: string; // 'CONFIRMED' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | 'FAILED'
  confirmedEffectiveDate?: string | null;
  confirmedExpiryDate?: string | null;
  assignedFacilityRef?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  rawSanitized: Record<string, string>;
}

export class HmoExcelExchangeService {
  /**
   * Lists export mapping configurations for the authenticated HMO provider.
   */
  async listMappings(providerId: string) {
    const { data, error } = await supabaseAdmin
      .from('hw_export_mappings')
      .select('*')
      .eq('provider_id', providerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [
        {
          id: 'default-mhmo-mapping',
          provider_id: providerId,
          template_name: 'MHMO Standard Enrollment Exchange v1',
          template_version: 1,
          file_format: 'CSV',
          date_format: 'YYYY-MM-DD',
          delimiter: ',',
          include_dependants: true,
          column_mappings: DEFAULT_EXPORT_COLUMNS,
          is_default: true,
          is_active: true,
        },
      ];
    }
    return data;
  }

  /**
   * Creates or updates an HMO export mapping configuration.
   */
  async saveMapping(providerId: string, userId: string | null, payload: any) {
    const templateName = String(payload.template_name || payload.templateName || 'Custom HMO Mapping').trim();
    const dateFormat = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'].includes(payload.date_format || payload.dateFormat)
      ? (payload.date_format || payload.dateFormat)
      : 'YYYY-MM-DD';
    const columnMappings = Array.isArray(payload.column_mappings || payload.columnMappings) &&
      (payload.column_mappings || payload.columnMappings).length > 0
      ? (payload.column_mappings || payload.columnMappings)
      : DEFAULT_EXPORT_COLUMNS;

    const record = {
      provider_id: providerId,
      template_name: templateName,
      template_version: Number(payload.template_version || 1),
      file_format: payload.file_format === 'XLSX' ? 'XLSX' : 'CSV',
      date_format: dateFormat,
      delimiter: String(payload.delimiter || ',')[0] || ',',
      include_dependants: payload.include_dependants !== false,
      column_mappings: columnMappings,
      is_default: Boolean(payload.is_default),
      is_active: true,
      created_by: userId,
    };

    const { data, error } = await supabaseAdmin
      .from('hw_export_mappings')
      .upsert(record, { onConflict: 'provider_id,template_name,template_version' })
      .select('*')
      .maybeSingle();

    if (error) {
      return { ...record, id: `map-${Date.now()}` };
    }
    return data;
  }

  /**
   * Validates a batch item's required fields before export.
   */
  validateBatchItem(item: {
    enrolment_reference?: string;
    member_full_name?: string;
    member_category?: string;
    date_of_birth?: string | null;
    sex?: string | null;
    plan_code?: string;
    period_start?: string | null;
    period_end?: string | null;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!item.enrolment_reference) errors.push('Missing enrolment_reference');
    if (!item.member_full_name || item.member_full_name.trim().length < 2) {
      errors.push('Missing or invalid member full name');
    }
    if (!item.member_category) errors.push('Missing member category');
    if (!item.plan_code) errors.push('Missing HMO plan code');
    if (!item.period_start || !item.period_end) {
      errors.push('Missing coverage start or end date');
    } else if (new Date(item.period_end) < new Date(item.period_start)) {
      errors.push('Coverage end date cannot precede coverage start date');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generates a sanitized CSV string for an enrollment batch using the HMO's mapping template.
   */
  generateBatchCsv(params: {
    batchReference: string;
    items: any[];
    columnMappings?: Array<{ sourceField: string; headerName: string }>;
    dateFormat?: string;
    delimiter?: string;
  }): { csv: string; filename: string; rowCount: number } {
    const columns =
      Array.isArray(params.columnMappings) && params.columnMappings.length > 0
        ? params.columnMappings
        : DEFAULT_EXPORT_COLUMNS;
    const delimiter = params.delimiter || ',';
    const dateFormat = params.dateFormat || 'YYYY-MM-DD';

    const headerLine = columns.map((c) => escapeCsvField(c.headerName, delimiter)).join(delimiter);
    const dataLines: string[] = [];

    for (const item of params.items) {
      const rowValues = columns.map((col) => {
        let rawVal = item[col.sourceField];
        if (col.sourceField === 'batch_reference') {
          rawVal = params.batchReference;
        } else if (
          ['date_of_birth', 'period_start', 'period_end', 'confirmed_effective_date', 'confirmed_expiry_date'].includes(
            col.sourceField
          )
        ) {
          rawVal = formatDateByPattern(rawVal, dateFormat);
        }
        return escapeCsvField(rawVal ?? '', delimiter);
      });
      dataLines.push(rowValues.join(delimiter));
    }

    const csv = [headerLine, ...dataLines].join('\r\n');
    const safeBatchRef = params.batchReference.replace(/[^A-Za-z0-9_\-]/g, '_');
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return {
      csv,
      filename: `${safeBatchRef}_HMO_ENROLMENT_${dateStamp}.csv`,
      rowCount: dataLines.length,
    };
  }

  /**
   * Parses and validates an uploaded HMO response CSV file and produces a structured preview
   * before or during reconciliation.
   */
  parseResponseCsvToRows(csvText: string): {
    checksumSha256: string;
    headers: string[];
    rows: ReconcileRowInput[];
  } {
    const checksumSha256 = crypto.createHash('sha256').update(String(csvText || ''), 'utf8').digest('hex');
    const parsed = parseCsvContent(csvText);

    const rows: ReconcileRowInput[] = parsed.rows.map(({ rowNumber, raw }) => {
      const sanitizedRaw: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        sanitizedRaw[k] = cleanInboundCell(v);
      }

      const enrolmentReference =
        sanitizedRaw['INVIFY_ENROLMENT_REF'] ||
        sanitizedRaw['ENROLMENT_REFERENCE'] ||
        sanitizedRaw['ENROLMENT_REF'] ||
        sanitizedRaw['ENROLMENT_ID'] ||
        '';
      const batchReference =
        sanitizedRaw['BATCH_REF'] ||
        sanitizedRaw['BATCH_REFERENCE'] ||
        '';
      const hmoMemberId =
        sanitizedRaw['HMO_MEMBER_ID'] ||
        sanitizedRaw['INSURER_MEMBER_REF'] ||
        sanitizedRaw['MEMBER_NO'] ||
        '';
      const hmoPolicyNumber =
        sanitizedRaw['HMO_POLICY_NUMBER'] ||
        sanitizedRaw['POLICY_NUMBER'] ||
        sanitizedRaw['POLICY_NO'] ||
        hmoMemberId ||
        '';
      const confirmationStatus = (
        sanitizedRaw['HMO_CONFIRMATION_STATUS'] ||
        sanitizedRaw['STATUS'] ||
        sanitizedRaw['CONFIRMATION_STATUS'] ||
        (hmoMemberId ? 'CONFIRMED' : '')
      ).toUpperCase();

      const confirmedEffectiveDate = normalizeInboundDate(
        sanitizedRaw['CONFIRMED_START_DATE'] ||
        sanitizedRaw['EFFECTIVE_DATE'] ||
        sanitizedRaw['COVERAGE_START_DATE']
      );
      const confirmedExpiryDate = normalizeInboundDate(
        sanitizedRaw['CONFIRMED_END_DATE'] ||
        sanitizedRaw['EXPIRY_DATE'] ||
        sanitizedRaw['COVERAGE_END_DATE']
      );
      const assignedFacilityRef =
        sanitizedRaw['ASSIGNED_HOSPITAL_CODE'] ||
        sanitizedRaw['FACILITY_REF'] ||
        sanitizedRaw['PREFERRED_PROVIDER'] ||
        '';
      const rejectionCode =
        sanitizedRaw['REJECTION_CODE'] ||
        sanitizedRaw['ERROR_CODE'] ||
        '';
      const rejectionReason =
        sanitizedRaw['REJECTION_REASON'] ||
        sanitizedRaw['REASON'] ||
        sanitizedRaw['REMARKS'] ||
        '';

      return {
        rowNumber,
        enrolmentReference,
        batchReference,
        hmoMemberId,
        hmoPolicyNumber,
        confirmationStatus,
        confirmedEffectiveDate,
        confirmedExpiryDate,
        assignedFacilityRef,
        rejectionCode,
        rejectionReason,
        rawSanitized: sanitizedRaw,
      };
    });

    return {
      checksumSha256,
      headers: parsed.headers,
      rows,
    };
  }

  /**
   * Deterministic, idempotent reconciliation engine for HMO response rows against known batch items.
   * Can run against DB records or in-memory batch items (for preview & unit tests).
   */
  reconcileRowsInMemory(params: {
    providerId: string;
    batchReference?: string;
    parsedRows: ReconcileRowInput[];
    existingBatchItems: Array<{
      id: string;
      batch_id: string;
      provider_id: string;
      tenant_id: string;
      enrolment_id: string;
      member_id: string;
      enrolment_reference: string;
      reconciliation_status: string;
      hmo_member_id?: string | null;
      hmo_policy_number?: string | null;
      period_start?: string | null;
      period_end?: string | null;
    }>;
  }) {
    const itemByRef = new Map<string, (typeof params.existingBatchItems)[0]>();
    for (const item of params.existingBatchItems) {
      itemByRef.set(String(item.enrolment_reference).toUpperCase(), item);
    }

    const seenInFile = new Set<string>();
    const results: Array<{
      rowNumber: number;
      enrolmentReference: string;
      batchItemId: string | null;
      enrolmentId: string | null;
      tenantId: string | null;
      memberId: string | null;
      outcome:
        | 'matched_confirmed'
        | 'matched_rejected'
        | 'duplicate_ignored'
        | 'unmatched_reference'
        | 'cross_hmo_violation'
        | 'validation_error';
      hmoMemberId: string | null;
      hmoPolicyNumber: string | null;
      confirmedEffectiveDate: string | null;
      confirmedExpiryDate: string | null;
      assignedFacilityRef: string | null;
      rejectionCode: string | null;
      rejectionReason: string | null;
      errorDetails: string | null;
      rawSanitized: Record<string, string>;
    }> = [];

    let matchedRows = 0;
    let confirmedRows = 0;
    let rejectedRows = 0;
    let unmatchedRows = 0;
    let duplicateRows = 0;
    let invalidRows = 0;

    for (const row of params.parsedRows) {
      const refUpper = String(row.enrolmentReference || '').trim().toUpperCase();

      if (!refUpper) {
        invalidRows++;
        results.push({
          rowNumber: row.rowNumber,
          enrolmentReference: '',
          batchItemId: null,
          enrolmentId: null,
          tenantId: null,
          memberId: null,
          outcome: 'validation_error',
          hmoMemberId: null,
          hmoPolicyNumber: null,
          confirmedEffectiveDate: null,
          confirmedExpiryDate: null,
          assignedFacilityRef: null,
          rejectionCode: null,
          rejectionReason: null,
          errorDetails: 'Missing INVIFY_ENROLMENT_REF in uploaded row.',
          rawSanitized: row.rawSanitized,
        });
        continue;
      }

      if (seenInFile.has(refUpper)) {
        duplicateRows++;
        results.push({
          rowNumber: row.rowNumber,
          enrolmentReference: row.enrolmentReference,
          batchItemId: null,
          enrolmentId: null,
          tenantId: null,
          memberId: null,
          outcome: 'duplicate_ignored',
          hmoMemberId: row.hmoMemberId || null,
          hmoPolicyNumber: row.hmoPolicyNumber || null,
          confirmedEffectiveDate: row.confirmedEffectiveDate || null,
          confirmedExpiryDate: row.confirmedExpiryDate || null,
          assignedFacilityRef: row.assignedFacilityRef || null,
          rejectionCode: null,
          rejectionReason: null,
          errorDetails: 'Duplicate enrolment reference in the same upload file (ignored idempotently).',
          rawSanitized: row.rawSanitized,
        });
        continue;
      }
      seenInFile.add(refUpper);

      const targetItem = itemByRef.get(refUpper);
      if (!targetItem) {
        unmatchedRows++;
        results.push({
          rowNumber: row.rowNumber,
          enrolmentReference: row.enrolmentReference,
          batchItemId: null,
          enrolmentId: null,
          tenantId: null,
          memberId: null,
          outcome: 'unmatched_reference',
          hmoMemberId: row.hmoMemberId || null,
          hmoPolicyNumber: row.hmoPolicyNumber || null,
          confirmedEffectiveDate: row.confirmedEffectiveDate || null,
          confirmedExpiryDate: row.confirmedExpiryDate || null,
          assignedFacilityRef: row.assignedFacilityRef || null,
          rejectionCode: null,
          rejectionReason: null,
          errorDetails: `No enrollment record matches reference '${row.enrolmentReference}'.`,
          rawSanitized: row.rawSanitized,
        });
        continue;
      }

      // Cross-HMO isolation check
      if (targetItem.provider_id !== params.providerId) {
        invalidRows++;
        results.push({
          rowNumber: row.rowNumber,
          enrolmentReference: row.enrolmentReference,
          batchItemId: targetItem.id,
          enrolmentId: targetItem.enrolment_id,
          tenantId: targetItem.tenant_id,
          memberId: targetItem.member_id,
          outcome: 'cross_hmo_violation',
          hmoMemberId: null,
          hmoPolicyNumber: null,
          confirmedEffectiveDate: null,
          confirmedExpiryDate: null,
          assignedFacilityRef: null,
          rejectionCode: 'CROSS_HMO_ACCESS_DENIED',
          rejectionReason: null,
          errorDetails: 'Enrollment belongs to a different HMO institution.',
          rawSanitized: row.rawSanitized,
        });
        continue;
      }

      const statusUpper = String(row.confirmationStatus || '').toUpperCase();
      const isConfirmed = ['CONFIRMED', 'APPROVED', 'ACTIVE', 'ENROLLED', 'ACCEPTED'].includes(statusUpper);
      const isRejected = ['REJECTED', 'FAILED', 'DECLINED', 'INELIGIBLE'].includes(statusUpper);

      if (!isConfirmed && !isRejected) {
        invalidRows++;
        results.push({
          rowNumber: row.rowNumber,
          enrolmentReference: row.enrolmentReference,
          batchItemId: targetItem.id,
          enrolmentId: targetItem.enrolment_id,
          tenantId: targetItem.tenant_id,
          memberId: targetItem.member_id,
          outcome: 'validation_error',
          hmoMemberId: row.hmoMemberId || null,
          hmoPolicyNumber: row.hmoPolicyNumber || null,
          confirmedEffectiveDate: row.confirmedEffectiveDate || null,
          confirmedExpiryDate: row.confirmedExpiryDate || null,
          assignedFacilityRef: row.assignedFacilityRef || null,
          rejectionCode: null,
          rejectionReason: null,
          errorDetails: `Unrecognized HMO_CONFIRMATION_STATUS '${row.confirmationStatus}'. Expected CONFIRMED or REJECTED.`,
          rawSanitized: row.rawSanitized,
        });
        continue;
      }

      // Idempotency check: if already confirmed with the exact same HMO member ID, mark duplicate_ignored
      if (
        isConfirmed &&
        targetItem.reconciliation_status === 'confirmed' &&
        targetItem.hmo_member_id &&
        targetItem.hmo_member_id === row.hmoMemberId
      ) {
        duplicateRows++;
        results.push({
          rowNumber: row.rowNumber,
          enrolmentReference: row.enrolmentReference,
          batchItemId: targetItem.id,
          enrolmentId: targetItem.enrolment_id,
          tenantId: targetItem.tenant_id,
          memberId: targetItem.member_id,
          outcome: 'duplicate_ignored',
          hmoMemberId: row.hmoMemberId,
          hmoPolicyNumber: row.hmoPolicyNumber || targetItem.hmo_policy_number || row.hmoMemberId,
          confirmedEffectiveDate: row.confirmedEffectiveDate || null,
          confirmedExpiryDate: row.confirmedExpiryDate || null,
          assignedFacilityRef: row.assignedFacilityRef || null,
          rejectionCode: null,
          rejectionReason: null,
          errorDetails: 'Row already confirmed with identical HMO Member ID (idempotent no-op).',
          rawSanitized: row.rawSanitized,
        });
        continue;
      }

      if (isConfirmed) {
        if (!row.hmoMemberId) {
          invalidRows++;
          results.push({
            rowNumber: row.rowNumber,
            enrolmentReference: row.enrolmentReference,
            batchItemId: targetItem.id,
            enrolmentId: targetItem.enrolment_id,
            tenantId: targetItem.tenant_id,
            memberId: targetItem.member_id,
            outcome: 'validation_error',
            hmoMemberId: null,
            hmoPolicyNumber: row.hmoPolicyNumber || null,
            confirmedEffectiveDate: row.confirmedEffectiveDate || null,
            confirmedExpiryDate: row.confirmedExpiryDate || null,
            assignedFacilityRef: row.assignedFacilityRef || null,
            rejectionCode: null,
            rejectionReason: null,
            errorDetails: 'Confirmed enrollment requires a non-empty HMO_MEMBER_ID.',
            rawSanitized: row.rawSanitized,
          });
          continue;
        }

        const effStart = row.confirmedEffectiveDate || targetItem.period_start || new Date().toISOString().slice(0, 10);
        const effEnd =
          row.confirmedExpiryDate ||
          targetItem.period_end ||
          new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

        if (new Date(effEnd) < new Date(effStart)) {
          invalidRows++;
          results.push({
            rowNumber: row.rowNumber,
            enrolmentReference: row.enrolmentReference,
            batchItemId: targetItem.id,
            enrolmentId: targetItem.enrolment_id,
            tenantId: targetItem.tenant_id,
            memberId: targetItem.member_id,
            outcome: 'validation_error',
            hmoMemberId: row.hmoMemberId,
            hmoPolicyNumber: row.hmoPolicyNumber || row.hmoMemberId,
            confirmedEffectiveDate: effStart,
            confirmedExpiryDate: effEnd,
            assignedFacilityRef: row.assignedFacilityRef || null,
            rejectionCode: null,
            rejectionReason: null,
            errorDetails: 'Confirmed expiry date precedes confirmed effective start date.',
            rawSanitized: row.rawSanitized,
          });
          continue;
        }

        matchedRows++;
        confirmedRows++;
        results.push({
          rowNumber: row.rowNumber,
          enrolmentReference: row.enrolmentReference,
          batchItemId: targetItem.id,
          enrolmentId: targetItem.enrolment_id,
          tenantId: targetItem.tenant_id,
          memberId: targetItem.member_id,
          outcome: 'matched_confirmed',
          hmoMemberId: row.hmoMemberId,
          hmoPolicyNumber: row.hmoPolicyNumber || row.hmoMemberId,
          confirmedEffectiveDate: effStart,
          confirmedExpiryDate: effEnd,
          assignedFacilityRef: row.assignedFacilityRef || null,
          rejectionCode: null,
          rejectionReason: null,
          errorDetails: null,
          rawSanitized: row.rawSanitized,
        });
      } else {
        // Rejected by HMO
        matchedRows++;
        rejectedRows++;
        results.push({
          rowNumber: row.rowNumber,
          enrolmentReference: row.enrolmentReference,
          batchItemId: targetItem.id,
          enrolmentId: targetItem.enrolment_id,
          tenantId: targetItem.tenant_id,
          memberId: targetItem.member_id,
          outcome: 'matched_rejected',
          hmoMemberId: null,
          hmoPolicyNumber: null,
          confirmedEffectiveDate: null,
          confirmedExpiryDate: null,
          assignedFacilityRef: null,
          rejectionCode: row.rejectionCode || 'HMO_REJECTED',
          rejectionReason: row.rejectionReason || 'Rejected by HMO during batch processing.',
          errorDetails: null,
          rawSanitized: row.rawSanitized,
        });
      }
    }

    // Determine next batch status
    const totalBatchSize = params.existingBatchItems.length;
    let nextBatchStatus: BatchStatus = 'partially_processed';
    if (confirmedRows + rejectedRows >= totalBatchSize && totalBatchSize > 0 && invalidRows === 0) {
      nextBatchStatus = 'reconciled';
    } else if (confirmedRows === 0 && rejectedRows === 0) {
      nextBatchStatus = 'awaiting_hmo_response';
    }

    return {
      summary: {
        totalRows: params.parsedRows.length,
        matchedRows,
        confirmedRows,
        rejectedRows,
        unmatchedRows,
        duplicateRows,
        invalidRows,
        nextBatchStatus,
      },
      results,
    };
  }
}

export const hmoExcelExchangeService = new HmoExcelExchangeService();

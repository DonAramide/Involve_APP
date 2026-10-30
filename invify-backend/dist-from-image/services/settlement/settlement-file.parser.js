"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementFileParser = void 0;
const XLSX = __importStar(require("xlsx"));
const settlement_template_registry_1 = require("./settlement-template.registry");
function normalizeHeader(value) {
    return String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s/]/g, '');
}
function normalizeId(value) {
    const raw = String(value ?? '').trim();
    if (!raw || raw === 'N/A' || raw === 'NA' || raw === '-')
        return null;
    return raw.replace(/\s+/g, '');
}
function normalizeRrn(value) {
    const id = normalizeId(value);
    if (!id)
        return null;
    if (/^\d+$/.test(id))
        return id.padStart(12, '0').slice(-12);
    return id.toUpperCase();
}
function normalizeStan(value) {
    const id = normalizeId(value);
    if (!id)
        return null;
    if (/^\d+$/.test(id))
        return id.padStart(6, '0').slice(-6);
    return id;
}
function normalizeTerminal(value) {
    const id = normalizeId(value);
    if (!id)
        return null;
    return id.toUpperCase();
}
function parseAmount(value) {
    if (value == null || value === '')
        return 0;
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    const cleaned = String(value).replace(/,/g, '').trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}
function pickField(row, headerIndex, aliases) {
    for (const alias of aliases) {
        const key = headerIndex[alias];
        if (key && row[key] != null && String(row[key]).trim() !== '') {
            return row[key];
        }
    }
    return null;
}
function buildHeaderIndex(headers) {
    const index = {};
    headers.forEach((header, colIdx) => {
        const normalized = normalizeHeader(header);
        if (!normalized)
            return;
        index[normalized] = `col_${colIdx}`;
    });
    return index;
}
function rowToObject(headers, cells) {
    const obj = {};
    headers.forEach((header, idx) => {
        obj[`col_${idx}`] = cells[idx] ?? null;
        obj[String(header ?? idx)] = cells[idx] ?? null;
    });
    return obj;
}
function isLikelyHeaderRow(cells) {
    const normalized = cells.map(normalizeHeader).filter(Boolean);
    if (normalized.length < 3)
        return false;
    const joined = normalized.join(' ');
    return (joined.includes('RRN') ||
        joined.includes('STAN') ||
        joined.includes('TERMINAL') ||
        joined.includes('TRANAMOUNT') ||
        joined.includes('RETRIEVAL') ||
        joined.includes('AMOUNT'));
}
class SettlementFileParser {
    static parseBuffer(buffer, templateType) {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName)
            return [];
        const sheet = workbook.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            raw: false,
            defval: null,
        });
        if (!matrix.length)
            return [];
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(matrix.length, 15); i++) {
            if (isLikelyHeaderRow(matrix[i] || [])) {
                headerRowIdx = i;
                break;
            }
        }
        const headers = matrix[headerRowIdx] || [];
        const headerIndex = buildHeaderIndex(headers);
        const aliases = settlement_template_registry_1.SETTLEMENT_COLUMN_ALIASES[templateType];
        const rows = [];
        for (let i = headerRowIdx + 1; i < matrix.length; i++) {
            const cells = matrix[i] || [];
            if (!cells.some((c) => c != null && String(c).trim() !== ''))
                continue;
            const rawRow = rowToObject(headers, cells);
            const amountRaw = pickField(rawRow, headerIndex, aliases.amount);
            const amount = parseAmount(amountRaw);
            const rrn = normalizeRrn(pickField(rawRow, headerIndex, aliases.rrn));
            const stan = normalizeStan(pickField(rawRow, headerIndex, aliases.stan));
            const terminalId = normalizeTerminal(pickField(rawRow, headerIndex, aliases.terminalId));
            if (!rrn && !stan && !terminalId && amount <= 0)
                continue;
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
exports.SettlementFileParser = SettlementFileParser;
//# sourceMappingURL=settlement-file.parser.js.map
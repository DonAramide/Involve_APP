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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalController = exports.terminalUploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const terminal_inventory_service_1 = require("../services/terminal-inventory.service");
const terminal_sync_service_1 = require("../services/terminal-sync.service");
const terminal_audit_service_1 = require("../services/terminal-audit.service");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.terminalUploadMiddleware = upload.array('files', 10);
function getAdminId(req) {
    return req.user?.email || req.user?.id || 'admin@invify.app';
}
function getIpAddress(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
}
function parseFileToRows(buffer, mimetype, originalName) {
    if (originalName.endsWith('.csv') || mimetype === 'text/csv' || mimetype === 'text/plain') {
        const text = buffer.toString('utf-8');
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length === 0)
            return [];
        const headers = lines[0].split(',').map(h => h.replace(/^\uFEFF/, '').trim().replace(/"/g, ''));
        return lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((h, i) => { row[h] = vals[i] || ''; });
            return row;
        });
    }
    else {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
}
function normalizeColumnNames(rows) {
    const columnMap = {
        'TERMINAL ID': 'terminalId', 'TERMINAL_ID': 'terminalId', 'terminal_id': 'terminalId', 'terminalId': 'terminalId', 'TerminalId': 'terminalId',
        'TERMINAL SN': 'posSerialNumber', 'TERMINAL_SN': 'posSerialNumber', 'pos_serial_number': 'posSerialNumber', 'POS_SERIAL_NUMBER': 'posSerialNumber', 'posSerialNumber': 'posSerialNumber',
        'AGGREGATOR': 'businessName', 'aggregator': 'businessName', 'business_name': 'businessName', 'BUSINESS_NAME': 'businessName', 'businessName': 'businessName', 'Business Name': 'businessName',
        'ACCOUNT NAME': 'accountName', 'ACCOUNT_NAME': 'accountName', 'accountName': 'accountName', 'account_name': 'accountName',
        'MOBILE NO': 'mobileNumber', 'MOBILE_NO': 'mobileNumber', 'mobileNumber': 'mobileNumber', 'mobile_number': 'mobileNumber', 'phone': 'mobileNumber',
        'MPOS TERMINAL': 'mposTerminalId', 'MPOS_TERMINAL': 'mposTerminalId', 'mposTerminalId': 'mposTerminalId', 'mpos_terminal_id': 'mposTerminalId',
        'TERMINAL TYPE': 'terminalType', 'TERMINAL_TYPE': 'terminalType', 'terminalType': 'terminalType', 'terminal_type': 'terminalType',
        'ACCOUNT NUMBER': 'accountNumber', 'ACCOUNT_NUMBER': 'accountNumber', 'accountNumber': 'accountNumber', 'account_number': 'accountNumber',
        'EMAIL': 'email', 'email': 'email',
    };
    return rows.map(row => {
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
            const mappedKey = columnMap[key] || columnMap[key.trim()] || key;
            normalized[mappedKey] = value;
        }
        return normalized;
    });
}
function handleError(res, error) {
    if (error.message?.includes('fetch failed') ||
        error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error.message?.includes('timeout') ||
        error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        process.env.OFFLINE_LOCAL_AUTH === 'true') {
        return res.status(503).json({
            error: 'Database unavailable',
            retryable: true,
            retryAfterMs: 2000
        });
    }
    return res.status(500).json({ error: error.message });
}
class TerminalController {
    // GET /api/admin/inventory/tablets
    static async getTablets(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.getTablets();
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // GET /api/admin/inventory/mpos
    static async getMpos(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.getMposDevices();
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // GET /api/admin/inventory/printers
    static async getPrinters(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.getPrinters();
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // GET /api/admin/inventory/tids
    static async getTids(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.getTerminalIds();
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // GET /api/admin/inventory/assignments
    static async getAssignments(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.getAssignments();
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // POST /api/admin/inventory/assignments
    static async assignHardware(req, res) {
        try {
            const assignment = await terminal_inventory_service_1.TerminalInventoryService.assignHardware(req.body);
            await terminal_audit_service_1.TerminalAuditService.log({
                actionType: 'ASSIGNED',
                adminId: getAdminId(req),
                ipAddress: getIpAddress(req),
                metadata: assignment
            });
            return res.status(200).json(assignment);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // POST /api/admin/inventory/assignments/:id/unassign
    static async unassignHardware(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.unassignHardware(req.params.id);
            await terminal_audit_service_1.TerminalAuditService.log({
                actionType: 'UNASSIGNED',
                adminId: getAdminId(req),
                ipAddress: getIpAddress(req),
                metadata: result
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // GET /api/terminals/stats (legacy path updated)
    static async getStats(req, res) {
        try {
            const stats = await terminal_inventory_service_1.TerminalInventoryService.getStats();
            return res.status(200).json(stats);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // POST /api/terminals/import
    static async importTerminals(req, res) {
        try {
            const files = req.files;
            if (!files || files.length === 0)
                return res.status(400).json({ error: 'No files uploaded' });
            const allResults = [];
            const batchId = `batch-${Date.now()}`;
            const adminId = getAdminId(req);
            for (const file of files) {
                const rawRows = parseFileToRows(file.buffer, file.mimetype, file.originalname);
                console.log('[DEBUG] rawRows:', JSON.stringify(rawRows));
                const normalizedRows = normalizeColumnNames(rawRows);
                console.log('[DEBUG] normalizedRows:', JSON.stringify(normalizedRows));
                const importType = req.body.importType || 'tablets';
                console.log('[DEBUG] importType:', importType);
                const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || req.user?.tenantId;
                const result = await terminal_inventory_service_1.TerminalInventoryService.bulkImportDecoupled(normalizedRows, batchId, adminId, importType, tenantId);
                console.log('[DEBUG] result:', JSON.stringify(result));
                allResults.push({ filename: file.originalname, ...result });
            }
            await terminal_audit_service_1.TerminalAuditService.log({
                actionType: 'BULK_IMPORT',
                adminId,
                reason: `Bulk import: ${files.map(f => f.originalname).join(', ')}`,
                ipAddress: getIpAddress(req),
                metadata: { batchId, files: files.map(f => f.originalname) }
            });
            const combined = allResults.reduce((acc, r) => ({
                total: acc.total + r.total,
                successful: acc.successful + r.successful,
                failed: acc.failed + r.failed,
                duplicates: acc.duplicates + (r.duplicates || 0),
                errors: [...acc.errors, ...r.errors],
                files: [...acc.files, { filename: r.filename, total: r.total, successful: r.successful, duplicates: r.duplicates || 0 }]
            }), { total: 0, successful: 0, failed: 0, duplicates: 0, errors: [], files: [] });
            return res.status(200).json({ batchId, ...combined });
        }
        catch (error) {
            console.error('[TerminalController] importTerminals error:', error);
            return handleError(res, error);
        }
    }
    // POST /api/mobile/terminal/sync
    static async mobileSync(req, res) {
        try {
            const { deviceId, enrollmentKey, serialNumber, androidId } = req.body;
            if (!deviceId)
                return res.status(400).json({ error: 'deviceId is required' });
            const tenantId = req.user?.tenantId || null;
            const result = await terminal_sync_service_1.TerminalSyncService.syncTerminalForDevice(deviceId, enrollmentKey, serialNumber, androidId, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            if (error.message === 'ACCESS_DENIED_OWNERSHIP_MISMATCH') {
                return res.status(403).json({ error: 'Access denied. You do not own this device.' });
            }
            return handleError(res, error);
        }
    }
    // POST /api/mobile/terminal/keyexchange-success
    static async keyExchangeSuccess(req, res) {
        try {
            const { deviceId } = req.body;
            if (!deviceId)
                return res.status(400).json({ error: 'deviceId is required' });
            const result = await terminal_sync_service_1.TerminalSyncService.recordKeyExchangeSuccess(deviceId);
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // GET /api/mobile/terminal/status
    static async mobileStatus(req, res) {
        try {
            const deviceId = req.query.deviceId;
            if (!deviceId)
                return res.status(400).json({ error: 'deviceId query parameter is required' });
            const result = await terminal_sync_service_1.TerminalSyncService.getTerminalStatus(deviceId);
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    // GET /api/terminals/audit
    static async getAuditLog(req, res) {
        try {
            const filters = {
                terminalId: req.query.terminalId,
                actionType: req.query.actionType,
                page: req.query.page || '1',
                limit: req.query.limit || '50'
            };
            const result = await terminal_audit_service_1.TerminalAuditService.getAuditLog(filters);
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    static async updateTablet(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.updateTablet(req.params.id, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    static async updateMpos(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.updateMpos(req.params.id, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    static async updatePrinter(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.updatePrinter(req.params.id, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
    static async updateTid(req, res) {
        try {
            const result = await terminal_inventory_service_1.TerminalInventoryService.updateTid(req.params.id, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            return handleError(res, error);
        }
    }
}
exports.TerminalController = TerminalController;
//# sourceMappingURL=terminal.controller.js.map
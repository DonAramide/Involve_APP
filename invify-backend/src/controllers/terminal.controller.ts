import { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { TerminalInventoryService } from '../services/terminal-inventory.service';
import { TerminalAssignmentService } from '../services/terminal-assignment.service';
import { TerminalSyncService } from '../services/terminal-sync.service';
import { TerminalAuditService } from '../services/terminal-audit.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const terminalUploadMiddleware = upload.array('files', 10);

function getAdminId(req: Request): string {
  return (req as any).user?.email || (req as any).user?.id || 'admin@invify.app';
}

function getIpAddress(req: Request): string {
  const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  const real = (req.headers['x-real-ip'] as string)?.trim();
  let ip = forwarded || real || req.ip || req.socket.remoteAddress || 'unknown';
  ip = ip.replace(/^::ffff:/, '');
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}

function parseFileToRows(buffer: Buffer, mimetype: string, originalName: string): any[] {
  if (originalName.endsWith('.csv') || mimetype === 'text/csv' || mimetype === 'text/plain') {
    const text = buffer.toString('utf-8');
    // Handle both Windows (\r\n) and Unix (\n) line endings
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];
    // Strip BOM, tabs, carriage returns, and quotes from headers
    const headers = lines[0].split(',').map(h =>
      h.replace(/^\uFEFF/, '').replace(/\t/g, '').trim().replace(/"/g, '').replace(/\r/g, '')
    );
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.replace(/\t/g, '').trim().replace(/"/g, '').replace(/\r/g, ''));
      const row: any = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    });
  } else {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
}

function normalizeColumnNames(rows: any[]): any[] {
  const columnMap: Record<string, string> = {
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
    const normalized: any = {};
    for (const [key, value] of Object.entries(row)) {
      const trimmedKey = String(key).replace(/\t/g, '').trim();
      const mappedKey = columnMap[key] || columnMap[trimmedKey] || trimmedKey;
      normalized[mappedKey] = typeof value === 'string' ? value.replace(/\t/g, '').trim() : value;
    }
    return normalized;
  });
}

function handleError(res: Response, error: any) {
  if (
    error.message?.includes('fetch failed') ||
    error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    error.message?.includes('timeout') ||
    error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    process.env.OFFLINE_LOCAL_AUTH === 'true'
  ) {
    return res.status(503).json({
      error: 'Database unavailable',
      retryable: true,
      retryAfterMs: 2000
    });
  }
  return res.status(500).json({ error: error.message });
}

export class TerminalController {

  // GET /api/admin/inventory/tablets
  static async getTablets(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.getTablets();
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // GET /api/admin/inventory/mpos
  static async getMpos(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.getMposDevices();
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // GET /api/admin/inventory/printers
  static async getPrinters(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.getPrinters();
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // GET /api/admin/inventory/tids
  static async getTids(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.getTerminalIds();
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // GET /api/admin/inventory/assignments
  static async getAssignments(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.getAssignments();
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // POST /api/admin/inventory/assign
  static async assignHardware(req: Request, res: Response) {
    try {
      const assignment = await TerminalInventoryService.assignHardware(req.body);
      
      await TerminalAuditService.log({
        actionType: 'ASSIGNED',
        adminId: getAdminId(req),
        ipAddress: getIpAddress(req),
        metadata: assignment
      });

      return res.status(200).json(assignment);
    } catch (error: any) {
      const msg = error?.message || 'Assign failed';
      if (
        /required|not found|already assigned|Unassign first|duplicate key|unique constraint/i.test(msg)
      ) {
        return res.status(400).json({ error: msg });
      }
      return handleError(res, error);
    }
  }

  // POST /api/admin/inventory/assignments/:id/unassign
  static async unassignHardware(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.unassignHardware(req.params.id);
      
      await TerminalAuditService.log({
        actionType: 'UNASSIGNED',
        adminId: getAdminId(req),
        ipAddress: getIpAddress(req),
        metadata: result
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // GET /api/terminals/stats (legacy path updated)
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await TerminalInventoryService.getStats();
      return res.status(200).json(stats);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // POST /api/terminals/import
  static async importTerminals(req: Request, res: Response) {
    try {
      const files = (req as any).files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

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
        const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
        const result = await TerminalInventoryService.bulkImportDecoupled(normalizedRows, batchId, adminId, importType, tenantId);
        console.log('[DEBUG] result:', JSON.stringify(result));
        allResults.push({ filename: file.originalname, ...result });
      }

      await TerminalAuditService.log({
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
      }), { total: 0, successful: 0, failed: 0, duplicates: 0, errors: [], files: [] } as any);

      return res.status(200).json({ batchId, ...combined });
    } catch (error: any) {
      console.error('[TerminalController] importTerminals error:', error);
      return handleError(res, error);
    }
  }

  // POST /api/mobile/terminal/sync
  static async mobileSync(req: Request, res: Response) {
    try {
      const { deviceId, enrollmentKey, serialNumber, androidId } = req.body;
      if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
      const tenantId = (req as any).user?.tenantId || null;
      const result = await TerminalSyncService.syncTerminalForDevice(deviceId, enrollmentKey, serialNumber, androidId, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'ACCESS_DENIED_OWNERSHIP_MISMATCH') {
        return res.status(403).json({ error: 'Access denied. You do not own this device.' });
      }
      return handleError(res, error);
    }
  }

  // POST /api/mobile/terminal/keyexchange-success
  static async keyExchangeSuccess(req: Request, res: Response) {
    try {
      const { deviceId } = req.body;
      if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
      const result = await TerminalSyncService.recordKeyExchangeSuccess(deviceId);
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // GET /api/mobile/terminal/status
  static async mobileStatus(req: Request, res: Response) {
    try {
      const deviceId = req.query.deviceId as string;
      if (!deviceId) return res.status(400).json({ error: 'deviceId query parameter is required' });
      const result = await TerminalSyncService.getTerminalStatus(deviceId);
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  // GET /api/terminals/audit
  static async getAuditLog(req: Request, res: Response) {
    try {
      const filters = {
        terminalId: req.query.terminalId as string,
        actionType: req.query.actionType as string,
        page: req.query.page as string || '1',
        limit: req.query.limit as string || '50'
      };
      const result = await TerminalAuditService.getAuditLog(filters);
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  static async updateTablet(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.updateTablet(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  static async updateMpos(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.updateMpos(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  static async updatePrinter(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.updatePrinter(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }

  static async updateTid(req: Request, res: Response) {
    try {
      const result = await TerminalInventoryService.updateTid(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      return handleError(res, error);
    }
  }
}

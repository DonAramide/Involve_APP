import { Request, Response } from 'express';
export declare class AuditController {
    /**
     * GET /api/admin/audit-logs
     * Tenant-scoped system audit (financial + terminal + device + governance).
     */
    static getSystemAuditLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTransactionLedger(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

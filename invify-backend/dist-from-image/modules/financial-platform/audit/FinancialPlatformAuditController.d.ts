import { Request, Response } from 'express';
import { FinancialPlatformAuditService } from './FinancialPlatformAuditService';
export declare class FinancialPlatformAuditController {
    private auditService;
    constructor(auditService: FinancialPlatformAuditService);
    /**
     * GET /api/v1/tenants/:id/financial-platform/audit
     */
    getAuditLog(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

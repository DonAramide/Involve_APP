import { Request, Response } from 'express';
import { FinancialPlatformHealthService } from './FinancialPlatformHealthService';
export declare class FinancialPlatformHealthController {
    private healthService;
    constructor(healthService: FinancialPlatformHealthService);
    /**
     * GET /api/v1/tenants/:id/financial-platform/health
     */
    getHealth(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

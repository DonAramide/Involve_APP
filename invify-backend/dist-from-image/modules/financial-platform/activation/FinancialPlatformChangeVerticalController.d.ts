import { Request, Response } from 'express';
import { FinancialPlatformChangeVerticalService } from './FinancialPlatformChangeVerticalService';
export declare class FinancialPlatformChangeVerticalController {
    private changeVerticalService;
    constructor(changeVerticalService: FinancialPlatformChangeVerticalService);
    /**
     * POST /api/v1/tenants/:id/financial-platform/change-vertical
     * Body: { type: 'school'|'retail'|'services', confirmPhrase: 'CHANGE VERTICAL', reason?: string }
     */
    changeVertical(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

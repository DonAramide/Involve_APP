import { Request, Response } from 'express';
import { FinancialPlatformRotationService } from './FinancialPlatformRotationService';
export declare class FinancialPlatformRotationController {
    private rotationService;
    constructor(rotationService: FinancialPlatformRotationService);
    /**
     * POST /api/v1/tenants/:id/financial-platform/rotate
     */
    rotate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

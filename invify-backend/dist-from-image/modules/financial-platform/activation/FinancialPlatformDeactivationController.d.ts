import { Request, Response } from 'express';
import { FinancialPlatformDeactivationService } from './FinancialPlatformDeactivationService';
export declare class FinancialPlatformDeactivationController {
    private deactivationService;
    constructor(deactivationService: FinancialPlatformDeactivationService);
    deactivate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

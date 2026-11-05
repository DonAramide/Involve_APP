import { Request, Response } from 'express';
import { FinancialPlatformActivationService } from './FinancialPlatformActivationService';
export declare class FinancialPlatformActivationController {
    private activationService;
    constructor(activationService: FinancialPlatformActivationService);
    getGate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordCheck(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    propose(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    reject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/v1/tenants/:id/financial-platform/activate
     * Checker-only after CAC / phone-call / address manual checks.
     */
    activate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

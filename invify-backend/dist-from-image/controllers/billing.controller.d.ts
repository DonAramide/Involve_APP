import { Request, Response } from 'express';
export declare class BillingController {
    /**
     * GET /billing/status
     */
    static getStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /billing/subscribe
     * Initiates payment for a subscription plan.
     */
    static subscribe(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

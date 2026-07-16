import { Request, Response } from 'express';
export declare class PayoutController {
    /**
     * GET /api/payout/settings
     * Fetches the saved bank details for the current tenant.
     */
    static getSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/payout/settings
     * Upserts bank details for the current tenant.
     */
    static saveSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/payout/history
     * Fetches the history of fund sweeps for the school.
     */
    static getHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/payout/withdraw
     * Triggers a fund sweep (withdrawal) to the saved bank account.
     */
    static withdraw(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

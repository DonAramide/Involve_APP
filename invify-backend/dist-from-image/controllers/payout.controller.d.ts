import { Request, Response } from 'express';
export declare class PayoutController {
    private static getLocalSettingsPath;
    private static getLocalTenantSettings;
    private static saveLocalTenantSettings;
    /**
     * GET /api/payout/settings
     */
    static getSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/payout/settings
     */
    static saveSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/payout/history
     */
    static getHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/payout/withdraw
     */
    static withdraw(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static quote(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/payout/banks
     */
    static getBanks(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/payout/resolve-account
     */
    static resolveAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

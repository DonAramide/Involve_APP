import { Request, Response } from 'express';
export declare class WalletController {
    /**
     * GET /wallet
     * Returns current balance for the authenticated tenant.
     */
    static getBalance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /wallet/transactions
     * Returns transaction history for the authenticated tenant.
     */
    static getTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

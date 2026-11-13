import { Request, Response } from 'express';
export declare class DefaultersController {
    /**
     * GET /api/finance/defaulters
     * Returns a list of students with outstanding balances.
     */
    static getDefaulters(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/finance/defaulters/remind
     * Sends a payment reminder (mocked).
     */
    static sendReminder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

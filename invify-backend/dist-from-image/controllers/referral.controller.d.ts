import { Request, Response } from 'express';
export declare class ReferralController {
    /**
     * GET /referrals/stats
     */
    static getStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /referrals/send
     */
    static sendInvite(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

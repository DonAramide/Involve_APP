import { Request, Response } from 'express';
export declare class AnalyticsController {
    /**
     * GET /admin/analytics
     * Comprehensive BI dashboard for Super Admins.
     */
    static getAdminAnalytics(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

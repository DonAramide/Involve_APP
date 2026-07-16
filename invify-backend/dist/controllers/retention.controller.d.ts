import { Request, Response } from 'express';
export declare class RetentionController {
    /**
     * POST /admin/retention/process
     * Manually trigger the retention scan and nudge dispatch.
     */
    static processRetention(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/retention/stats
     * Super-admin view of at-risk users.
     */
    static getAtRiskUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/retention/suggestion
     * Personal nudge for the current user.
     */
    static getPersonalSuggestion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

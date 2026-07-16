import { Request, Response } from 'express';
export declare class InsightsController {
    /**
     * GET /insights/class
     * Returns attendance & lesson insights for a specific class
     */
    static getClassInsights(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

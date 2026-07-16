import { Request, Response } from 'express';
export declare class LookupController {
    private static cachedData;
    private static cachedUpdatedAt;
    /**
     * GET /public/lookup
     * Returns all system lookup datasets.
     */
    static getLookup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/lookup
     * Saves updated system lookup datasets.
     */
    static saveLookup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

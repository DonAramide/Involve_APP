import { Request, Response } from 'express';
export declare class RuntimeController {
    /**
     * GET /api/v1/runtime/config
     * Returns the consolidated TenantRuntimeConfig for the authenticated user's tenant.
     */
    static getConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

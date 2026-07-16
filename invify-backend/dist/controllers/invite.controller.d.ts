import { Request, Response } from 'express';
export declare class InviteController {
    /**
     * POST /admin/invites
     * Sends a teacher invitation (Tenant Admin only).
     */
    static sendInvite(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /public/invites/validate/:token
     * Validates invitation for the landing page.
     */
    static validateInvite(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /public/invites/accept
     * Finalizes user activation after successfull Supabase signup.
     */
    static acceptInvite(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

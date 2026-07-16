import { Request, Response } from 'express';
export declare class UserController {
    /**
     * GET /admin/users
     * Scoped listing of users.
     */
    static listUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/users
     * Create a platform user. Note: Actual Auth Record must be in Supabase.
     */
    static createUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /admin/users/:id
     * Update role or status.
     */
    static updateUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listDevices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approveDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static blockDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static triggerArchiving(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

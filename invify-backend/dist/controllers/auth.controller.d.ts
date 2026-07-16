import { Request, Response } from 'express';
export declare class AuthController {
    /**
     * POST /api/auth/login
     * Authenticates user against Supabase Auth and checks password reset requirements.
     */
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/auth/reset-password
     * Sets a new password for the user and clears the require_password_reset flag.
     */
    static resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static sendWhatsappOtp(req: Request, res: Response): Promise<void>;
    static verifyWhatsappOtp(req: Request, res: Response): Promise<void>;
}

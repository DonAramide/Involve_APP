import { Request, Response } from 'express';
export declare class AuthController {
    /**
     * POST /api/auth/login
     * Authenticates user against Supabase Auth and checks password reset requirements.
     */
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/auth/reset-password
     *
     * Supported payloads:
     * 1) { userId, newPassword } — authenticated / forced first-login reset
     * 2) { email, code|otp, newPassword } — OTP password recovery (PASSWORD_RESET)
     */
    static resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/auth/change-password
     * Authenticated user sets a new password after proving the current one.
     */
    static changePassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static sendWhatsappOtp(req: Request, res: Response): Promise<void>;
    static verifyWhatsappOtp(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/auth/mfa/setup
     * Generates TOTP secret and QR code URL for setup.
     */
    static mfaSetup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/auth/mfa/verify
     * Verifies OTP code and activates MFA if setup. Returns the cached session.
     */
    static mfaVerify(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/auth/refresh
     * Thin facade over Supabase Auth refresh-token rotation. Does not mint custom JWTs.
     */
    static refresh(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/auth/logout
     * Best-effort Supabase session revocation, then always succeeds so the client can clear storage.
     */
    static logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

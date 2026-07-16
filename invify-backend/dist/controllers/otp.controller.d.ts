import { Request, Response } from 'express';
export declare class OTPController {
    /**
     * POST /public/otp/send
     * Triggers an OTP send via WhatsApp.
     */
    static sendOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /public/otp/verify
     * Validates the provided code.
     */
    static verifyOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

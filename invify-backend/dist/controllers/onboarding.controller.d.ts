import { Request, Response } from 'express';
export declare class OnboardingController {
    /**
     * POST /public/onboarding/signup
     * Legacy backward-compatible endpoint.
     */
    static signup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /public/onboarding/provision
     * High-Grade Atomic Provisioning Engine for enterprise customers.
     */
    static provision(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /auth/send-email-otp
     */
    static sendEmailOtp(req: Request, res: Response): Promise<void>;
    /**
     * POST /auth/verify-email-otp
     */
    static verifyEmailOtp(req: Request, res: Response): Promise<void>;
    /**
     * POST /auth/send-whatsapp-otp
     */
    static sendWhatsappOtp(req: Request, res: Response): Promise<void>;
    /**
     * POST /auth/verify-whatsapp-otp
     */
    static verifyWhatsappOtp(req: Request, res: Response): Promise<void>;
    /**
     * POST /auth/register
     * Registers a new user and provisions their tenant in tenants_db.json (staging) or Supabase (live).
     */
    static register(req: Request, res: Response): Promise<void>;
    /**
     * POST /auth/generate-link-qr
     * Called by the EXISTING device in Admin Hub to generate a QR code payload
     * that a NEW device can scan to link itself to the same tenant.
     * The QR payload is a short-lived token stored in Supabase (3 minutes TTL).
     */
    static generateDeviceLinkQr(req: Request, res: Response): Promise<void>;
    /**
     * POST /auth/link-device
     * Called by the NEW device after scanning the QR code.
     * Registers the new device as a 3-day trial device on the same tenant.
     */
    static linkDevice(req: Request, res: Response): Promise<void>;
    /**
     * POST /public/onboarding/report-issue
     * Handle provisioning failure reports from the frontend
     */
    static reportIssue(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}

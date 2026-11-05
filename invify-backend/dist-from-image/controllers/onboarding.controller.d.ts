import { Request, Response } from 'express';
import { EmailDeviceResolution } from '../utils/device-identity';
/**
 * Non-expiring device JWT for a tablet linked by QR. Signed as the tenant
 * owner when one exists so API calls resolve to that owner's profile.
 */
export declare function signLinkedDeviceToken(tenantId: string, deviceId: string): Promise<string | null>;
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
    static provision(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Helper to check if an email already exists in users, tenants (owner_email), or local users_db.json
     */
    static isEmailExisting(email: string): Promise<boolean>;
    /**
     * Resolve whether an email is already taken, and whether this physical device
     * is already the device linked to that account (reinstall / re-onboarding).
     */
    static resolveEmailAgainstDevice(email: string, deviceId?: string | null): Promise<EmailDeviceResolution>;
    /**
     * GET/POST /auth/check-email and /api/auth/check-email
     */
    static checkEmail(req: Request, res: Response): Promise<void>;
    /**
     * GET/POST /auth/check-agent-code and /api/auth/check-agent-code
     * Public lookup used during tablet onboarding.
     */
    static checkAgentCode(req: Request, res: Response): Promise<void>;
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
     * POST /api/tenant/devices/link-qr
     * Tenant web portal: generate the same LINK_DEVICE QR without the old tablet.
     * Tenant id comes from the session, not the request body.
     */
    static generateAuthenticatedDeviceLinkQr(req: Request, res: Response): Promise<void>;
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

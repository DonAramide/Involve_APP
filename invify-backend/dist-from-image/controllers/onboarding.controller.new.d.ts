import { Request, Response } from 'express';
export declare class OnboardingController {
    static sendEmailOtp(req: Request, res: Response): Promise<void>;
    static verifyEmailOtp(req: Request, res: Response): Promise<void>;
    static sendWhatsappOtp(req: Request, res: Response): Promise<void>;
    static verifyWhatsappOtp(req: Request, res: Response): Promise<void>;
    static register(req: Request, res: Response): Promise<void>;
}

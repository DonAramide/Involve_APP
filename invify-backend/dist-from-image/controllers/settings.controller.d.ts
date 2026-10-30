import { Request, Response } from 'express';
export declare class SettingsController {
    static getOnboardingSettings(req: Request, res: Response): Promise<void>;
    static updateOnboardingSettings(req: Request, res: Response): Promise<void>;
}

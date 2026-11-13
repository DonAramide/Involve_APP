import { Request, Response } from 'express';
export declare class SettingsController {
    static updateSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

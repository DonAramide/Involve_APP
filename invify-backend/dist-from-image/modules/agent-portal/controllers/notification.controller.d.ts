import { Request, Response } from 'express';
export declare class NotificationController {
    static list(req: Request, res: Response): Promise<void>;
    static markRead(req: Request, res: Response): Promise<void>;
}

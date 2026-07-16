import { Request, Response } from 'express';
export declare class NotificationController {
    /**
     * GET /api/notifications
     * Fetches latest notifications for the user.
     */
    static getNotifications(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/notifications/:id/read
     * Marks a notification as read.
     */
    static markAsRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/notifications/read-all
     * Marks all notifications as read for the user.
     */
    static markAllAsRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

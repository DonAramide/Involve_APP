// src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

export class NotificationController {
  /**
   * GET /api/notifications
   * Fetches latest notifications for the user.
   */
  static async getNotifications(req: Request, res: Response) {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[NotificationController] Fetch Error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  /**
   * POST /api/notifications/:id/read
   * Marks a notification as read.
   */
  static async markAsRead(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  }

  /**
   * POST /api/notifications/read-all
   * Marks all notifications as read for the user.
   */
  static async markAllAsRead(req: Request, res: Response) {
    const userId = (req as any).user?.id;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update notifications' });
    }
  }
}

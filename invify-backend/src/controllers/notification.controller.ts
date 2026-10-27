// src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { TenantAlertService } from '../services/tenant-alert.service';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';

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

      if (error) {
        console.warn('[NotificationController] Fetch Error:', error.message);
        return res.status(200).json([]);
      }

      return res.status(200).json(data || []);
    } catch (error: any) {
      console.warn('[NotificationController] Fetch Error:', error?.message || error);
      return res.status(200).json([]);
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

  static async getPreferences(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const prefs = await TenantAlertService.getPrefs(tenantId);
      return res.status(200).json({ success: true, prefs });
    } catch (err: any) {
      return res.status(err?.status || 500).json({ error: err?.message || 'Failed to load preferences' });
    }
  }

  static async savePreferences(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const prefs = await TenantAlertService.savePrefs(tenantId, req.body?.prefs || req.body || {});
      const userEmail = String((req as any).user?.email || '').trim();
      if (userEmail.includes('@')) {
        const { emailService } = require('../services/email.service');
        void emailService.sendTenantAlertEmail(userEmail, {
          name: (req as any).user?.name || userEmail.split('@')[0],
          title: 'Notification preferences saved',
          body: 'Your tenant alert preferences were saved. You will get email for the events you enabled (sales, withdrawals, low balance, and security).',
        });
      }
      return res.status(200).json({ success: true, prefs });
    } catch (err: any) {
      return res.status(err?.status || 500).json({ error: err?.message || 'Failed to save preferences' });
    }
  }
}

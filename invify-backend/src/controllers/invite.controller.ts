// src/controllers/invite.controller.ts
import { Request, Response } from 'express';
import { InviteService, NotificationService } from '../services/invite.service';
import { supabase } from '../db/supabase';

export class InviteController {
  /**
   * POST /admin/invites
   * Sends a teacher invitation (Tenant Admin only).
   */
  static async sendInvite(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const { tenantId } = (req as any).user;

      if (!email) return res.status(400).json({ error: 'Email is required' });

      // 1. Create Invite record (Role is now internally enforced as 'staff')
      const { invite, rawToken, isNew } = await InviteService.createInvite(tenantId, email);

      // 2. Fetch School Name for email
      const { data: tenant } = await supabase.from('tenants').select('name').eq('id', tenantId).single();

      // 3. Generate Link & Send Notification
      const appUrl = process.env.APP_URL || 'http://localhost:9000';
      const inviteLink = `${appUrl}/#/invite/accept?token=${rawToken || 'ALREADY_SENT'}`;

      if (isNew && rawToken) {
        await NotificationService.sendInviteEmail(email, tenant?.name || 'Invify School', inviteLink);
      }

      return res.status(201).json({
        message: isNew ? 'Invite sent successfully' : 'Active invite already exists',
        inviteLink: process.env.NODE_ENV === 'development' ? inviteLink : undefined // Dev-only leak
      });
    } catch (error: any) {
      console.error('[InviteController] sendInvite Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /public/invites/validate/:token
   * Validates invitation for the landing page.
   */
  static async validateInvite(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const invite = await InviteService.validateToken(token);
      
      return res.status(200).json({
        email: invite.email,
        schoolName: (invite as any).tenants.name,
        role: invite.role
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /public/invites/accept
   * Finalizes user activation after successfull Supabase signup.
   */
  static async acceptInvite(req: Request, res: Response) {
    try {
      const { token, userId, password } = req.body;

      // 1. Validate Token
      const invite = await InviteService.validateToken(token);

      // 2. Atomically Create User record and consume invite
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          tenant_id: invite.tenant_id,
          name: invite.email.split('@')[0], // Default name from email
          email: invite.email,
          role: invite.role
        });

      if (userError) throw userError;

      // 3. Mark Invite as Accepted
      await supabase
        .from('invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      return res.status(200).json({ message: 'Account activated successfully' });
    } catch (error: any) {
      console.error('[InviteController] acceptInvite Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}

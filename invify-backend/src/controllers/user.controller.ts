// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

export class UserController {
  /**
   * GET /admin/users
   * Scoped listing of users.
   */
  static async listUsers(req: Request, res: Response) {
    try {
      const { role, tenantId } = (req as any).user;
      
      let query = supabase.from('users').select(`
        *,
        tenants (name)
      `);

      // 1. Isolation Rule
      if (role !== 'super_admin') {
        // Tenant Admins only see their users
        query = query.eq('tenant_id', tenantId);
      } else if (req.query.tenantId) {
        // Super Admins can filter by tenant
        query = query.eq('tenant_id', req.query.tenantId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[UserController] listUsers Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/users
   * Create a platform user. Note: Actual Auth Record must be in Supabase.
   */
  static async createUser(req: Request, res: Response) {
    try {
      const { id, name, email, role, tenantId } = req.body;
      const currentUser = (req as any).user;

      // 1. Validation
      if (currentUser.role !== 'super_admin' && tenantId !== currentUser.tenantId) {
        return res.status(403).json({ error: 'Cannot create users for other tenants' });
      }

      const { data, error } = await supabase
        .from('users')
        .insert({
          id,
          name,
          email,
          role,
          tenant_id: role === 'super_admin' ? null : tenantId,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error: any) {
      console.error('[UserController] createUser Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /admin/users/:id
   * Update role or status.
   */
  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const currentUser = (req as any).user;

      // Ensure no tenant-override if not super_admin
      if (currentUser.role !== 'super_admin') {
        delete updates.tenant_id;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[UserController] updateUser Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}

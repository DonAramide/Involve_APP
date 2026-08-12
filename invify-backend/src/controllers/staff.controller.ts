// invify-backend/src/controllers/staff.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../db/supabase';
import { AuditService } from '../services/audit.service';
import { PaymentService } from '../services/payment.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toStableUuid(tenantId: string, raw: string): string {
  const key = String(raw || '').trim();
  if (UUID_RE.test(key)) return key.toLowerCase();
  const hash = crypto
    .createHash('sha1')
    .update(`invify-staff:${tenantId}:${key || crypto.randomUUID()}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function ddlInject(sql: string): string {
  return `select 1) t; ${sql}; SELECT json_build_object('ok', true) as val --`;
}

/**
 * POS staff roster synced from Flutter (incl. personal salary bank).
 * Separate from Quasar collection VAs on users.virtual_account_*.
 */
export class StaffController {
  private static tablesReady = false;

  private static async ensureTables(): Promise<void> {
    if (this.tablesReady) return;

    const ddl = `
      CREATE TABLE IF NOT EXISTS public.tenant_staff (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        staff_id TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'STAFF',
        is_active BOOLEAN NOT NULL DEFAULT true,
        bank_name TEXT,
        bank_code TEXT,
        account_number TEXT,
        account_name TEXT,
        virtual_account_number TEXT,
        virtual_account_bank TEXT,
        virtual_account_name TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_tenant_staff_tenant
        ON public.tenant_staff (tenant_id);
    `;

    try {
      const { error } = await supabaseAdmin.rpc('execute_sql', {
        query_text: ddlInject(ddl),
      });
      if (error) {
        console.warn('[StaffController] ensureTables execute_sql:', error.message);
      } else {
        this.tablesReady = true;
      }
    } catch (e: any) {
      console.warn('[StaffController] ensureTables failed:', e?.message || e);
    }
  }

  /**
   * POST /api/staff/bulk-sync
   * Body: { staff: [...] } from Flutter Web Sync / staff save.
   */
  static async bulkSync(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      await StaffController.ensureTables();

      const staffList = Array.isArray(req.body?.staff) ? req.body.staff : [];
      let synced = 0;
      const errors: string[] = [];

      for (const raw of staffList) {
        try {
          const syncKey =
            raw.syncId || raw.id || raw.staffId || `${raw.name}-${raw.phone || ''}`;
          const id = toStableUuid(String(tenantId), String(syncKey));

          const bankName =
            raw.bankName ||
            raw.bank_name ||
            raw.virtualBankName ||
            raw.virtual_bank_name ||
            null;
          const bankCode = raw.bankCode || raw.bank_code || null;
          const accountNumber =
            raw.accountNumber ||
            raw.account_number ||
            raw.virtualAccountNumber ||
            raw.virtual_account_number ||
            null;
          const accountName =
            raw.accountName ||
            raw.account_name ||
            raw.virtualAccountName ||
            raw.virtual_account_name ||
            null;

          const row = {
            id,
            tenant_id: String(tenantId),
            name: String(raw.name || 'Staff').trim() || 'Staff',
            staff_id: raw.staffId || raw.staff_id || null,
            phone: raw.phone || null,
            role: String(raw.role || 'STAFF').toUpperCase(),
            is_active: raw.isActive !== false && raw.is_active !== false && !raw.isDeleted,
            bank_name: bankName,
            bank_code: bankCode,
            account_number: accountNumber,
            account_name: accountName,
            // Keep optional Quasar VA snapshot if sent under distinct keys later
            virtual_account_number: raw.collectionAccountNumber || null,
            virtual_account_bank: raw.collectionBankName || null,
            virtual_account_name: raw.collectionAccountName || null,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };

          const { error } = await supabaseAdmin.from('tenant_staff').upsert(row, {
            onConflict: 'id',
          });
          if (error) {
            errors.push(`${row.name}: ${error.message}`);
          } else {
            synced += 1;
          }
        } catch (e: any) {
          errors.push(e?.message || String(e));
        }
      }

      await AuditService.log({
        eventType: 'staff.bulk_sync' as any,
        reference: `staff-sync-${Date.now()}`,
        tenantId: String(tenantId),
        payload: { synced, errors: errors.length },
      });

      return res.status(200).json({ success: true, synced, errors });
    } catch (error: any) {
      console.error('[StaffController] bulkSync error:', error.message);
      return res.status(500).json({ error: error.message || 'Staff sync failed' });
    }
  }

  /**
   * GET /api/staff
   * List synced POS staff for tenant admin.
   */
  static async list(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) ||
        (req as any).user?.tenantId ||
        (req.query.tenantId as string);
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      await StaffController.ensureTables();

      const { data, error } = await supabaseAdmin
        .from('tenant_staff')
        .select('*')
        .eq('tenant_id', String(tenantId))
        .order('name', { ascending: true });

      if (error) throw error;

      const staff = (data || []).map((row: any) => ({
        id: row.id,
        syncId: row.id,
        name: row.name,
        staffId: row.staff_id,
        phone: row.phone,
        role: row.role,
        status: row.is_active ? 'ACTIVE' : 'SUSPENDED',
        isActive: row.is_active,
        bankName: row.bank_name,
        bankCode: row.bank_code,
        accountNumber: row.account_number,
        accountName: row.account_name,
        updatedAt: row.updated_at,
      }));

      return res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      console.error('[StaffController] list error:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to list staff' });
    }
  }

  /**
   * POST /api/staff/:id/pay-salary
   * Debit tenant wallet and transfer to staff personal bank.
   */
  static async paySalary(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      const staffId = req.params.id;
      const amount = Number(req.body?.amount);
      if (!staffId) {
        return res.status(400).json({ error: 'Staff id required' });
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid salary amount required' });
      }

      await StaffController.ensureTables();

      const { data: staff, error } = await supabaseAdmin
        .from('tenant_staff')
        .select('*')
        .eq('tenant_id', String(tenantId))
        .eq('id', staffId)
        .maybeSingle();

      if (error) throw error;
      if (!staff) {
        return res.status(404).json({ error: 'Staff not found. Sync staff from the POS app first.' });
      }

      const destination = {
        account_number:
          req.body?.account_number || staff.account_number || '',
        bank_code: req.body?.bank_code || staff.bank_code || '',
        account_name: req.body?.account_name || staff.account_name || staff.name || '',
        bank_name: req.body?.bank_name || staff.bank_name || '',
      };

      if (!destination.account_number || !destination.bank_code || !destination.account_name) {
        return res.status(400).json({
          error:
            'Staff bank incomplete. Need account number, bank code, and account name before paying salary.',
        });
      }

      // Persist bank_code if admin supplied it during pay
      if (req.body?.bank_code && req.body.bank_code !== staff.bank_code) {
        await supabaseAdmin
          .from('tenant_staff')
          .update({
            bank_code: destination.bank_code,
            bank_name: destination.bank_name || staff.bank_name,
            account_name: destination.account_name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', staffId)
          .eq('tenant_id', String(tenantId));
      }

      const result = await PaymentService.createPayout(String(tenantId), amount, {
        destination,
        metadata: {
          type: 'staff_salary',
          staffId: staff.id,
          staffName: staff.name,
          staffHumanId: staff.staff_id,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Salary payout initiated for ${staff.name}`,
        reference: result.reference,
        status: result.status,
        staff: {
          id: staff.id,
          name: staff.name,
          accountNumber: destination.account_number,
          bankName: destination.bank_name,
        },
      });
    } catch (error: any) {
      console.error('[StaffController] paySalary error:', error.message);
      return res.status(400).json({ error: error.message || 'Salary payout failed' });
    }
  }
}

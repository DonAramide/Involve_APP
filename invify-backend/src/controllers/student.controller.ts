// invify-backend/src/controllers/student.controller.ts
import { Request, Response } from 'express';
import { StudentService } from '../services/student.service';
import { getQuasarService } from '../integrations/quasar/factory';
import { AuditService } from '../services/audit.service';
import { supabaseAdmin } from '../db/supabase';
import { isUuid, toQuasarChildUuid } from '../integrations/quasar/quasar-child-id';

export class StudentController {
  /**
   * GET /api/finance/virtual-account/:studentId
   * Provisions or retrieves a student's virtual account.
   */
  static async getVirtualAccount(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;

      if (!studentId) {
        return res.status(400).json({ error: "Student ID is required" });
      }

      if (!tenantId) {
        return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      }

      const virtualAccount = await StudentService.getOrCreateVirtualAccount(studentId, tenantId);
      
      return res.status(200).json(virtualAccount);
    } catch (error: any) {
      console.error('[StudentController] getVirtualAccount Error:', error.message);
      return res.status(500).json({ error: "Failed to provision virtual account" });
    }
  }

  /**
   * POST /api/finance/student-virtual-account/:studentId
   * Provisions a dedicated student VA via Quasar (same pattern as staff/customer).
   * Works for local school-mode students that may not yet exist in cloud `students`.
   *
   * Quasar requires `{childId}` to be a UUID. Local apps often send `stu-{admission}`.
   * We map that to a stable UUID for Quasar while keeping the external key for Invify rows.
   */
  static async provisionStudentVirtualAccount(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      const { firstName, lastName, admissionNumber, phone, email } = req.body || {};

      if (!studentId) return res.status(400).json({ error: 'Student ID is required' });
      if (!tenantId) return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });

      const first = String(firstName || '').trim() || 'Student';
      const last = String(lastName || '').trim() || String(admissionNumber || studentId).trim() || 'Learner';
      const admission = String(admissionNumber || studentId).trim();
      const fullName = `${first} ${last}`.trim();
      const fallbackEmail =
        (email && String(email).trim()) ||
        `${admission.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'student'}@invify.edu`;

      // Quasar path param must be UUID; keep external key for CRM / webhook school matching.
      const externalKey = String(studentId).trim();
      const quasarChildId = toQuasarChildUuid(tenantId, externalKey);
      const invifyCustomerId = isUuid(externalKey)
        ? externalKey
        : externalKey.startsWith('stu-')
          ? externalKey
          : `stu-${admission.replace(/\s+/g, '') || externalKey}`;

      console.log(
        `[StudentController] Provision VA externalKey=${externalKey} quasarChildId=${quasarChildId}`,
      );

      // Return existing VA if already provisioned (by external key, Quasar UUID, or admission)
      const { data: existingByExt } = await supabaseAdmin
        .from('customers')
        .select('virtual_account_number, virtual_account_bank, virtual_account_name, name')
        .eq('id', invifyCustomerId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingByExt?.virtual_account_number) {
        return res.status(200).json({
          accountNumber: existingByExt.virtual_account_number,
          bankName: existingByExt.virtual_account_bank || 'Quasar Sandbox Bank',
          accountName: existingByExt.virtual_account_name || existingByExt.name || fullName,
        });
      }

      if (quasarChildId !== invifyCustomerId) {
        const { data: existingByUuid } = await supabaseAdmin
          .from('customers')
          .select('virtual_account_number, virtual_account_bank, virtual_account_name, name')
          .eq('id', quasarChildId)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        if (existingByUuid?.virtual_account_number) {
          return res.status(200).json({
            accountNumber: existingByUuid.virtual_account_number,
            bankName: existingByUuid.virtual_account_bank || 'Quasar Sandbox Bank',
            accountName: existingByUuid.virtual_account_name || existingByUuid.name || fullName,
          });
        }
      }

      const { data: existingStudent } = await supabaseAdmin
        .from('students')
        .select('virtual_account_number, virtual_account_bank, first_name, last_name')
        .or(`id.eq.${invifyCustomerId},id.eq.${quasarChildId},admission_number.eq.${admission}`)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingStudent?.virtual_account_number) {
        return res.status(200).json({
          accountNumber: existingStudent.virtual_account_number,
          bankName: existingStudent.virtual_account_bank || 'Quasar Sandbox Bank',
          accountName: `${existingStudent.first_name || first} ${existingStudent.last_name || last}`.trim(),
        });
      }

      const quasar = await getQuasarService(tenantId);
      const reference = `VA-STU-${quasarChildId.substring(0, 8)}-${Date.now()}`;

      const quasarAccount = await quasar.createVirtualAccount({
        childId: quasarChildId,
        parentId: tenantId,
        email: fallbackEmail,
        firstName: first,
        lastName: last,
        parentShareBps: 0,
        metadata: {
          type: 'student_account',
          tenantId,
          admissionNumber: admission,
          phone: phone || undefined,
          source: 'school_student_provisioning',
          externalStudentKey: externalKey,
          invifyCustomerId,
        },
      });

      const accountNumber = quasarAccount.accountNumber;
      const bankName = quasarAccount.bankName;
      const accountName = (quasarAccount as any).accountName || fullName;

      // Prefer UUID row for students table (often uuid-typed); keep stu- key on customers for webhooks.
      const studentRow = {
        id: quasarChildId,
        school_id: tenantId,
        tenant_id: tenantId,
        first_name: first,
        last_name: last,
        admission_number: admission,
        virtual_account_number: accountNumber,
        virtual_account_bank: bankName,
        virtual_account_status: 'ACTIVE',
      };
      let studentSave = await supabaseAdmin.from('students').upsert(studentRow, { onConflict: 'id' });
      if (studentSave.error) {
        const { school_id, ...slim } = studentRow;
        studentSave = await supabaseAdmin.from('students').upsert(slim, { onConflict: 'id' });
        if (studentSave.error) {
          console.warn('[StudentController] students upsert soft-failed:', studentSave.error.message);
        }
      }

      // Mirror as CRM customer under stu-* id so VA webhooks can detect school students
      const customerSave = await supabaseAdmin.from('customers').upsert(
        {
          id: invifyCustomerId,
          tenant_id: tenantId,
          name: fullName,
          phone: phone || null,
          email: fallbackEmail,
          virtual_account_number: accountNumber,
          virtual_account_bank: bankName,
          virtual_account_name: accountName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (customerSave.error) {
        console.warn('[StudentController] customers upsert soft-failed:', customerSave.error.message);
        // Fallback: store under Quasar UUID if stu-* id is rejected
        const fallback = await supabaseAdmin.from('customers').upsert(
          {
            id: quasarChildId,
            tenant_id: tenantId,
            name: fullName,
            phone: phone || null,
            email: fallbackEmail,
            virtual_account_number: accountNumber,
            virtual_account_bank: bankName,
            virtual_account_name: accountName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );
        if (fallback.error) {
          console.warn('[StudentController] customers UUID upsert soft-failed:', fallback.error.message);
        }
      }

      await AuditService.log({
        eventType: 'virtual_account.created' as any,
        reference,
        tenantId,
        payload: {
          studentId: externalKey,
          quasarChildId,
          admissionNumber: admission,
          accountNumber,
          bankName,
        },
      });

      return res.status(200).json({
        accountNumber,
        bankName,
        accountName,
        quasarChildId,
      });
    } catch (error: any) {
      console.error('[StudentController] provisionStudentVirtualAccount Error:', error.message);
      const scopeHint = /sandbox:write|Missing required scope/i.test(String(error.message || ''))
        ? ' The Quasar tenant API key is missing sandbox:write. Re-issue/rotate the key with sandbox scopes, or run scratch/fix_student_va_scopes.js against the Quasar DB.'
        : '';
      const uuidHint = /uuid is expected/i.test(String(error.message || ''))
        ? ' Quasar requires a UUID child id; ensure the backend maps stu-* keys via toQuasarChildUuid.'
        : '';
      return res.status(500).json({
        error: (error.message || 'Failed to provision student virtual account') + scopeHint + uuidHint,
      });
    }
  }
}

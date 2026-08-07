// invify-backend/src/controllers/student.controller.ts
import { Request, Response } from 'express';
import { StudentService } from '../services/student.service';
import { getQuasarService } from '../integrations/quasar/factory';
import { AuditService } from '../services/audit.service';
import { supabaseAdmin } from '../db/supabase';

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
        `${admission.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || studentId.slice(0, 8)}@invify.edu`;

      // Return existing VA if already provisioned for this student under the tenant
      const { data: existingStudent } = await supabaseAdmin
        .from('students')
        .select('virtual_account_number, virtual_account_bank, first_name, last_name')
        .eq('id', studentId)
        .maybeSingle();

      if (existingStudent?.virtual_account_number) {
        return res.status(200).json({
          accountNumber: existingStudent.virtual_account_number,
          bankName: existingStudent.virtual_account_bank || 'Quasar Sandbox Bank',
          accountName: `${existingStudent.first_name || first} ${existingStudent.last_name || last}`.trim(),
        });
      }

      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('virtual_account_number, virtual_account_bank, virtual_account_name, name')
        .eq('id', studentId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingCustomer?.virtual_account_number) {
        return res.status(200).json({
          accountNumber: existingCustomer.virtual_account_number,
          bankName: existingCustomer.virtual_account_bank || 'Quasar Sandbox Bank',
          accountName: existingCustomer.virtual_account_name || existingCustomer.name || fullName,
        });
      }

      const quasar = await getQuasarService(tenantId);
      const reference = `VA-STU-${String(studentId).substring(0, 8)}-${Date.now()}`;

      const quasarAccount = await quasar.createVirtualAccount({
        childId: studentId,
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
        },
      });

      const accountNumber = quasarAccount.accountNumber;
      const bankName = quasarAccount.bankName;
      const accountName = (quasarAccount as any).accountName || fullName;

      // Upsert cloud student row (best-effort — local Drift remains source of truth on device)
      const studentRow = {
        id: studentId,
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

      // Mirror as CRM customer so VA sweep / listings can see school students
      const customerSave = await supabaseAdmin.from('customers').upsert(
        {
          id: studentId,
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
      }

      await AuditService.log({
        eventType: 'virtual_account.created' as any,
        reference,
        tenantId,
        payload: { studentId, admissionNumber: admission, accountNumber, bankName },
      });

      return res.status(200).json({
        accountNumber,
        bankName,
        accountName,
      });
    } catch (error: any) {
      console.error('[StudentController] provisionStudentVirtualAccount Error:', error.message);
      const scopeHint = /sandbox:write|Missing required scope/i.test(String(error.message || ''))
        ? ' The Quasar tenant API key is missing sandbox:write. Re-issue/rotate the key with sandbox scopes, or run scratch/fix_student_va_scopes.js against the Quasar DB.'
        : '';
      return res.status(500).json({
        error: (error.message || 'Failed to provision student virtual account') + scopeHint,
      });
    }
  }
}

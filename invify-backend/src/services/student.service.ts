// invify-backend/src/services/student.service.ts
import { supabase } from '../db/supabase';
import { getQuasarService } from '../integrations/quasar/factory';
import { AuditService } from './audit.service';
import { toQuasarChildUuid } from '../integrations/quasar/quasar-child-id';

export class StudentService {
  /**
   * Retrieves an existing virtual account or provisions a new one via Quasar.
   * Requirement: Idempotent and retry-safe.
   */
  static async getOrCreateVirtualAccount(studentId: string, schoolId: string) {
    try {
      // 1. Idempotency Check: Check if we already have an account in the DB
      const { data: existing, error: fetchError } = await supabase
        .from('student_virtual_accounts')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (fetchError) throw new Error(`Database fetch failed: ${fetchError.message}`);
      if (existing) return existing;

      // 2. Fetch Student Details (Required for SDK)
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('first_name, last_name, admission_number')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        throw new Error(`Student ${studentId} not found`);
      }

      // 3. Resolve Quasar Service (Multi-Tenant)
      const quasar = await getQuasarService(schoolId);

      // 4. Call Quasar SDK (childId must be UUID; map stu-* keys deterministically)
      const quasarChildId = toQuasarChildUuid(schoolId, studentId);
      const reference = `VA-${quasarChildId.substring(0, 8)}-${Date.now()}`;

      const quasarAccount = await quasar.createVirtualAccount({
        childId: quasarChildId,
        parentId: schoolId,
        email: `${student.admission_number}@invify.edu`, // Fallback email
        firstName: student.first_name,
        lastName: student.last_name,
        metadata: {
          admissionNumber: student.admission_number,
          source: 'student_provisioning',
          externalStudentKey: studentId,
        },
      });

      // 5. Store in Database
      const { data: saved, error: saveError } = await supabase
        .from('student_virtual_accounts')
        .insert({
          student_id: studentId,
          school_id: schoolId,
          quasar_account_id: (quasarAccount as any).reference || (quasarAccount as any).id, // Fallback for SDK return type
          account_number: quasarAccount.accountNumber,
          bank_name: quasarAccount.bankName
        })
        .select()
        .single();

      if (saveError) {
        // Log failure but do not return partial record
        await AuditService.log({
          eventType: 'virtual_account.failed' as any,
          reference,
          tenantId: schoolId,
          payload: { studentId, error: saveError.message }
        });
        throw new Error(`Failed to save virtual account: ${saveError.message}`);
      }

      // 6. Audit Log (Success)
      await AuditService.log({
        eventType: 'virtual_account.created' as any,
        reference,
        tenantId: schoolId,
        payload: { 
          studentId, 
          accountNumber: saved.account_number,
          bankName: saved.bank_name
        }
      });

      return saved;

    } catch (error: any) {
      console.error(`[StudentService] Provisioning failed for student ${studentId}:`, error.message);
      throw error;
    }
  }
}

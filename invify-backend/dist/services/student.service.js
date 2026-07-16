"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentService = void 0;
// invify-backend/src/services/student.service.ts
const supabase_1 = require("../db/supabase");
const factory_1 = require("../integrations/quasar/factory");
const audit_service_1 = require("./audit.service");
class StudentService {
    /**
     * Retrieves an existing virtual account or provisions a new one via Quasar.
     * Requirement: Idempotent and retry-safe.
     */
    static async getOrCreateVirtualAccount(studentId, schoolId) {
        try {
            // 1. Idempotency Check: Check if we already have an account in the DB
            const { data: existing, error: fetchError } = await supabase_1.supabase
                .from('student_virtual_accounts')
                .select('*')
                .eq('student_id', studentId)
                .maybeSingle();
            if (fetchError)
                throw new Error(`Database fetch failed: ${fetchError.message}`);
            if (existing)
                return existing;
            // 2. Fetch Student Details (Required for SDK)
            const { data: student, error: studentError } = await supabase_1.supabase
                .from('students')
                .select('first_name, last_name, admission_number')
                .eq('id', studentId)
                .single();
            if (studentError || !student) {
                throw new Error(`Student ${studentId} not found`);
            }
            // 3. Resolve Quasar Service (Multi-Tenant)
            const quasar = await (0, factory_1.getQuasarService)(schoolId);
            // 4. Call Quasar SDK
            // Using student ID + timestamp as reference for Quasar-side idempotency if needed
            const reference = `VA-${studentId.split('-')[0]}-${Date.now()}`;
            const quasarAccount = await quasar.createVirtualAccount({
                childId: studentId,
                parentId: schoolId,
                email: `${student.admission_number}@invify.edu`, // Fallback email
                firstName: student.first_name,
                lastName: student.last_name,
                metadata: {
                    admissionNumber: student.admission_number,
                    source: 'student_provisioning'
                }
            });
            // 5. Store in Database
            const { data: saved, error: saveError } = await supabase_1.supabase
                .from('student_virtual_accounts')
                .insert({
                student_id: studentId,
                school_id: schoolId,
                quasar_account_id: quasarAccount.reference || quasarAccount.id, // Fallback for SDK return type
                account_number: quasarAccount.accountNumber,
                bank_name: quasarAccount.bankName
            })
                .select()
                .single();
            if (saveError) {
                // Log failure but do not return partial record
                await audit_service_1.AuditService.log({
                    eventType: 'virtual_account.failed',
                    reference,
                    tenantId: schoolId,
                    payload: { studentId, error: saveError.message }
                });
                throw new Error(`Failed to save virtual account: ${saveError.message}`);
            }
            // 6. Audit Log (Success)
            await audit_service_1.AuditService.log({
                eventType: 'virtual_account.created',
                reference,
                tenantId: schoolId,
                payload: {
                    studentId,
                    accountNumber: saved.account_number,
                    bankName: saved.bank_name
                }
            });
            return saved;
        }
        catch (error) {
            console.error(`[StudentService] Provisioning failed for student ${studentId}:`, error.message);
            throw error;
        }
    }
}
exports.StudentService = StudentService;
//# sourceMappingURL=student.service.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentService = void 0;
// invify-backend/src/services/student.service.ts
const supabase_1 = require("../db/supabase");
const factory_1 = require("../integrations/quasar/factory");
const audit_service_1 = require("./audit.service");
const quasar_child_id_1 = require("../integrations/quasar/quasar-child-id");
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
                .select('first_name, last_name, admission_number, phone, parent_phone')
                .eq('id', studentId)
                .single();
            if (studentError || !student) {
                throw new Error(`Student ${studentId} not found`);
            }
            const { loadActivationGate, virtualAccountGenerationBlockReason } = await Promise.resolve().then(() => __importStar(require('../modules/financial-platform/activation/activation-gate')));
            const { gate } = await loadActivationGate(schoolId);
            const blocked = virtualAccountGenerationBlockReason(gate);
            if (blocked) {
                const err = new Error(blocked);
                err.code = 'MAKER_CHECKER_REQUIRED';
                throw err;
            }
            // 3. Resolve Quasar Service (Multi-Tenant)
            const quasar = await (0, factory_1.getQuasarService)(schoolId);
            // 4. Call Quasar SDK (childId must be UUID; map stu-* keys deterministically)
            const quasarChildId = (0, quasar_child_id_1.toQuasarChildUuid)(schoolId, studentId);
            const reference = `VA-${quasarChildId.substring(0, 8)}-${Date.now()}`;
            const quasarAccount = await quasar.createVirtualAccount({
                childId: quasarChildId,
                parentId: schoolId,
                email: `${student.admission_number}@invify.edu`, // Fallback email
                phone: student.phone || student.parent_phone || undefined,
                firstName: student.first_name,
                lastName: student.last_name,
                metadata: {
                    admissionNumber: student.admission_number,
                    source: 'student_provisioning',
                    externalStudentKey: studentId,
                    phone: student.phone || student.parent_phone || undefined,
                },
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
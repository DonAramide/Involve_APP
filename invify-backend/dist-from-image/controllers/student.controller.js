"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentController = void 0;
const student_service_1 = require("../services/student.service");
const factory_1 = require("../integrations/quasar/factory");
const audit_service_1 = require("../services/audit.service");
const supabase_1 = require("../db/supabase");
const quasar_child_id_1 = require("../integrations/quasar/quasar-child-id");
const free_trial_guard_1 = require("../utils/free-trial-guard");
const virtual_account_recover_1 = require("../utils/virtual-account-recover");
class StudentController {
    /**
     * GET /api/finance/virtual-account/:studentId
     * Provisions or retrieves a student's virtual account.
     */
    static async getVirtualAccount(req, res) {
        try {
            const { studentId } = req.params;
            const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
            if (!studentId) {
                return res.status(400).json({ error: "Student ID is required" });
            }
            if (!tenantId) {
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            }
            if (await (0, free_trial_guard_1.rejectIfVaBlocked)(res, tenantId))
                return;
            // Local school ids / parent keys (par-*, stu-*) are not cloud student UUIDs.
            if (!(0, quasar_child_id_1.isUuid)(studentId)) {
                const recovered = await StudentController.findStoredVa(tenantId, String(studentId).trim());
                if (recovered)
                    return res.status(200).json(recovered);
                return res.status(200).json(null);
            }
            const virtualAccount = await student_service_1.StudentService.getOrCreateVirtualAccount(studentId, tenantId);
            return res.status(200).json(virtualAccount);
        }
        catch (error) {
            if (error?.code === 'MAKER_CHECKER_REQUIRED') {
                return res.status(403).json({ error: error.message, code: 'MAKER_CHECKER_REQUIRED' });
            }
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
    static async provisionStudentVirtualAccount(req, res) {
        try {
            const { studentId } = req.params;
            const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
            const { firstName, lastName, admissionNumber, phone, email } = req.body || {};
            if (!studentId)
                return res.status(400).json({ error: 'Student ID is required' });
            if (!tenantId)
                return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
            if (await (0, free_trial_guard_1.rejectIfVaBlocked)(res, tenantId))
                return;
            const first = String(firstName || '').trim() || 'Student';
            const last = String(lastName || '').trim() || String(admissionNumber || studentId).trim() || 'Learner';
            const admission = String(admissionNumber || studentId).trim();
            const fullName = `${first} ${last}`.trim();
            const phoneDigits = String(phone || '').replace(/\D/g, '');
            if (!phoneDigits || phoneDigits.length < 10) {
                return res.status(400).json({
                    error: 'Parent phone number is required to generate a virtual account',
                    code: 'PARENT_PHONE_REQUIRED',
                });
            }
            // Quasar / Paystack prefer E.164 (+234…)
            let phoneE164 = phoneDigits;
            if (phoneDigits.startsWith('234') && phoneDigits.length >= 13)
                phoneE164 = `+${phoneDigits}`;
            else if (phoneDigits.length === 11 && phoneDigits.startsWith('0'))
                phoneE164 = `+234${phoneDigits.slice(1)}`;
            else if (phoneDigits.length === 10 && /^[789]/.test(phoneDigits))
                phoneE164 = `+234${phoneDigits}`;
            else if (String(phone || '').trim().startsWith('+'))
                phoneE164 = `+${phoneDigits}`;
            else if (phoneDigits.length >= 10)
                phoneE164 = `+${phoneDigits}`;
            console.log(JSON.stringify({
                ts: new Date().toISOString(),
                tag: 'INVIFY_VA_APP_REQ',
                tenantId,
                externalKey: String(studentId).trim(),
                phoneE164,
                firstName: String(firstName || '').trim() || null,
                lastName: String(lastName || '').trim() || null,
            }));
            const fallbackEmail = (email && String(email).trim()) ||
                `${admission.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'student'}@invify.edu`;
            // Quasar path param must be UUID; keep external key for CRM / webhook school matching.
            const externalKey = String(studentId).trim();
            const isParentAccount = externalKey.startsWith('par-');
            const quasarChildId = (0, quasar_child_id_1.toQuasarChildUuid)(tenantId, externalKey);
            const invifyCustomerId = (0, quasar_child_id_1.isUuid)(externalKey)
                ? externalKey
                : isParentAccount
                    ? externalKey
                    : externalKey.startsWith('stu-')
                        ? externalKey
                        : `stu-${admission.replace(/\s+/g, '') || externalKey}`;
            console.log(`[StudentController] Provision VA externalKey=${externalKey} quasarChildId=${quasarChildId}`);
            // Return existing VA if already provisioned (by external key, Quasar UUID, or admission)
            const stored = await StudentController.findStoredVa(tenantId, externalKey, {
                invifyCustomerId,
                quasarChildId,
                phone: phoneE164,
                fullName,
            });
            if (stored)
                return res.status(200).json(stored);
            const { data: existingStudent } = isParentAccount
                ? { data: null }
                : await supabase_1.supabaseAdmin
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
            const quasar = await (0, factory_1.getQuasarService)(tenantId);
            const reference = `VA-STU-${quasarChildId.substring(0, 8)}-${Date.now()}`;
            let quasarAccount;
            try {
                quasarAccount = await quasar.createVirtualAccount({
                    childId: quasarChildId,
                    parentId: tenantId,
                    email: fallbackEmail,
                    phone: phoneE164,
                    firstName: first,
                    lastName: last,
                    parentShareBps: 0,
                    metadata: {
                        type: String(externalKey).startsWith('par-') ? 'parent_account' : 'student_account',
                        tenantId,
                        admissionNumber: admission,
                        phone: phoneE164,
                        phoneNumber: phoneE164,
                        customerPhone: phoneE164,
                        source: String(externalKey).startsWith('par-')
                            ? 'school_parent_provisioning'
                            : 'school_student_provisioning',
                        externalStudentKey: externalKey,
                        invifyCustomerId,
                    },
                });
            }
            catch (createErr) {
                const msg = String(createErr?.message || '');
                const fromBody = (0, virtual_account_recover_1.pickAccountFields)(createErr?.response?.data || createErr?.data);
                const fromGet = await StudentController.fetchQuasarVa(quasar, quasarChildId);
                const recovered = fromBody || fromGet;
                if (!recovered?.accountNumber || !(0, virtual_account_recover_1.isExistingVaError)(msg))
                    throw createErr;
                console.log(`[StudentController] Reattached existing Quasar VA ${recovered.accountNumber} for ${externalKey}`);
                quasarAccount = recovered;
            }
            const mapped = (0, virtual_account_recover_1.pickAccountFields)(quasarAccount) || quasarAccount;
            const accountNumber = mapped.accountNumber;
            const bankName = mapped.bankName || 'Quasar';
            const accountName = mapped.accountName || quasarAccount.accountName || fullName;
            // Prefer UUID row for students table (often uuid-typed); keep stu- key on customers for webhooks.
            // Parent accounts are never stored as child rows — they live on customers as par-*.
            if (!isParentAccount) {
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
                let studentSave = await supabase_1.supabaseAdmin.from('students').upsert(studentRow, { onConflict: 'id' });
                if (studentSave.error) {
                    const { school_id, ...slim } = studentRow;
                    studentSave = await supabase_1.supabaseAdmin.from('students').upsert(slim, { onConflict: 'id' });
                    if (studentSave.error) {
                        console.warn('[StudentController] students upsert soft-failed:', studentSave.error.message);
                    }
                }
            }
            // Mirror as CRM customer. Parent VAs use par-* so webhooks never treat them as child-owned.
            const customerSave = await supabase_1.supabaseAdmin.from('customers').upsert({
                id: invifyCustomerId,
                tenant_id: tenantId,
                name: fullName,
                phone: phone || null,
                email: fallbackEmail,
                virtual_account_number: accountNumber,
                virtual_account_bank: bankName,
                virtual_account_name: accountName,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            if (customerSave.error) {
                console.warn('[StudentController] customers upsert soft-failed:', customerSave.error.message);
                // Fallback: keep par-* prefix for parent accounts so routing stays parent-owned
                const fallback = await supabase_1.supabaseAdmin.from('customers').upsert({
                    id: isParentAccount ? `par-${quasarChildId}` : quasarChildId,
                    tenant_id: tenantId,
                    name: fullName,
                    phone: phone || null,
                    email: fallbackEmail,
                    virtual_account_number: accountNumber,
                    virtual_account_bank: bankName,
                    virtual_account_name: accountName,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });
                if (fallback.error) {
                    console.warn('[StudentController] customers UUID upsert soft-failed:', fallback.error.message);
                }
            }
            await audit_service_1.AuditService.log({
                eventType: 'virtual_account.created',
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
        }
        catch (error) {
            if (error?.code === 'MAKER_CHECKER_REQUIRED') {
                return res.status(403).json({ error: error.message, code: 'MAKER_CHECKER_REQUIRED' });
            }
            console.error('[StudentController] provisionStudentVirtualAccount Error:', error.message);
            const msg = String(error.message || '');
            if (/econnrefused|connection refused/i.test(msg)) {
                return res.status(503).json({
                    error: 'Payment account service is temporarily unavailable. If Financial Platform is still UNPROVISIONED, activate it for this school in Invify Admin, then try again.',
                    code: 'VA_SERVICE_UNAVAILABLE',
                });
            }
            // Rare: old Quasar deploy still rejecting phone property names.
            if (/property phone(number)? should not exist/i.test(msg)) {
                return res.status(502).json({
                    error: msg,
                    code: 'QUASAR_VA_PHONE_WHITELIST',
                });
            }
            const scopeHint = /sandbox:write|Missing required scope/i.test(msg)
                ? ' The Quasar tenant API key is missing sandbox:write. Re-issue/rotate the key with sandbox scopes, or run scratch/fix_student_va_scopes.js against the Quasar DB.'
                : '';
            const uuidHint = /uuid is expected/i.test(msg)
                ? ' Quasar requires a UUID child id; ensure the backend maps stu-* keys via toQuasarChildUuid.'
                : '';
            if ((0, virtual_account_recover_1.isExistingVaError)(msg)) {
                try {
                    const tenant = req.headers['x-tenant-id'] || req.user?.tenantId;
                    const key = String(req.params.studentId || '').trim();
                    const quasar = await (0, factory_1.getQuasarService)(tenant);
                    const recovered = await StudentController.fetchQuasarVa(quasar, (0, quasar_child_id_1.toQuasarChildUuid)(tenant, key));
                    if (recovered?.accountNumber) {
                        return res.status(200).json(recovered);
                    }
                }
                catch (recoverErr) {
                    console.warn('[StudentController] existing-VA recover failed:', recoverErr?.message);
                }
            }
            return res.status(500).json({
                error: (error.message || 'Failed to provision student virtual account') + scopeHint + uuidHint,
            });
        }
    }
    static async fetchQuasarVa(quasar, childId) {
        try {
            const raw = await quasar.getVirtualAccount(childId);
            return (0, virtual_account_recover_1.pickAccountFields)(raw);
        }
        catch (err) {
            console.warn('[StudentController] getVirtualAccount miss:', err?.message || err);
            return null;
        }
    }
    static async findStoredVa(tenantId, externalKey, extra) {
        const ids = [
            ...new Set([
                externalKey,
                extra?.invifyCustomerId,
                extra?.quasarChildId,
                extra?.quasarChildId ? `par-${extra.quasarChildId}` : '',
                extra?.quasarChildId ? `stu-${extra.quasarChildId}` : '',
            ].filter((id) => !!id)),
        ];
        const fromRow = (row, nameFallback) => (0, virtual_account_recover_1.pickAccountFields)({
            accountNumber: row?.virtual_account_number,
            bankName: row?.virtual_account_bank || 'Quasar',
            accountName: row?.virtual_account_name || nameFallback || row?.name,
        });
        if (ids.length) {
            const { data: customers } = await supabase_1.supabaseAdmin
                .from('customers')
                .select('id, name, phone, virtual_account_number, virtual_account_bank, virtual_account_name')
                .eq('tenant_id', tenantId)
                .in('id', ids);
            for (const row of customers || []) {
                const picked = fromRow(row, extra?.fullName);
                if (picked)
                    return picked;
            }
            const { data: students } = await supabase_1.supabaseAdmin
                .from('students')
                .select('id, first_name, last_name, virtual_account_number, virtual_account_bank')
                .eq('tenant_id', tenantId)
                .in('id', ids);
            for (const row of students || []) {
                const picked = (0, virtual_account_recover_1.pickAccountFields)({
                    accountNumber: row?.virtual_account_number,
                    bankName: row?.virtual_account_bank || 'Quasar',
                    accountName: `${row?.first_name || ''} ${row?.last_name || ''}`.trim() || extra?.fullName,
                });
                if (picked)
                    return picked;
            }
        }
        const want = (0, virtual_account_recover_1.last10PhoneDigits)(extra?.phone);
        if (want.length >= 10) {
            const { data: byPhone } = await supabase_1.supabaseAdmin
                .from('customers')
                .select('id, name, phone, virtual_account_number, virtual_account_bank, virtual_account_name')
                .eq('tenant_id', tenantId)
                .not('virtual_account_number', 'is', null)
                .ilike('phone', `%${want}%`)
                .limit(20);
            for (const row of byPhone || []) {
                if ((0, virtual_account_recover_1.last10PhoneDigits)(row?.phone) !== want)
                    continue;
                const picked = fromRow(row, extra?.fullName);
                if (picked)
                    return picked;
            }
        }
        return null;
    }
}
exports.StudentController = StudentController;
//# sourceMappingURL=student.controller.js.map
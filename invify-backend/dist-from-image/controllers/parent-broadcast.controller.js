"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentBroadcastController = void 0;
exports.collectParentRecipients = collectParentRecipients;
const supabase_1 = require("../db/supabase");
const resolve_tenant_scope_1 = require("../utils/resolve-tenant-scope");
const email_service_1 = require("../services/email.service");
const sms_service_1 = require("../services/sms.service");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 1000;
const MAX_RECIPIENTS = 400;
function collectParentRecipients(rows) {
    const emails = new Set();
    const phones = new Set();
    let parents = 0;
    for (const row of rows || []) {
        const payload = row?.payload && typeof row.payload === 'object' ? row.payload : row;
        if (!payload || typeof payload !== 'object')
            continue;
        if (payload.isDeleted === true || payload.is_deleted === true)
            continue;
        const name = String(payload.fullName || payload.name || '').trim();
        if (!name && !payload.email && !payload.phone)
            continue;
        parents += 1;
        const email = String(payload.email || '').trim().toLowerCase();
        if (EMAIL_RE.test(email))
            emails.add(email);
        const phone = (0, sms_service_1.normalizeSmsPhone)(payload.phone);
        if (phone)
            phones.add(phone);
    }
    return {
        parents,
        emails: Array.from(emails).slice(0, MAX_RECIPIENTS),
        phones: Array.from(phones).slice(0, MAX_RECIPIENTS),
    };
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function loadParents(tenantId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('school_entities')
        .select('payload')
        .eq('tenant_id', tenantId)
        .eq('entity_type', 'parent')
        .limit(2000);
    if (error) {
        throw new Error(error.message);
    }
    return collectParentRecipients(data || []);
}
async function schoolName(tenantId) {
    const { data } = await supabase_1.supabaseAdmin
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .maybeSingle();
    return String(data?.name || 'Your school').trim() || 'Your school';
}
class ParentBroadcastController {
    static async audience(req, res) {
        try {
            const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
            if (!tenantId)
                return res.status(401).json({ error: 'School not found for this account.' });
            const audience = await loadParents(tenantId);
            return res.json({
                parents: audience.parents,
                emailRecipients: audience.emails.length,
                smsRecipients: audience.phones.length,
                smsConfigured: (0, sms_service_1.smsIsConfigured)(),
            });
        }
        catch (err) {
            console.error('[ParentBroadcast] audience:', err?.message || err);
            return res.status(500).json({ error: 'Could not load parents.' });
        }
    }
    static async send(req, res) {
        try {
            const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
            if (!tenantId)
                return res.status(401).json({ error: 'School not found for this account.' });
            const channels = Array.isArray(req.body?.channels)
                ? req.body.channels.map((c) => String(c).toLowerCase())
                : [];
            const wantEmail = channels.includes('email');
            const wantSms = channels.includes('sms');
            if (!wantEmail && !wantSms) {
                return res.status(400).json({ error: 'Choose email, SMS, or both.' });
            }
            const message = String(req.body?.message || '').trim();
            if (!message)
                return res.status(400).json({ error: 'Enter the message to send.' });
            if (message.length > MAX_MESSAGE) {
                return res.status(400).json({ error: `Message must be ${MAX_MESSAGE} characters or less.` });
            }
            const testOnly = req.body?.testOnly === true;
            if (wantSms && !(0, sms_service_1.smsIsConfigured)()) {
                return res.status(400).json({
                    error: 'SMS is not configured on this server yet. You can still send by email.',
                });
            }
            const school = await schoolName(tenantId);
            const subject = String(req.body?.subject || `Message from ${school}`).replace(/\s+/g, ' ').trim().slice(0, 120);
            const audience = testOnly ? null : await loadParents(tenantId);
            const emailTargets = wantEmail
                ? (testOnly
                    ? [String(req.body?.testEmail || '').trim().toLowerCase()].filter((e) => EMAIL_RE.test(e))
                    : audience.emails)
                : [];
            const smsTargets = wantSms
                ? (testOnly
                    ? [(0, sms_service_1.normalizeSmsPhone)(req.body?.testPhone)].filter((p) => !!p)
                    : audience.phones)
                : [];
            if (wantEmail && emailTargets.length === 0) {
                return res.status(400).json({
                    error: testOnly
                        ? 'Enter a valid email address for the test.'
                        : 'No parent email addresses are on file. Sync the school from the tablet first.',
                });
            }
            if (wantSms && smsTargets.length === 0) {
                return res.status(400).json({
                    error: testOnly
                        ? 'Enter a valid phone number for the test SMS.'
                        : 'No parent phone numbers are on file. Sync the school from the tablet first.',
                });
            }
            const email = { sent: 0, failed: 0 };
            const sms = { sent: 0, failed: 0 };
            if (wantEmail) {
                for (const to of emailTargets) {
                    const ok = await email_service_1.emailService.sendParentNotice(to, subject, message, school);
                    if (ok)
                        email.sent += 1;
                    else
                        email.failed += 1;
                    await delay(120);
                }
            }
            if (wantSms) {
                const smsBody = message.length > 480 ? `${message.slice(0, 477)}...` : message;
                for (const to of smsTargets) {
                    const result = await (0, sms_service_1.sendPlainSms)(to, smsBody);
                    if (result.ok)
                        sms.sent += 1;
                    else
                        sms.failed += 1;
                    await delay(120);
                }
            }
            console.log(`[ParentBroadcast] tenant=${tenantId.slice(0, 8)} test=${testOnly} email=${email.sent}/${email.failed} sms=${sms.sent}/${sms.failed}`);
            return res.json({
                success: email.failed === 0 && sms.failed === 0,
                test: testOnly,
                email: wantEmail ? email : undefined,
                sms: wantSms ? sms : undefined,
            });
        }
        catch (err) {
            console.error('[ParentBroadcast] send:', err?.message || err);
            return res.status(500).json({ error: 'The message could not be sent.' });
        }
    }
}
exports.ParentBroadcastController = ParentBroadcastController;
//# sourceMappingURL=parent-broadcast.controller.js.map
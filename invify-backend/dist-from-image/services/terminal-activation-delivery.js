"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTenantActivationEmail = resolveTenantActivationEmail;
exports.deliverApprovedTerminalActivation = deliverApprovedTerminalActivation;
const supabase_1 = require("../db/supabase");
const paid_license_1 = require("../utils/paid-license");
const email_service_1 = require("./email.service");
const pdf_service_1 = require("./pdf.service");
function resolveTenantActivationEmail(tenant, users) {
    const ownerEmail = String(tenant?.owner_email || '').trim();
    if (ownerEmail.includes('@'))
        return ownerEmail;
    const owner = (users || []).find((user) => {
        const role = String(user?.role || '').toLowerCase();
        const email = String(user?.email || '').trim();
        return role === 'owner' && email.includes('@');
    });
    return owner ? String(owner.email).trim() : null;
}
async function deliverApprovedTerminalActivation(activation) {
    const { data: tenant, error: tenantErr } = await supabase_1.supabaseAdmin
        .from('tenants')
        .select('name, type, owner_email')
        .eq('id', activation.tenant_id)
        .maybeSingle();
    if (tenantErr)
        throw tenantErr;
    const { data: users, error: userErr } = await supabase_1.supabaseAdmin
        .from('users')
        .select('email, role')
        .eq('tenant_id', activation.tenant_id)
        .limit(50);
    if (userErr)
        throw userErr;
    const to = resolveTenantActivationEmail(tenant, users);
    if (!to) {
        return { sent: false, to: null, error: 'This tenant has no email address on file.' };
    }
    const expiry = activation.expires_at
        ? new Date(activation.expires_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        : '';
    const document = {
        businessName: tenant?.name || 'Tenant',
        mode: tenant?.type ? String(tenant.type) : '',
        plan: String((0, paid_license_1.planNameFromIndex)(activation.plan_index) || 'basic').toUpperCase(),
        durationDays: Number(activation.duration_days) || 0,
        expiry,
        activationCode: activation.activation_code,
        deviceSuffix: activation.device_suffix || '',
    };
    const pdf = await pdf_service_1.PDFService.generateTerminalActivationPDF(document);
    const sent = await email_service_1.emailService.sendTerminalActivationEmail(to, document, pdf);
    return {
        sent,
        to,
        error: sent ? undefined : 'The activation file could not be emailed.',
    };
}
//# sourceMappingURL=terminal-activation-delivery.js.map
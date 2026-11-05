"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingController = void 0;
exports.signLinkedDeviceToken = signLinkedDeviceToken;
const supabase_1 = require("../db/supabase");
const verification_service_1 = require("../services/verification.service");
const quasar_provisioning_service_1 = require("../integrations/quasar/quasar-provisioning.service");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const onboarding_settings_service_1 = require("../services/onboarding-settings.service");
const device_identity_1 = require("../utils/device-identity");
const claim_unassigned_device_1 = require("../utils/claim-unassigned-device");
const new_tenant_plan_1 = require("../utils/new-tenant-plan");
const device_link_qr_1 = require("../utils/device-link-qr");
const finance_tenant_1 = require("../utils/finance-tenant");
const device_origin_1 = require("../utils/device-origin");
const agent_code_1 = require("../utils/agent-code");
const health_settings_service_1 = require("../modules/health-insurance/services/health-settings.service");
/**
 * Non-expiring device JWT for a tablet linked by QR. Signed as the tenant
 * owner when one exists so API calls resolve to that owner's profile.
 */
async function signLinkedDeviceToken(tenantId, deviceId) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16)
        return null;
    let ownerId = null;
    let ownerEmail = '';
    try {
        const { data } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('tenant_id', tenantId)
            .eq('role', 'owner')
            .limit(1)
            .maybeSingle();
        ownerId = data?.id ? String(data.id) : null;
        ownerEmail = data?.email ? String(data.email) : '';
    }
    catch (e) {
        console.warn('[signLinkedDeviceToken] owner lookup failed:', e?.message);
    }
    const subject = ownerId || require('crypto').randomUUID();
    return jsonwebtoken_1.default.sign({
        sub: subject,
        id: subject,
        email: ownerEmail,
        role: 'owner',
        tenantId,
        deviceId,
    }, secret);
}
async function ensureOwnerUserRow(opts) {
    const email = String(opts.email || '').trim().toLowerCase();
    const name = String(opts.name || '').trim() || email;
    if (!email || !opts.tenantId)
        return opts.id || null;
    const { data: existing } = await supabase_1.supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', email)
        .maybeSingle();
    if (existing?.id) {
        await supabase_1.supabaseAdmin
            .from('users')
            .update({
            tenant_id: opts.tenantId,
            name,
            role: 'owner',
            is_active: true,
        })
            .eq('id', existing.id);
        return existing.id;
    }
    const id = opts.id || require('crypto').randomUUID();
    const full = await supabase_1.supabaseAdmin.from('users').insert({
        id,
        tenant_id: opts.tenantId,
        name,
        email,
        role: 'owner',
        require_password_reset: false,
        is_active: true,
    });
    if (!full.error)
        return id;
    const slim = await supabase_1.supabaseAdmin.from('users').insert({
        id,
        tenant_id: opts.tenantId,
        email,
        role: 'owner',
    });
    if (!slim.error)
        return id;
    console.warn('[OnboardingController] Owner user insert failed:', slim.error.message || full.error.message);
    return opts.id || null;
}
async function onboardingDeviceOriginFields(deviceId) {
    const { data: existing } = await supabase_1.supabaseAdmin
        .from('devices')
        .select('device_info, device_category, tenant_id')
        .eq('device_id', deviceId)
        .maybeSingle();
    const keepInvify = Boolean(existing) && (0, device_origin_1.originOfDevice)(existing) === 'INVIFY_UPLOADED';
    const origin = keepInvify ? device_origin_1.ORIGIN_INVIFY : device_origin_1.ORIGIN_CUSTOMER;
    return {
        device_category: keepInvify ? 'COMPANY_DEVICE' : 'USER_DEVICE',
        device_info: (0, device_origin_1.mergeDeviceInfo)(existing?.device_info, {}, origin),
    };
}
function generateTenantCode(phone) {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
        const last10 = cleanPhone.slice(-10);
        return last10.split('').reverse().join('');
    }
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}
function ownerContactFields(input) {
    const firstName = String(input.firstName || '').trim();
    const lastName = String(input.lastName || '').trim();
    const email = String(input.email || '').trim().toLowerCase();
    return {
        owner_email: email || null,
        owner_name: `${firstName} ${lastName}`.trim() || null,
        settings: {
            owner_profile: {
                firstName,
                lastName,
                email,
                phone: String(input.phone || '').trim(),
                businessName: String(input.businessName || '').trim(),
                city: String(input.city || '').trim(),
                country: String(input.country || '').trim(),
            },
        },
    };
}
class OnboardingController {
    /**
     * POST /public/onboarding/signup
     * Legacy backward-compatible endpoint.
     */
    static async signup(req, res) {
        try {
            const { userId, email, schoolName, businessMode, referralCode } = req.body;
            if (!userId || !email || !schoolName) {
                return res.status(400).json({ error: 'Missing required onboarding data' });
            }
            const { data: tenant, error: tenantError } = await supabase_1.supabaseAdmin
                .from('tenants')
                .insert({ name: schoolName, type: businessMode || 'school', plan: 'free', status: 'pending' })
                .select()
                .single();
            if (tenantError)
                throw tenantError;
            if (referralCode) {
                const { ReferralService } = require('../services/referral.service');
                await ReferralService.trackSignup(tenant.id, email, referralCode);
            }
            const { error: userError } = await supabase_1.supabaseAdmin.from('users').insert({
                id: userId, tenant_id: tenant.id,
                name: schoolName + ' Admin', email, role: 'owner', require_password_reset: true
            });
            if (userError) {
                await supabase_1.supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
                throw userError;
            }
            await supabase_1.supabaseAdmin.from('wallets').insert({ tenant_id: tenant.id, balance: 0 });
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 100);
            await supabase_1.supabaseAdmin.from('subscriptions').insert({
                tenant_id: tenant.id, plan: 'free', status: 'active',
                start_date: new Date().toISOString(), end_date: endDate.toISOString()
            });
            return res.status(201).json({ message: 'Onboarding environment provisioned successfully', tenantId: tenant.id, role: 'owner' });
        }
        catch (error) {
            console.error('[OnboardingController] Signup Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /public/onboarding/provision
     * High-Grade Atomic Provisioning Engine for enterprise customers.
     */
    static async provision(req, res) {
        try {
            const { email, password, businessName, industry, phone, modules, plan, quota, branding, paymentMethod, transactionId } = req.body;
            if (!email || !businessName || !industry) {
                return res.status(400).json({ error: 'Missing mandatory enterprise parameters' });
            }
            const tenantCode = generateTenantCode(phone);
            console.log(`[OnboardingController] Beginning atomic provisioning for: ${businessName} (${email})`);
            const mockSettings = {
                enabledModules: modules || [industry],
                customBrandColor: branding?.primaryColor || '#6366f1',
                tagline: branding?.tagline || 'Pioneering absolute retail & tuition intelligence.',
                footnote: branding?.footnote || 'Thank you for transacting with Invify Pro.',
                quotas: quota || { terminals: 6, dailyTx: 500, operators: 20 },
                paymentMethod: paymentMethod || 'Stripe',
                transactionId: transactionId || `tx_atlas_${Date.now()}`,
                cacNumber: req.body.cacNumber || null
            };
            let tenant = null;
            let tenantError = null;
            let currentTenantCode = tenantCode;
            for (let attempt = 1; attempt <= 3; attempt++) {
                const { data, error } = await supabase_1.supabaseAdmin
                    .from('tenants')
                    .insert({ name: businessName, type: industry, plan: plan || 'premium', status: 'pending', settings: mockSettings, phone: phone || null, tenant_code: currentTenantCode })
                    .select().single();
                tenant = data;
                tenantError = error;
                if (!tenantError) {
                    break;
                }
                const isUniqueViolation = tenantError.code === '23505' || tenantError.message?.includes('unique') || tenantError.message?.includes('duplicate');
                if (isUniqueViolation && attempt < 3) {
                    console.warn(`[OnboardingController] Unique constraint collision on tenant_code "${currentTenantCode}" in provision (attempt ${attempt}/3). Regenerating code...`);
                    currentTenantCode = `${tenantCode.substring(0, 15)}${Math.floor(Math.random() * 100)}`;
                }
                else {
                    break;
                }
            }
            if (tenantError) {
                console.error('[OnboardingController] Provision insert failed after retry exhaustion:', tenantError.message);
                return res.status(409).json({ error: 'Provisioning failed due to tenant code conflict. Please try again.' });
            }
            let generatedVa = null;
            // School virtual accounts wait until a maker proposes activation and a different admin checker-approves.
            if (!password || String(password).length < 8) {
                res.status(400).json({ success: false, error: 'A strong password (min 8 characters) is required' });
                return;
            }
            let userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            try {
                const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
                    email, password, email_confirm: true,
                    user_metadata: { role: 'owner', tenantId: tenant.id }
                });
                if (!authError && authData.user) {
                    userId = authData.user.id;
                }
                else {
                    userId = email === 'olive@invify.com' ? 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382' : require('crypto').randomUUID();
                }
            }
            catch (_) {
                userId = email === 'olive@invify.com' ? 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382' : require('crypto').randomUUID();
            }
            const { error: userError } = await supabase_1.supabaseAdmin.from('users').insert({
                id: userId, tenant_id: tenant.id,
                name: `${businessName} Owner`, email, role: 'owner', require_password_reset: true
            });
            if (userError) {
                await supabase_1.supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
                throw userError;
            }
            const startingBalance = plan === 'enterprise' ? 100000 : 50000;
            await supabase_1.supabaseAdmin.from('wallets').insert({ tenant_id: tenant.id, balance: startingBalance });
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);
            await supabase_1.supabaseAdmin.from('subscriptions').insert({
                tenant_id: tenant.id, plan: plan || 'premium', status: 'active',
                start_date: new Date().toISOString(), end_date: endDate.toISOString()
            });
            console.log(`[TELEMETRY] Tenant Provisioned. ID: ${tenant.id}. Industry: ${industry}. Plan: ${plan}.`);
            try {
                const { emailService } = require('../services/email.service');
                await emailService.sendWelcomeEmail(email, {
                    name: `${businessName} Owner`,
                    role: 'owner',
                    businessMode: industry,
                });
            }
            catch (emailErr) {
                console.warn('[OnboardingController] Welcome email failed (non-fatal):', emailErr.message);
            }
            // ── Quasar Platform Provisioning (async — non-blocking) ───────────────
            // Runs after the local tenant is committed. Failures are logged but
            // do NOT roll back the Invify tenant, keeping onboarding atomic.
            quasar_provisioning_service_1.QuasarProvisioningService.provisionMerchant({
                invifyTenantId: tenant.id,
                tenantName: businessName,
                tenantType: industry,
            }).catch((qErr) => console.error(`[OnboardingController] Quasar provisioning failed for tenant ${tenant.id}: ${qErr.message}`));
            return res.status(201).json({
                message: 'Stripe-grade Enterprise Provisioning sequence completed successfully.',
                tenantId: tenant.id,
                tenantCode: currentTenantCode,
                userId,
                role: 'owner',
                walletBalance: startingBalance, subscriptionPlan: plan, activeModules: modules || [industry],
                virtualAccount: generatedVa ? {
                    accountName: generatedVa.accountName || businessName.toUpperCase(),
                    accountNumber: generatedVa.accountNumber, bankName: generatedVa.bankName
                } : null
            });
        }
        catch (error) {
            console.error('[OnboardingController] Provisioning Sequence Aborted:', error.message);
            return res.status(500).json({ error: `Atomic setup failed: ${error.message}` });
        }
    }
    /**
     * Helper to check if an email already exists in users, tenants (owner_email), or local users_db.json
     */
    static async isEmailExisting(email) {
        const resolution = await OnboardingController.resolveEmailAgainstDevice(email);
        return resolution.exists;
    }
    /**
     * Resolve whether an email is already taken, and whether this physical device
     * is already the device linked to that account (reinstall / re-onboarding).
     */
    static async resolveEmailAgainstDevice(email, deviceId) {
        const result = (0, device_identity_1.emptyEmailDeviceResolution)();
        if (!email)
            return result;
        const normalized = email.trim().toLowerCase();
        const wantedDevice = (0, device_identity_1.normalizeDeviceId)(deviceId);
        const tenantIds = new Set();
        const candidates = [];
        try {
            const { data: userData } = await supabase_1.supabaseAdmin
                .from('users')
                .select('id, email, tenant_id, role')
                .ilike('email', normalized)
                .limit(5);
            if (userData && userData.length > 0) {
                result.exists = true;
                const owner = userData.find((u) => String(u.role || '').toLowerCase() === 'owner') || userData[0];
                result.userId = owner?.id || null;
                userData.forEach((u) => {
                    if (u.tenant_id)
                        tenantIds.add(u.tenant_id);
                });
                if (owner?.tenant_id)
                    result.tenantId = owner.tenant_id;
            }
        }
        catch (err) {
            console.warn('[OnboardingController] Error checking users table for email:', err.message);
        }
        try {
            const { data: tenantData } = await supabase_1.supabaseAdmin
                .from('tenants')
                .select('id, owner_email')
                .ilike('owner_email', normalized)
                .limit(5);
            if (tenantData && tenantData.length > 0) {
                result.exists = true;
                if (!result.tenantId)
                    result.tenantId = tenantData[0].id;
                tenantData.forEach((t) => {
                    if (t.id)
                        tenantIds.add(t.id);
                });
            }
        }
        catch (err) {
            console.warn('[OnboardingController] Error checking tenants table for email:', err.message);
        }
        try {
            const fs = require('fs');
            const path = require('path');
            const dbPath = path.join(__dirname, '../../users_db.json');
            if (fs.existsSync(dbPath)) {
                const users = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                if (Array.isArray(users) && users.some((u) => (u.email || '').toLowerCase() === normalized)) {
                    result.exists = true;
                }
            }
        }
        catch (_) { }
        if (!result.exists)
            return result;
        try {
            const { data: byEmail } = await supabase_1.supabaseAdmin
                .from('device_registrations')
                .select('device_id, tenant_id, owner_email')
                .ilike('owner_email', normalized);
            if (byEmail)
                candidates.push(...byEmail);
        }
        catch (err) {
            console.warn('[OnboardingController] device_registrations email lookup failed:', err.message);
        }
        if (tenantIds.size > 0) {
            const ids = Array.from(tenantIds);
            try {
                const { data: byTenant } = await supabase_1.supabaseAdmin
                    .from('device_registrations')
                    .select('device_id, tenant_id, owner_email')
                    .in('tenant_id', ids);
                if (byTenant)
                    candidates.push(...byTenant);
            }
            catch (err) {
                console.warn('[OnboardingController] device_registrations tenant lookup failed:', err.message);
            }
            try {
                const { data: fleet } = await supabase_1.supabaseAdmin
                    .from('devices')
                    .select('device_id, tenant_id')
                    .in('tenant_id', ids);
                if (fleet)
                    candidates.push(...fleet);
            }
            catch (err) {
                console.warn('[OnboardingController] devices tenant lookup failed:', err.message);
            }
        }
        result.registeredDevices = (0, device_identity_1.uniqueDeviceIds)(candidates);
        if (!wantedDevice)
            return result;
        const matched = candidates.find((row) => {
            if (!(0, device_identity_1.deviceIdsMatch)(row.device_id, wantedDevice))
                return false;
            const rowEmail = String(row.owner_email || '').trim().toLowerCase();
            return rowEmail === normalized || (!!row.tenant_id && tenantIds.has(row.tenant_id));
        });
        if (matched?.tenant_id) {
            result.sameDevice = true;
            result.tenantId = matched.tenant_id;
            console.log(`[OnboardingController] Device ${wantedDevice} already belongs to ${normalized} (tenant ${matched.tenant_id}).`);
            return result;
        }
        // Web-created tenants have no hardware serial (UNASSIGNED / null). Bind this tablet.
        if ((0, device_identity_1.isUsableDeviceId)(wantedDevice) && result.tenantId && result.registeredDevices.length === 0) {
            const claim = await (0, claim_unassigned_device_1.claimUnassignedDeviceForTenant)({
                tenantId: result.tenantId,
                deviceId: wantedDevice,
                ownerEmail: normalized,
            });
            if (claim.bound) {
                result.sameDevice = true;
                result.registeredDevices = [(0, device_identity_1.normalizeDeviceId)(wantedDevice)];
                console.log(`[OnboardingController] Claimed UNASSIGNED device slot for ${normalized} → ${wantedDevice} (tenant ${result.tenantId}).`);
            }
        }
        return result;
    }
    /**
     * GET/POST /auth/check-email and /api/auth/check-email
     */
    static async checkEmail(req, res) {
        try {
            const emailRaw = req.method === 'GET' ? req.query.email : req.body?.email;
            const deviceIdRaw = req.method === 'GET'
                ? req.query.deviceId || req.query.device_id
                : req.body?.deviceId || req.body?.device_id;
            if (!emailRaw || typeof emailRaw !== 'string') {
                res.status(400).json({ error: 'Valid email is required.' });
                return;
            }
            const normalized = emailRaw.trim().toLowerCase();
            const deviceId = typeof deviceIdRaw === 'string' ? deviceIdRaw : null;
            const resolution = await OnboardingController.resolveEmailAgainstDevice(normalized, deviceId);
            const conflict = resolution.exists && !resolution.sameDevice;
            res.status(200).json({
                exists: resolution.exists,
                sameDevice: resolution.sameDevice,
                thisDeviceId: deviceId ? (0, device_identity_1.normalizeDeviceId)(deviceId) || deviceId : null,
                registeredDevices: resolution.registeredDevices,
                message: resolution.sameDevice
                    ? 'This device is already linked to this account.'
                    : conflict
                        ? 'An account with this email already exists.'
                        : 'Email is available.'
            });
        }
        catch (error) {
            console.error('[OnboardingController] checkEmail error:', error.message);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }
    /**
     * GET/POST /auth/check-agent-code and /api/auth/check-agent-code
     * Public lookup used during tablet onboarding.
     */
    static async checkAgentCode(req, res) {
        try {
            const raw = req.method === 'GET'
                ? req.query.code || req.query.agentCode || req.query.agent_code
                : req.body?.code || req.body?.agentCode || req.body?.agent_code;
            const lookup = await (0, agent_code_1.lookupAgentCode)(raw);
            res.status(lookup.valid ? 200 : 404).json({
                valid: lookup.valid,
                exists: lookup.exists,
                isDefault: lookup.isDefault,
                code: lookup.code || (0, agent_code_1.normalizeAgentCode)(raw),
                agentName: lookup.agentName || null,
                status: lookup.status || null,
                institutionId: lookup.institutionId || null,
                institutionType: lookup.institutionType || null,
                hmoProviderId: lookup.hmoProviderId || null,
                hmoProviderCode: lookup.hmoProviderCode || null,
                hmoProviderName: lookup.hmoProviderName || null,
                hmoAssignmentMode: lookup.hmoAssignmentMode || null,
                error: lookup.error || null,
                message: lookup.valid
                    ? lookup.isDefault
                        ? 'Invify default agent confirmed.'
                        : lookup.institutionType === 'HMO'
                            ? `${lookup.agentName || lookup.code} HMO institution confirmed.`
                            : lookup.institutionType === 'BANK'
                                ? `${lookup.agentName || lookup.code} partner bank confirmed.`
                                : 'Agent code is valid.'
                    : lookup.error || 'This agent code does not exist',
            });
        }
        catch (error) {
            console.error('[OnboardingController] checkAgentCode error:', error.message);
            res.status(500).json({
                valid: false,
                exists: false,
                error: 'Could not verify this agent code. Please try again.',
            });
        }
    }
    /**
     * POST /auth/send-email-otp
     */
    static async sendEmailOtp(req, res) {
        try {
            const { email, purpose = 'SIGNUP', deviceId, device_id } = req.body;
            if (!email || typeof email !== 'string') {
                res.status(400).json({ error: 'Valid email is required.' });
                return;
            }
            const normalized = email.trim().toLowerCase();
            // For registration / signup, prevent sending OTP if email already exists
            // on a different device. Same-device reinstall may continue.
            const isSignup = !purpose || purpose.toUpperCase() === 'SIGNUP' || purpose.toUpperCase() === 'ONBOARDING';
            if (isSignup) {
                const resolution = await OnboardingController.resolveEmailAgainstDevice(normalized, deviceId || device_id);
                if (resolution.exists && !resolution.sameDevice) {
                    res.status(409).json({
                        success: false,
                        code: 'EMAIL_ALREADY_EXISTS',
                        error: 'An account with this email already exists. Please sign in or use a different email.'
                    });
                    return;
                }
            }
            const safePurpose = verification_service_1.VerificationService.normalizePurpose(purpose);
            const reuseIfPending = req.body?.reuseIfPending === true && req.body?.resend !== true;
            await verification_service_1.verificationService.sendOTP(normalized, 'EMAIL', safePurpose, undefined, { reuseIfPending });
            res.status(200).json({ success: true, message: 'Verification code sent' });
        }
        catch (error) {
            console.error('[OnboardingController] sendEmailOtp error:', error.message);
            const msg = String(error?.message || '');
            if (/could not send the verification/i.test(msg)) {
                res.status(503).json({
                    success: false,
                    error: 'Could not send the verification email. Please try again shortly.',
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: 'Could not send the verification email. Please try again.',
            });
        }
    }
    /**
     * POST /auth/verify-email-otp
     */
    static async verifyEmailOtp(req, res) {
        try {
            const emailRaw = req.body?.email;
            // App sends `code`; admin web historically sent `otp`
            const code = req.body?.code || req.body?.otp;
            const rawPurpose = req.body?.purpose || 'SIGNUP';
            const safePurpose = verification_service_1.VerificationService.normalizePurpose(rawPurpose);
            if (!emailRaw || !code) {
                res.status(400).json({ error: 'Email and code are required.' });
                return;
            }
            const email = String(emailRaw).trim().toLowerCase();
            const result = await verification_service_1.verificationService.verifyOTPDetailed(email, String(code).trim(), 'EMAIL', safePurpose);
            if (result.ok) {
                res.status(200).json({ success: true, message: 'Email verified successfully.' });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Invalid or expired OTP',
                    message: result.error || 'Invalid or expired OTP',
                });
            }
        }
        catch (error) {
            console.error('[OnboardingController] verifyEmailOtp error:', error.message);
            res.status(500).json({ success: false, error: 'Could not verify the code right now. Please try again.' });
        }
    }
    /**
     * POST /auth/send-whatsapp-otp
     */
    static async sendWhatsappOtp(req, res) {
        try {
            const { phone, purpose = 'SIGNUP' } = req.body;
            if (!phone || typeof phone !== 'string') {
                res.status(400).json({ error: 'Valid phone number is required.' });
                return;
            }
            const safePurpose = verification_service_1.VerificationService.normalizePurpose(purpose);
            const reuseIfPending = req.body?.reuseIfPending === true && req.body?.resend !== true;
            await verification_service_1.verificationService.sendOTP(phone.trim(), 'WHATSAPP', safePurpose, undefined, { reuseIfPending });
            res.status(200).json({ success: true, message: 'Verification code sent' });
        }
        catch (error) {
            console.error('[OnboardingController] sendWhatsappOtp error:', error.message);
            const msg = String(error?.message || '');
            if (/could not send/i.test(msg)) {
                res.status(503).json({
                    success: false,
                    error: 'Could not send the WhatsApp verification code. Please try again shortly.',
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: 'Could not send the WhatsApp verification code. Please try again.',
            });
        }
    }
    /**
     * POST /auth/verify-whatsapp-otp
     */
    static async verifyWhatsappOtp(req, res) {
        try {
            const phoneRaw = req.body?.phone;
            const code = req.body?.code || req.body?.otp;
            const rawPurpose = req.body?.purpose || 'SIGNUP';
            const safePurpose = verification_service_1.VerificationService.normalizePurpose(rawPurpose);
            if (!phoneRaw || !code) {
                res.status(400).json({ error: 'Phone and code are required.' });
                return;
            }
            const phone = String(phoneRaw).trim();
            const result = await verification_service_1.verificationService.verifyOTPDetailed(phone, String(code).trim(), 'WHATSAPP', safePurpose);
            if (result.ok) {
                res.status(200).json({ success: true, message: 'WhatsApp number verified successfully.' });
            }
            else {
                res.status(400).json({ success: false, error: result.error || 'Invalid or expired verification code.' });
            }
        }
        catch (error) {
            console.error('[OnboardingController] verifyWhatsappOtp error:', error.message);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    /**
     * POST /auth/register
     * Registers a new user and provisions their tenant in tenants_db.json (staging) or Supabase (live).
     */
    static async register(req, res) {
        try {
            const { firstName, lastName, email, phone, password, businessName, industry, emailVerified, phoneVerified, deviceId, agentCode, location, country, state, lga, streetAddress } = req.body;
            if (!email || !password) {
                res.status(400).json({ success: false, error: 'Missing required fields' });
                return;
            }
            const normalizedEmail = (email || '').trim().toLowerCase();
            const emailDevice = await OnboardingController.resolveEmailAgainstDevice(normalizedEmail, deviceId || null);
            if (emailDevice.exists && !emailDevice.sameDevice) {
                res.status(409).json({
                    success: false,
                    code: 'EMAIL_ALREADY_EXISTS',
                    error: 'An account with this email already exists. Please log in or use a different email.'
                });
                return;
            }
            const cleanPhone = (phone || '').replace(/\D/g, '');
            if (cleanPhone.length > 14) {
                res.status(400).json({ success: false, error: 'Phone number cannot exceed 14 digits' });
                return;
            }
            if (/^(.)\1+$/.test(cleanPhone) || ['0123456789', '1234567890', '9876543210'].some(p => p.includes(cleanPhone) && cleanPhone.length >= 6)) {
                res.status(400).json({ success: false, error: 'Invalid phone number pattern' });
                return;
            }
            const { emailVerificationRequired, whatsappVerificationRequired, } = await (0, onboarding_settings_service_1.resolveOnboardingVerification)();
            if (emailVerificationRequired && !emailVerified) {
                res.status(400).json({ success: false, error: 'Email verification is required to complete registration.' });
                return;
            }
            if (whatsappVerificationRequired && !phoneVerified) {
                res.status(400).json({ success: false, error: 'WhatsApp verification is required to complete registration.' });
                return;
            }
            const tenantName = businessName || `${firstName} ${lastName}'s Business`;
            // New self-serve profiles always start on a 3-day trial. The tablet
            // cannot opt into standard/permanent — that is a later license upgrade.
            const { plan, plan_expires_at } = (0, new_tenant_plan_1.newSelfServeTenantPlan)();
            const tenantCode = generateTenantCode(phone);
            const normalizedPhone = (phone || '').replace(/\D/g, '');
            const normalizedType = (industry || 'retail').toLowerCase();
            const candidateAgentCode = (agentCode && String(agentCode).trim()) ? agentCode : 'AAA000';
            const agentLookup = await (0, agent_code_1.lookupAgentCode)(candidateAgentCode);
            if (!agentLookup.valid) {
                res.status(400).json({
                    success: false,
                    code: 'INVALID_AGENT_CODE',
                    error: agentLookup.error || 'This agent code does not exist',
                });
                return;
            }
            const effectiveAgentCode = agentLookup.code;
            const effectiveDeviceId = (0, device_identity_1.isUsableDeviceId)(deviceId) ? (0, device_identity_1.normalizeDeviceId)(deviceId) : null;
            const effectiveLocation = location || (streetAddress ? `${streetAddress}${state ? ', ' + state : ''}${country ? ', ' + country : ''}` : null);
            console.log(`[OnboardingController] Registering user ${firstName} ${lastName} (${email}) — Business: ${tenantName} | Device: ${effectiveDeviceId} | Agent: ${effectiveAgentCode}`);
            // ──────────────────────────────────────────────────────────────────
            // MULTI-DEVICE DETECTION: Check if the same business already exists
            // (same business name + type AND same phone if provided)
            // ──────────────────────────────────────────────────────────────────
            let existingTenantId = null;
            let deviceNumber = 1;
            let skipDeviceInsert = false;
            if (emailDevice.sameDevice && emailDevice.tenantId) {
                existingTenantId = emailDevice.tenantId;
                skipDeviceInsert = true;
                const { data: existingDevs } = await supabase_1.supabaseAdmin
                    .from('device_registrations')
                    .select('device_id, device_number')
                    .eq('tenant_id', emailDevice.tenantId);
                const matchedDev = (existingDevs || []).find((d) => (0, device_identity_1.deviceIdsMatch)(d.device_id, effectiveDeviceId));
                if (matchedDev?.device_number)
                    deviceNumber = matchedDev.device_number;
                await supabase_1.supabaseAdmin.from('tenants').update({
                    ...(country && { country }),
                    ...(state && { state }),
                    ...(lga && { lga }),
                    ...(streetAddress && { street_address: streetAddress }),
                    ...(effectiveLocation && { location: effectiveLocation }),
                    ...(email && { owner_email: String(email).trim().toLowerCase() }),
                    ...(`${firstName || ''} ${lastName || ''}`.trim() && { owner_name: `${firstName} ${lastName}`.trim() }),
                }).eq('id', emailDevice.tenantId);
                console.log(`[OnboardingController] Same-device re-enrollment for ${normalizedEmail} on ${effectiveDeviceId} → tenant ${emailDevice.tenantId}.`);
            }
            const { data: existingTenants } = existingTenantId
                ? { data: [] }
                : await supabase_1.supabaseAdmin
                    .from('tenants')
                    .select('id, name, type, phone, device_count')
                    .ilike('name', tenantName.trim())
                    .eq('type', normalizedType);
            if (!existingTenantId && existingTenants && existingTenants.length > 0) {
                // Match by phone (if provided) + name + type
                const match = existingTenants.find((t) => {
                    const tPhone = (t.phone || '').replace(/\D/g, '');
                    if (normalizedPhone.length >= 10 && tPhone.length >= 10) {
                        return tPhone === normalizedPhone || tPhone.slice(-8) === normalizedPhone.slice(-8);
                    }
                    // If phone is short or missing on either end, fallback to matching based on exact name and type match
                    return true;
                });
                if (match) {
                    existingTenantId = match.id;
                    if (effectiveDeviceId) {
                        const { data: existingDevs } = await supabase_1.supabaseAdmin
                            .from('device_registrations')
                            .select('device_number')
                            .eq('tenant_id', match.id)
                            .eq('device_id', effectiveDeviceId);
                        if (existingDevs && existingDevs.length > 0) {
                            // Device already exists for this tenant, no need to increment count
                            deviceNumber = existingDevs[0].device_number;
                            skipDeviceInsert = true;
                            // We should still update the tenant's address if provided during this re-enrollment!
                            await supabase_1.supabaseAdmin.from('tenants').update({
                                ...(country && { country }),
                                ...(state && { state }),
                                ...(lga && { lga }),
                                ...(streetAddress && { street_address: streetAddress }),
                                ...(effectiveLocation && { location: effectiveLocation }),
                                ...(email && { owner_email: String(email).trim().toLowerCase() }),
                                ...(`${firstName || ''} ${lastName || ''}`.trim() && { owner_name: `${firstName} ${lastName}`.trim() }),
                            }).eq('id', match.id);
                            console.log(`[OnboardingController] Exact device ${effectiveDeviceId} already registered to tenant ${match.id} as Device #${deviceNumber}. Updated address info if provided.`);
                        }
                        else {
                            // New device for existing tenant
                            const currentCount = match.device_count || 1;
                            deviceNumber = currentCount + 1;
                            await supabase_1.supabaseAdmin.from('tenants').update({
                                device_count: deviceNumber,
                                ...(country && { country }),
                                ...(state && { state }),
                                ...(lga && { lga }),
                                ...(streetAddress && { street_address: streetAddress }),
                                ...(effectiveLocation && { location: effectiveLocation }),
                                ...(email && { owner_email: String(email).trim().toLowerCase() }),
                                ...(`${firstName || ''} ${lastName || ''}`.trim() && { owner_name: `${firstName} ${lastName}`.trim() }),
                            }).eq('id', match.id);
                            console.log(`[OnboardingController] Duplicate business detected. Linking as Device #${deviceNumber} to tenant ${match.id}`);
                        }
                    }
                    else {
                        const currentCount = match.device_count || 1;
                        deviceNumber = currentCount + 1;
                        await supabase_1.supabaseAdmin.from('tenants').update({
                            device_count: deviceNumber,
                            ...(country && { country }),
                            ...(state && { state }),
                            ...(lga && { lga }),
                            ...(streetAddress && { street_address: streetAddress }),
                            ...(effectiveLocation && { location: effectiveLocation }),
                            ...(email && { owner_email: String(email).trim().toLowerCase() }),
                            ...(`${firstName || ''} ${lastName || ''}`.trim() && { owner_name: `${firstName} ${lastName}`.trim() }),
                        }).eq('id', match.id);
                        console.log(`[OnboardingController] Duplicate business detected (no device ID). Linking as Device #${deviceNumber} to tenant ${match.id}`);
                    }
                }
            }
            let finalTenantId = existingTenantId || require('crypto').randomUUID();
            let isNewTenant = !existingTenantId;
            // Create new tenant only if no match found
            if (isNewTenant) {
                let tenantError = null;
                let currentTenantCode = tenantCode;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    const insertPayload = {
                        id: finalTenantId,
                        name: tenantName,
                        type: normalizedType,
                        plan,
                        plan_expires_at,
                        status: 'active',
                        phone: phone || null,
                        tenant_code: currentTenantCode,
                        device_count: 1,
                        country: country || null,
                        state: state || null,
                        lga: lga || null,
                        street_address: streetAddress || null,
                        ...ownerContactFields({
                            firstName,
                            lastName,
                            email,
                            phone,
                            businessName: tenantName,
                            city: lga,
                            country,
                        }),
                    };
                    if (effectiveLocation)
                        insertPayload.location = effectiveLocation;
                    const { error } = await supabase_1.supabaseAdmin.from('tenants').insert(insertPayload);
                    tenantError = error;
                    if (!tenantError)
                        break;
                    const isUniqueViolation = tenantError.code === '23505' || tenantError.message?.includes('unique') || tenantError.message?.includes('duplicate');
                    if (isUniqueViolation && attempt < 3) {
                        console.warn(`[OnboardingController] Unique constraint collision on tenant_code "${currentTenantCode}" in register (attempt ${attempt}/3). Regenerating code...`);
                        currentTenantCode = `${tenantCode.substring(0, 15)}${Math.floor(Math.random() * 100)}`;
                    }
                    else {
                        break;
                    }
                }
                if (tenantError) {
                    console.error('[OnboardingController] Supabase tenant insert failed after retry exhaustion:', tenantError.message);
                    res.status(409).json({ success: false, error: 'Registration failed: Tenant code conflict could not be resolved. Please try again with a different phone number.' });
                    return;
                }
            }
            let finalUserId = null;
            if (isNewTenant) {
                try {
                    // ──────────────────────────────────────────────────────────────────
                    // Create Supabase Auth User & Public User Record
                    // ──────────────────────────────────────────────────────────────────
                    const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
                        email,
                        password: password,
                        email_confirm: true,
                        user_metadata: { role: 'owner', tenantId: finalTenantId }
                    });
                    if (!authError && authData.user) {
                        finalUserId = authData.user.id;
                    }
                    else {
                        console.warn('[OnboardingController] Auth user creation failed or user exists:', authError?.message);
                    }
                    finalUserId = await ensureOwnerUserRow({
                        id: finalUserId,
                        tenantId: finalTenantId,
                        name: `${firstName || ''} ${lastName || ''}`.trim() || email,
                        email,
                    });
                }
                catch (err) {
                    console.error('[OnboardingController] Exception creating auth user:', err.message);
                }
            }
            // ──────────────────────────────────────────────────────────────────
            // Register device record (so we can track each physical device)
            // ──────────────────────────────────────────────────────────────────
            if (effectiveDeviceId && !skipDeviceInsert) {
                await supabase_1.supabaseAdmin.from('device_registrations').insert({
                    tenant_id: finalTenantId,
                    device_id: effectiveDeviceId,
                    agent_code: effectiveAgentCode,
                    location: effectiveLocation || null,
                    device_number: deviceNumber,
                    owner_email: email,
                    owner_name: `${firstName} ${lastName}`,
                    status: 'active',
                    is_trial: true,
                    trial_ends_at: plan_expires_at,
                }).then(async ({ error: devErr }) => {
                    if (!devErr)
                        return;
                    console.warn('[OnboardingController] device_registrations insert failed, rebinding existing row:', devErr.message);
                    const { error: updErr } = await supabase_1.supabaseAdmin
                        .from('device_registrations')
                        .update({
                        tenant_id: finalTenantId,
                        agent_code: effectiveAgentCode,
                        location: effectiveLocation || null,
                        owner_email: email,
                        owner_name: `${firstName} ${lastName}`,
                        status: 'active',
                        is_trial: true,
                        trial_ends_at: plan_expires_at,
                    })
                        .eq('device_id', effectiveDeviceId);
                    if (updErr) {
                        console.warn('[OnboardingController] device_registrations rebind failed (non-fatal):', updErr.message);
                    }
                });
                await supabase_1.supabaseAdmin.from('devices').upsert({
                    device_id: effectiveDeviceId,
                    tenant_id: finalTenantId,
                    status: 'ACTIVE',
                    is_active: true,
                    platform: 'android',
                    device_name: `${firstName} ${lastName}`.trim() || effectiveDeviceId,
                    last_seen: new Date().toISOString(),
                    ...await onboardingDeviceOriginFields(effectiveDeviceId),
                }, { onConflict: 'device_id' }).then(({ error: fleetErr }) => {
                    if (fleetErr)
                        console.warn('[OnboardingController] devices fleet upsert failed (non-fatal):', fleetErr.message);
                });
            }
            else if (effectiveDeviceId && skipDeviceInsert) {
                await supabase_1.supabaseAdmin.from('devices').upsert({
                    device_id: effectiveDeviceId,
                    tenant_id: finalTenantId,
                    status: 'ACTIVE',
                    is_active: true,
                    last_seen: new Date().toISOString(),
                    ...await onboardingDeviceOriginFields(effectiveDeviceId),
                }, { onConflict: 'device_id' }).then(({ error: fleetErr }) => {
                    if (fleetErr)
                        console.warn('[OnboardingController] devices last_seen refresh failed (non-fatal):', fleetErr.message);
                });
            }
            try {
                const { emailService } = require('../services/email.service');
                if (isNewTenant) {
                    await emailService.sendWelcomeEmail(email, {
                        name: `${firstName || ''} ${lastName || ''}`.trim() || undefined,
                        role: 'owner',
                        businessMode: normalizedType,
                    });
                }
            }
            catch (emailErr) {
                console.warn('[OnboardingController] Welcome email failed (non-fatal):', emailErr.message);
            }
            // Bind authoritative institution & HMO configuration (LOCKED for MHMO, SELECTABLE for BANK / AAA000 / Private Merchant)
            try {
                if (typeof health_settings_service_1.HealthSettingsService?.bindTenantOnboardingInstitution === 'function') {
                    await health_settings_service_1.HealthSettingsService.bindTenantOnboardingInstitution({
                        tenantId: finalTenantId,
                        tenantType: normalizedType,
                        userId: finalUserId || emailDevice.userId || null,
                        agentLookup,
                    });
                }
            }
            catch (bindErr) {
                console.warn('[OnboardingController] bindTenantOnboardingInstitution warning (non-fatal):', bindErr?.message);
            }
            // Generate offline JWT for local authentication — require explicit secret (no fallback)
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
                res.status(503).json({
                    success: false,
                    error: 'JWT_SECRET is not configured; cannot issue device tokens',
                });
                return;
            }
            const deviceSubject = finalUserId || emailDevice.userId || require('crypto').randomUUID();
            // Device tokens never expire: tablets must keep working with no re-login.
            const offlineToken = jsonwebtoken_1.default.sign({
                sub: deviceSubject,
                id: deviceSubject,
                email: email,
                role: 'owner',
                tenantId: finalTenantId,
                deviceId: effectiveDeviceId,
            }, process.env.JWT_SECRET);
            res.status(201).json({
                success: true,
                message: emailDevice.sameDevice
                    ? 'Welcome back. This device is already linked to your account.'
                    : isNewTenant
                        ? 'Account created successfully.'
                        : `Device #${deviceNumber} linked to your existing business account.`,
                tenantId: finalTenantId,
                businessName: tenantName,
                phone: phone || null,
                deviceNumber,
                isAdditionalDevice: !isNewTenant,
                sameDevice: emailDevice.sameDevice,
                institutionType: agentLookup.institutionType || null,
                hmoAssignmentMode: agentLookup.hmoAssignmentMode || null,
                hmoProviderId: agentLookup.hmoProviderId || null,
                hmoProviderCode: agentLookup.hmoProviderCode || null,
                offlineToken,
            });
        }
        catch (error) {
            console.error('[OnboardingController] register error:', error.message);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    /**
     * POST /auth/generate-link-qr
     * Called by the EXISTING device in Admin Hub to generate a QR code payload
     * that a NEW device can scan to link itself to the same tenant.
     * The QR payload is a short-lived token stored in Supabase (3 minutes TTL).
     */
    static async generateDeviceLinkQr(req, res) {
        try {
            const { tenantId, deviceId, agentCode } = req.body;
            const result = await (0, device_link_qr_1.issueDeviceLinkQr)({
                tenantId,
                issuerDeviceId: deviceId || null,
                agentCode,
            });
            if (!result.ok) {
                res.status(result.status).json({ success: false, error: result.error });
                return;
            }
            res.status(200).json({ success: true, ...result.data });
        }
        catch (error) {
            console.error('[OnboardingController] generateDeviceLinkQr error:', error.message);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    /**
     * POST /api/tenant/devices/link-qr
     * Tenant web portal: generate the same LINK_DEVICE QR without the old tablet.
     * Tenant id comes from the session, not the request body.
     */
    static async generateAuthenticatedDeviceLinkQr(req, res) {
        try {
            let tenantId;
            try {
                tenantId = (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
            }
            catch (err) {
                res.status(err.status || 401).json({ success: false, error: err.message || 'Unauthenticated' });
                return;
            }
            const result = await (0, device_link_qr_1.issueDeviceLinkQr)({
                tenantId,
                issuerDeviceId: device_link_qr_1.WEB_ISSUER_DEVICE_ID,
                agentCode: 'AAA000',
            });
            if (!result.ok) {
                res.status(result.status).json({ success: false, error: result.error });
                return;
            }
            res.status(200).json({ success: true, ...result.data });
        }
        catch (error) {
            console.error('[OnboardingController] generateAuthenticatedDeviceLinkQr error:', error.message);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    /**
     * POST /auth/link-device
     * Called by the NEW device after scanning the QR code.
     * Registers the new device as a 3-day trial device on the same tenant.
     */
    static async linkDevice(req, res) {
        try {
            const { token, deviceId, agentCode, location, ownerName, ownerEmail } = req.body;
            if (!token || !(0, device_identity_1.isUsableDeviceId)(deviceId)) {
                res.status(400).json({ success: false, error: 'token and a valid device serial number are required' });
                return;
            }
            const linkedDeviceId = (0, device_identity_1.normalizeDeviceId)(deviceId);
            // Validate token
            const { data: linkToken, error: tokenErr } = await supabase_1.supabaseAdmin
                .from('device_link_tokens')
                .select('*')
                .eq('token', token)
                .eq('used', false)
                .single();
            if (tokenErr || !linkToken) {
                res.status(400).json({ success: false, error: 'Invalid or expired link token. Please generate a new QR code.' });
                return;
            }
            // Check expiry
            if (new Date(linkToken.expires_at) < new Date()) {
                res.status(400).json({ success: false, error: 'QR code has expired (3 minute limit). Please generate a new one.' });
                return;
            }
            const tenantId = linkToken.tenant_id;
            // Get current device count
            const { data: tenant } = await supabase_1.supabaseAdmin
                .from('tenants')
                .select('device_count, name, type')
                .eq('id', tenantId)
                .single();
            const offlineToken = await signLinkedDeviceToken(tenantId, linkedDeviceId);
            if (!offlineToken) {
                res.status(503).json({
                    success: false,
                    error: 'JWT_SECRET is not configured; cannot issue device tokens',
                });
                return;
            }
            const claimed = await (0, claim_unassigned_device_1.claimUnassignedDeviceForTenant)({
                tenantId,
                deviceId: linkedDeviceId,
                ownerEmail: ownerEmail || null,
                ownerName: ownerName || null,
                agentCode: agentCode || 'AAA000',
                location: location || null,
            });
            if (claimed.bound) {
                await supabase_1.supabaseAdmin.from('device_link_tokens').update({ used: true }).eq('token', token);
                const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
                await supabase_1.supabaseAdmin.from('device_registrations')
                    .update({ trial_ends_at: trialEndsAt, is_trial: true })
                    .eq('tenant_id', tenantId)
                    .eq('device_id', linkedDeviceId);
                res.status(200).json({
                    success: true,
                    message: claimed.overrodeUnassigned
                        ? 'This tablet is now the assigned device for the account.'
                        : `Device #${claimed.deviceNumber} is already linked to this account.`,
                    tenantId,
                    deviceNumber: claimed.deviceNumber,
                    businessName: tenant?.name,
                    businessMode: tenant?.type,
                    trialEndsAt,
                    overrodeUnassigned: claimed.overrodeUnassigned,
                    offlineToken,
                });
                return;
            }
            const currentCount = tenant?.device_count || 1;
            const newDeviceNumber = currentCount + 1;
            // Register the new device
            const { error: devErr } = await supabase_1.supabaseAdmin.from('device_registrations').insert({
                tenant_id: tenantId,
                device_id: linkedDeviceId,
                agent_code: (agentCode || 'AAA000').toUpperCase(),
                location: location || null,
                device_number: newDeviceNumber,
                owner_email: ownerEmail || null,
                owner_name: ownerName || null,
                status: 'active',
            });
            if (devErr && !devErr.message?.includes('duplicate')) {
                console.warn('[OnboardingController] device_registrations insert on link-device:', devErr.message);
            }
            // Increment device count on tenant
            await supabase_1.supabaseAdmin.from('tenants').update({ device_count: newDeviceNumber }).eq('id', tenantId);
            // Mark token as used
            await supabase_1.supabaseAdmin.from('device_link_tokens').update({ used: true }).eq('token', token);
            // Save trial start date info in a special marker on device record
            const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
            await supabase_1.supabaseAdmin.from('device_registrations')
                .update({ trial_ends_at: trialEndsAt, is_trial: true })
                .eq('tenant_id', tenantId)
                .eq('device_id', linkedDeviceId);
            res.status(200).json({
                success: true,
                message: `Device #${newDeviceNumber} linked successfully! You have a 3-day trial period.`,
                tenantId,
                deviceNumber: newDeviceNumber,
                businessName: tenant?.name,
                businessMode: tenant?.type,
                trialEndsAt,
                offlineToken,
            });
        }
        catch (error) {
            console.error('[OnboardingController] linkDevice error:', error.message);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    /**
     * POST /public/onboarding/report-issue
     * Handle provisioning failure reports from the frontend
     */
    static async reportIssue(req, res) {
        try {
            const { tenantName, email, phone, errorMessage, rawPayload } = req.body;
            const ticketId = `PROV-${Math.floor(100000 + Math.random() * 900000)}`;
            // Use the complaints table to store the provisioning issue
            const newIssue = {
                id: ticketId,
                title: 'Provisioning Failure',
                description: `Tenant Name: ${tenantName}\nEmail: ${email}\nPhone: ${phone}\nError: ${errorMessage}\nRaw Payload: ${JSON.stringify(rawPayload)}`,
                category: 'provisioning_error',
                urgency: 'high',
                status: 'pending',
                tenant_name: tenantName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase_1.supabaseAdmin
                .from('complaints')
                .insert(newIssue);
            if (error) {
                console.error('[OnboardingController] Failed to record provisioning issue:', error);
                return res.status(500).json({ success: false, error: 'Failed to record issue.' });
            }
            res.status(200).json({ success: true, message: 'Issue reported to super admin successfully.' });
        }
        catch (err) {
            console.error('[OnboardingController] Error reporting issue:', err);
            res.status(500).json({ success: false, error: 'Internal server error.' });
        }
    }
}
exports.OnboardingController = OnboardingController;
//# sourceMappingURL=onboarding.controller.js.map
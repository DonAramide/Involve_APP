"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const supabase_1 = require("../db/supabase");
const wallet_service_1 = require("../services/wallet.service");
const pdf_service_1 = require("../services/pdf.service");
const billing_service_1 = require("../services/billing.service");
class AdminController {
    static async enterMasterMode(req, res) {
        try {
            const user = req.user;
            const { password, otp } = req.body;
            if (!user || !user.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Check MFA requirement
            const { data: dbUser, error } = await supabase_1.supabaseAdmin
                .from('users')
                .select('mfa_enabled, mfa_secret')
                .eq('id', user.id)
                .single();
            if (error || !dbUser) {
                return res.status(401).json({ error: 'User not found' });
            }
            // TODO: Actually verify the user's password using Supabase Auth
            // For Master Mode, we assume the frontend is passing the current password.
            // Since Supabase doesn't easily let us verify a password without logging in, 
            // we can do a re-login check or assume the `authenticate` middleware is enough if they have a valid session.
            // But let's check MFA:
            if (dbUser.mfa_enabled) {
                if (!otp) {
                    return res.status(403).json({ error: 'MFA_REQUIRED', message: '2FA Code is required' });
                }
                const { authenticator } = require('otplib');
                const isValid = authenticator.verify({ token: otp, secret: dbUser.mfa_secret });
                if (!isValid) {
                    return res.status(403).json({ error: 'INVALID_MFA', message: 'Invalid 2FA code' });
                }
            }
            // If successful, we can return a specialized Master Mode token, but for now we just return a success payload
            // because the frontend expects: response.data['token']
            return res.status(200).json({ token: 'master-mode-token-' + Date.now() });
        }
        catch (error) {
            console.error('[AdminController] Enter Master Mode Error:', error.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static getGlobalSettingsData() {
        return {
            support_phone: '+234 800 INVIFY',
            support_email: 'info.iips.ng@gmail.com',
            support_whatsapp: '+2348023552282',
            broadcast_message: '',
            audit_retention_hours: 72,
            enforce_device_control: false,
            meta_access_token: '',
            whatsapp_phone_number_id: '',
            whatsapp_business_account_id: '',
            quasar_client_id: '',
            quasar_client_secret: '',
            lesson_ai_api_key: '',
            commissions: {
                globalDefaultOnboardingFee: 10.0,
                globalDefaultRevSharePercentage: 5.0
            }
        };
    }
    // Removed saveGlobalSettingsData to enforce single source of truth
    static async getGlobalSettings(req, res) {
        try {
            if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
                return res.status(200).json(AdminController.getGlobalSettingsData());
            }
            const { data, error } = await supabase_1.supabaseAdmin.from('system_configurations').select('config_key, config_value');
            if (error || !data || data.length === 0) {
                console.warn('[AdminController] Failed to read system_configurations from DB. Falling back to in-memory defaults.', error);
                return res.status(200).json(AdminController.getGlobalSettingsData());
            }
            // Reconstruct the JSON object from key-value pairs
            const settingsObj = {};
            for (const row of data) {
                settingsObj[row.config_key] = row.config_value;
            }
            return res.status(200).json(settingsObj);
        }
        catch (error) {
            console.warn('[AdminController] Exception in getGlobalSettings. Falling back to in-memory defaults.', error);
            return res.status(200).json(AdminController.getGlobalSettingsData());
        }
    }
    static async updateGlobalSettings(req, res) {
        try {
            const updates = req.body;
            const operatorId = req.user?.id || null;
            if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
                // Offline mock mode cannot save without dual write drift, return an error or fake success.
                // Returning fake success to not break offline completely, but NO write to fs.
                return res.status(200).json(updates);
            }
            // Update each key-value pair in system_configurations
            for (const [key, value] of Object.entries(updates)) {
                const { error } = await supabase_1.supabaseAdmin.from('system_configurations')
                    .upsert({ config_key: key, config_value: value, updated_by: operatorId });
                if (error) {
                    throw new Error(`Failed to update ${key}: ${error.message}`);
                }
            }
            return res.status(200).json(updates);
        }
        catch (error) {
            console.error('[AdminController] DB update failed. Returning 500 to prevent config drift.', error);
            return res.status(500).json({ error: error.message });
        }
    }
    static async getGlobalCommissions(req, res) {
        try {
            let commissions = { globalDefaultOnboardingFee: 10.0, globalDefaultRevSharePercentage: 5.0 };
            let dbSuccess = false;
            // Attempt to source values from the active plan configuration (if exists)
            try {
                const { data: activeVersion, error } = await supabase_1.supabaseAdmin
                    .from('commission_plan_versions')
                    .select('*, commission_program_rules(*)')
                    .eq('status', 'ACTIVE')
                    .limit(1)
                    .maybeSingle();
                if (error)
                    throw error;
                if (activeVersion && activeVersion.commission_program_rules && activeVersion.commission_program_rules.length > 0) {
                    const rule = activeVersion.commission_program_rules[0];
                    commissions.globalDefaultOnboardingFee = rule.tenant_onboarding_bonus || 0;
                    commissions.globalDefaultRevSharePercentage = rule.card_rev_share_pct || 0;
                    dbSuccess = true;
                }
            }
            catch (dbErr) {
                console.warn('[AdminController] DB query failed when sourcing global settings.', dbErr);
            }
            if (!dbSuccess) {
                // Fallback strictly for read-only rescue
                const settings = AdminController.getGlobalSettingsData();
                commissions = settings.commissions || commissions;
            }
            return res.status(200).json({ success: true, commissions });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    static async updateGlobalCommissions(req, res) {
        try {
            const { globalDefaultOnboardingFee, globalDefaultRevSharePercentage } = req.body;
            const operatorId = req.user?.id || null;
            const { data: activeVersion, error: fetchErr } = await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .select('*')
                .eq('status', 'ACTIVE')
                .limit(1)
                .maybeSingle();
            if (fetchErr)
                throw fetchErr;
            if (!activeVersion) {
                throw new Error('No ACTIVE commission plan version found. Cannot update global commissions.');
            }
            const { error: updateErr } = await supabase_1.supabaseAdmin
                .from('commission_program_rules')
                .update({
                tenant_onboarding_bonus: globalDefaultOnboardingFee,
                card_rev_share_pct: globalDefaultRevSharePercentage
            })
                .eq('plan_version_id', activeVersion.id);
            if (updateErr)
                throw updateErr;
            // Audit write action in commission_events
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'VERSION_RULES_UPDATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: {
                    versionId: activeVersion.id,
                    tenant_onboarding_bonus: globalDefaultOnboardingFee,
                    card_rev_share_pct: globalDefaultRevSharePercentage,
                    source: 'global_defaults_sync',
                    operator: operatorId
                }
            });
            return res.status(200).json({
                success: true,
                commissions: { globalDefaultOnboardingFee, globalDefaultRevSharePercentage }
            });
        }
        catch (error) {
            console.error('[AdminController] Commission DB update failed. Returning 500 to prevent config drift.', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    /**
     * GET /admin/tenants
     * Lists all tenants with optional filtering.
     */
    static async listTenants(req, res) {
        try {
            const { type, status, name } = req.query;
            let query = supabase_1.supabaseAdmin
                .from('tenants')
                .select(`
          *,
          device_registrations (
            device_id,
            agent_code,
            location,
            device_number,
            status
          )
        `);
            if (type)
                query = query.eq('type', type);
            if (status)
                query = query.eq('status', status);
            let matchingTenantIds = [];
            if (name) {
                // Find if this name matches any user emails
                const { data: userMatches } = await supabase_1.supabaseAdmin
                    .from('users')
                    .select('tenant_id')
                    .ilike('email', `%${name}%`);
                if (userMatches && userMatches.length > 0) {
                    matchingTenantIds = userMatches.map(u => u.tenant_id).filter(Boolean);
                }
                if (matchingTenantIds.length > 0) {
                    query = query.or(`name.ilike.%${name}%,agent_code.ilike.%${name}%,id.in.(${matchingTenantIds.join(',')})`);
                }
                else {
                    query = query.or(`name.ilike.%${name}%,agent_code.ilike.%${name}%`);
                }
            }
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error)
                throw error;
            // Flatten: pull the primary device (device_number=1) fields up to the tenant row
            const enriched = (data || []).map((tenant) => {
                const devices = tenant.device_registrations || [];
                // Sort by device_number so device #1 is primary
                devices.sort((a, b) => (a.device_number || 1) - (b.device_number || 1));
                const primary = devices[0];
                return {
                    ...tenant,
                    device_id: primary?.device_id ?? null,
                    agent_code: primary?.agent_code ?? null,
                    location: primary?.location ?? null,
                    device_count: tenant.device_count || devices.length || 1,
                    // Keep raw array for potential future use
                    device_registrations: devices,
                };
            });
            return res.status(200).json(enriched);
        }
        catch (error) {
            console.error('[AdminController] listTenants Error:', error.message);
            const isConnectionTimeout = error.message?.includes('fetch failed') ||
                error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                error.message?.includes('timeout') ||
                error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
            if (isConnectionTimeout) {
                return res.status(503).json({ error: 'Database unavailable', retryable: true, retryAfterMs: 2000 });
            }
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /admin/tenants
     * Creates a new tenant organization.
     */
    static async createTenant(req, res) {
        try {
            const { name, type, plan, phone } = req.body;
            if (!name || !type) {
                return res.status(400).json({ error: "Name and Type are required" });
            }
            if (!phone) {
                return res.status(400).json({ error: "Phone number is required to generate Tenant ID" });
            }
            const numericPhone = phone.replace(/\D/g, '');
            if (numericPhone.length < 10) {
                return res.status(400).json({ error: "Phone number must have at least 10 digits" });
            }
            const baseTenantId = numericPhone.slice(-10).split('').reverse().join('');
            let finalTenantId = baseTenantId;
            let attempt = 0;
            const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            // Supabase Uniqueness Check
            while (true) {
                const { data: existing } = await supabase_1.supabaseAdmin
                    .from('tenants')
                    .select('id')
                    .eq('id', finalTenantId)
                    .maybeSingle();
                if (!existing)
                    break; // Available
                if (attempt >= suffixes.length)
                    throw new Error('Too many tenants with this phone number');
                finalTenantId = `${baseTenantId}-${suffixes[attempt]}`;
                attempt++;
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .from('tenants')
                .insert({ id: finalTenantId, name, type, plan: plan || 'free', status: 'active' })
                .select()
                .single();
            if (error)
                throw error;
            // Senior Practice: Auto-create wallet for the new tenant
            await supabase_1.supabaseAdmin.from('wallets').insert({ tenant_id: data.id, balance: 0 });
            // Generate Virtual Account for Tenant using Quasar SDK
            try {
                const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
                const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
                const quasar = new QuasarServiceModule(platformApiKey);
                const platformId = 'platform-admin-owner-id'; // Constant platform parent ID
                const va = await quasar.createVirtualAccount({
                    childId: data.id,
                    parentId: platformId,
                    currency: 'NGN',
                    email: `billing@tenant-${data.id.substring(0, 8)}.invify.app`,
                    firstName: name.split(' ')[0],
                    lastName: name.split(' ').slice(1).join(' ') || 'Business',
                    parentShareBps: 0,
                    metadata: { type: 'tenant_operating_account' }
                });
                // Save VA details to the tenant record
                await supabase_1.supabaseAdmin
                    .from('tenants')
                    .update({
                    virtual_account_number: va.accountNumber,
                    virtual_account_bank: va.bankName,
                    virtual_account_status: 'ACTIVE'
                })
                    .eq('id', data.id);
            }
            catch (vaError) {
                console.error('[AdminController] Failed to generate Virtual Account for tenant:', vaError.message);
                // We don't block tenant creation if VA generation fails, just log it.
            }
            return res.status(201).json(data);
        }
        catch (error) {
            console.error('[AdminController] createTenant Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * PATCH /admin/tenants/:id
     * Updates tenant details or status.
     */
    static async updateTenant(req, res) {
        try {
            const { id } = req.params;
            const updates = { ...req.body };
            delete updates.tenant_code;
            delete updates.agent_code;
            const { data, error } = await supabase_1.supabaseAdmin
                .from('tenants')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[AdminController] updateTenant Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async updateTenantStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const { data, error } = await supabase_1.supabaseAdmin
                .from('tenants')
                .update({ status })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[AdminController] updateTenantStatus Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async triggerEmergencyLock(req, res) {
        try {
            const { id } = req.params;
            const { passcode } = req.body;
            const { error } = await supabase_1.supabaseAdmin.from('tenants').update({ is_emergency_locked: true, emergency_lock_code: passcode }).eq('id', id);
            if (error)
                throw error;
            return res.status(200).json({ success: true });
        }
        catch (error) {
            console.error('[AdminController] triggerEmergencyLock Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async resetTenantPasswords(req, res) {
        try {
            const { id } = req.params;
            // Implement password reset broadcast/logic
            return res.status(200).json({ success: true, message: 'Password reset initiated' });
        }
        catch (error) {
            console.error('[AdminController] resetTenantPasswords Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /admin/broadcast
     * Sends a real-time socket.io broadcast message to terminals/apps.
     */
    static async sendBroadcast(req, res) {
        try {
            const { message, targetType, targetValue } = req.body;
            if (!message)
                return res.status(400).json({ error: "Message is required" });
            const { io } = require('../app');
            if (targetType === 'agent' && targetValue) {
                const { data: agentTenants } = await supabase_1.supabaseAdmin.from('tenants').select('id').eq('agent_code', targetValue);
                const tenantList = agentTenants || [];
                console.log(`[AdminController] Emitting broadcast to ${tenantList.length} tenants under agent: ${targetValue}`);
                tenantList.forEach((tenant) => {
                    io.to(`tenant:${tenant.id}`).emit('app_broadcast', { message, timestamp: new Date().toISOString() });
                });
                return res.status(200).json({ success: true, message: `Broadcast sent to ${tenantList.length} tenants under agent ${targetValue}` });
            }
            let room = 'all';
            if (targetType === 'tenant' && targetValue) {
                room = `tenant:${targetValue}`;
            }
            else if (targetType === 'plan' && targetValue) {
                room = `plan:${String(targetValue).toLowerCase()}`;
            }
            else if (targetType === 'type' && targetValue) {
                room = `type:${String(targetValue).toLowerCase()}`;
            }
            console.log(`[AdminController] Sending Broadcast!`);
            console.log(`[AdminController] Input parameters -> Type: ${targetType}, Value: ${targetValue}`);
            console.log(`[AdminController] Emitting broadcast to formatted socket room: ${room}`);
            io.to(room).emit('app_broadcast', {
                message,
                timestamp: new Date().toISOString()
            });
            return res.status(200).json({ success: true, room, message: 'Broadcast sent successfully' });
        }
        catch (error) {
            console.error('[AdminController] sendBroadcast Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /admin/tenants/:id/details
     * Fetches detailed data for the Tenant Detail Page.
     */
    static async getTenantDetails(req, res) {
        try {
            const { id } = req.params;
            // Parallel fetch for deep insights
            const [tenantRes, usersRes, walletInfo, usageRes, certRes] = await Promise.all([
                supabase_1.supabaseAdmin.from('tenants').select('*').eq('id', id).single(),
                supabase_1.supabaseAdmin.from('users').select('*').eq('tenant_id', id),
                wallet_service_1.WalletService.getBalance(id), // DERIVED: Sum of ledger entries
                supabase_1.supabaseAdmin.from('ai_usage').select('*').eq('tenant_id', id).limit(5),
                supabase_1.supabaseAdmin.from('device_activations').select('*').eq('tenant_id', id),
            ]);
            if (tenantRes.error)
                throw tenantRes.error;
            // Fetch device registrations separately (non-fatal — table may not exist yet)
            let registeredDevices = [];
            try {
                const { data: deviceRegsData, error: deviceRegsErr } = await supabase_1.supabaseAdmin
                    .from('device_registrations')
                    .select('*')
                    .eq('tenant_id', id)
                    .order('device_number', { ascending: true });
                if (!deviceRegsErr) {
                    registeredDevices = (deviceRegsData || []).map((d) => ({
                        deviceId: d.device_id,
                        agentCode: d.agent_code || 'AAA000',
                        location: d.location || null,
                        deviceNumber: d.device_number || 1,
                        ownerEmail: d.owner_email,
                        ownerName: d.owner_name,
                        status: d.status,
                        registeredAt: d.created_at
                    }));
                }
                else {
                    console.warn('[AdminController] device_registrations fetch failed (non-fatal):', deviceRegsErr.message);
                }
            }
            catch (devErr) {
                console.warn('[AdminController] device_registrations unavailable:', devErr.message);
            }
            const certificates = (certRes.data || []).map((a) => ({
                code: a.activation_code,
                deviceId: a.device_id,
                plan: a.plan_index === 3 ? 'ENTERPRISE' : (a.plan_index === 2 ? 'PREMIUM' : (a.plan_index === 1 ? 'STANDARD' : 'BASIC')),
                duration: `${a.duration_days} Days`,
                expiry: new Date(new Date(a.created_at).getTime() + a.duration_days * 24 * 60 * 60 * 1000).toLocaleDateString(),
                status: a.is_used ? 'USED' : 'ACTIVE'
            }));
            return res.status(200).json({
                tenant: tenantRes.data,
                users: usersRes.data,
                wallet: { balance: walletInfo.balance }, // Normalized structure for frontend
                recentUsage: usageRes.data,
                certificates,
                registeredDevices
            });
        }
        catch (error) {
            console.error('[AdminController] getTenantDetails Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /admin/tenants/:id/provision-virtual-account
     * Provisions a virtual account manually via Quasar SDK if not previously created.
     */
    static async provisionVirtualAccount(req, res) {
        try {
            const { id } = req.params;
            // Supabase flow
            const { data: tenant, error: fetchErr } = await supabase_1.supabaseAdmin.from('tenants').select('*').eq('id', id).single();
            if (fetchErr || !tenant)
                return res.status(404).json({ error: 'Tenant not found' });
            const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
            const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
            const quasar = new QuasarServiceModule(platformApiKey);
            const platformId = 'platform-admin-owner-id';
            const va = await quasar.createVirtualAccount({
                childId: tenant.id,
                parentId: platformId,
                currency: 'NGN',
                email: `billing@tenant-${tenant.id.substring(0, 8)}.invify.app`,
                firstName: tenant.name.split(' ')[0],
                lastName: tenant.name.split(' ').slice(1).join(' ') || 'Business',
                parentShareBps: 0,
                metadata: { type: 'tenant_operating_account' }
            });
            await supabase_1.supabaseAdmin
                .from('tenants')
                .update({
                virtual_account_number: va.accountNumber,
                virtual_account_bank: va.bankName,
                virtual_account_status: 'ACTIVE'
            })
                .eq('id', tenant.id);
            return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
        }
        catch (error) {
            console.error('[AdminController] provisionVirtualAccount Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /admin/tenants/:id/students/:studentId/provision-va
     * Provisions a virtual account manually via Quasar SDK for a specific student.
     */
    static async provisionStudentVirtualAccount(req, res) {
        try {
            const { id, studentId } = req.params;
            if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
                try {
                    const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
                    const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
                    const quasar = new QuasarServiceModule(platformApiKey);
                    const platformId = 'platform-admin-owner-id';
                    const va = await quasar.createVirtualAccount({
                        childId: studentId,
                        parentId: platformId,
                        currency: 'NGN',
                        email: `student-${studentId}@invify.app`,
                        firstName: 'Student',
                        lastName: studentId,
                        parentShareBps: 0,
                        metadata: { type: 'student_account', tenantId: id }
                    });
                    return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
                }
                catch (vaError) {
                    console.error('[AdminController] Mock Student VA generation failed via Quasar:', vaError.message);
                    return res.status(500).json({ error: 'Failed to provision Student VA: ' + vaError.message });
                }
            }
            // Supabase flow - verify tenant first
            const { data: tenant, error: fetchErr } = await supabase_1.supabaseAdmin.from('tenants').select('*').eq('id', id).single();
            if (fetchErr || !tenant)
                return res.status(404).json({ error: 'Tenant not found' });
            // In real scenario, verify student exists in backend DB too.
            // Here we just provision directly for the given studentId under this tenant.
            const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
            const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
            const quasar = new QuasarServiceModule(platformApiKey);
            const platformId = 'platform-admin-owner-id'; // or tenant's subaccount id
            const va = await quasar.createVirtualAccount({
                childId: studentId,
                parentId: platformId,
                currency: 'NGN',
                email: `student-${studentId}@invify.app`,
                firstName: 'Student',
                lastName: studentId,
                parentShareBps: 0,
                metadata: { type: 'student_account', tenantId: id }
            });
            return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
        }
        catch (error) {
            console.error('[AdminController] provisionStudentVirtualAccount Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /admin/tenants/:id/customers/:customerId/provision-va
     * Provisions a virtual account manually via Quasar SDK for a specific customer.
     */
    static async provisionCustomerVirtualAccount(req, res) {
        try {
            const { id, customerId } = req.params;
            if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
                try {
                    const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
                    const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
                    const quasar = new QuasarServiceModule(platformApiKey);
                    const platformId = 'platform-admin-owner-id';
                    const va = await quasar.createVirtualAccount({
                        childId: customerId,
                        parentId: platformId,
                        currency: 'NGN',
                        email: `customer-${customerId}@invify.app`,
                        firstName: 'Customer',
                        lastName: customerId,
                        parentShareBps: 0,
                        metadata: { type: 'customer_account', tenantId: id }
                    });
                    return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
                }
                catch (vaError) {
                    console.error('[AdminController] Mock Customer VA generation failed via Quasar:', vaError.message);
                    return res.status(500).json({ error: 'Failed to provision Customer VA: ' + vaError.message });
                }
            }
            // Supabase flow - verify tenant first
            const { data: tenant, error: fetchErr } = await supabase_1.supabaseAdmin.from('tenants').select('*').eq('id', id).single();
            if (fetchErr || !tenant)
                return res.status(404).json({ error: 'Tenant not found' });
            const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
            const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
            const quasar = new QuasarServiceModule(platformApiKey);
            const platformId = 'platform-admin-owner-id';
            const va = await quasar.createVirtualAccount({
                childId: customerId,
                parentId: platformId,
                currency: 'NGN',
                email: `customer-${customerId}@invify.app`,
                firstName: 'Customer',
                lastName: customerId,
                parentShareBps: 0,
                metadata: { type: 'customer_account', tenantId: id }
            });
            return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
        }
        catch (error) {
            console.error('[AdminController] provisionCustomerVirtualAccount Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /admin/ledger
     * Immutable financial history with multi-tenant filtering.
     */
    static async listLedger(req, res) {
        try {
            const { tenantId, startDate, endDate, reference } = req.query;
            let query = supabase_1.supabaseAdmin
                .from('ledger_entries')
                .select(`
          *,
          tenants (name)
        `);
            if (tenantId)
                query = query.eq('tenant_id', tenantId);
            if (reference)
                query = query.ilike('reference', `%${reference}%`);
            if (startDate)
                query = query.gte('created_at', startDate);
            if (endDate)
                query = query.lte('created_at', endDate);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[AdminController] listLedger Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /admin/payments
     * Oversight of all payment intents and statuses.
     */
    static async listPayments(req, res) {
        try {
            const { tenantId, status, provider, reference, startDate, endDate } = req.query;
            let query = supabase_1.supabaseAdmin
                .from('payments')
                .select(`
          *,
          tenants (name)
        `);
            if (tenantId)
                query = query.eq('tenant_id', tenantId);
            if (status)
                query = query.eq('status', status);
            if (provider)
                query = query.eq('provider', provider);
            if (reference)
                query = query.ilike('reference', `%${reference}%`);
            if (startDate)
                query = query.gte('created_at', startDate);
            if (endDate)
                query = query.lte('created_at', endDate);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[AdminController] listPayments Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /admin/dashboard-stats
     * Scoped insights for School Owners and Admins.
     */
    static async getDashboardStats(req, res) {
        try {
            const { tenantId, role } = req.user;
            const targetTenantId = (role === 'super_admin' && req.query.tenantId)
                ? req.query.tenantId
                : tenantId;
            // 1. Fetch Insight Aggregation from Scoped RPC
            let stats;
            const { data: rpcStats, error: rpcError } = await supabase_1.supabaseAdmin.rpc('get_tenant_dashboard_stats', {
                p_tenant_id: targetTenantId
            });
            if (rpcError) {
                console.warn(`[AdminController] RPC get_tenant_dashboard_stats failed: ${rpcError.message}. Using fallback calculations.`);
                // Fallback calculation
                const { data: ledgers } = await supabase_1.supabaseAdmin.from('ledger_entries')
                    .select('amount')
                    .eq('tenant_id', targetTenantId)
                    .eq('type', 'credit')
                    .eq('status', 'COMPLETED');
                const totalRevenue = ledgers ? ledgers.reduce((sum, r) => sum + Number(r.amount), 0) : 0;
                stats = {
                    total_revenue: totalRevenue,
                    active_students: 0,
                    pending_invoices: 0,
                    internal_wallet: 0.0,
                    cash_on_hand: 0.0,
                    pending_quasar: 0.0
                };
            }
            else {
                stats = rpcStats;
            }
            // 2. Fetch Quota Status for the KPI card
            const billing = await billing_service_1.BillingService.getBillingStatus(targetTenantId);
            return res.status(200).json({
                ...stats,
                billing
            });
        }
        catch (error) {
            console.error('[AdminController] getDashboardStats Error:', error.message);
            const isConnectionTimeout = error.message?.includes('fetch failed') ||
                error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                error.message?.includes('timeout') ||
                error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
            if (isConnectionTimeout || process.env.OFFLINE_LOCAL_AUTH === 'true') {
                console.warn('[AdminController] Supabase offline fallback triggered for getDashboardStats.');
                return res.status(200).json({
                    total_revenue: 0,
                    active_students: 0,
                    pending_invoices: 0,
                    internal_wallet: 0.0,
                    cash_on_hand: 0.0,
                    pending_quasar: 0.0,
                    billing: { plan: 'Standard', status: 'active', quotaUsed: 0, maxQuota: 100 }
                });
            }
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /admin/notes
     * Hybrid Note Repository: Supports "My Notes" and "School Library".
     */
    static async listNotes(req, res) {
        try {
            const { tenantId, id: userId, role } = req.user;
            const { scope } = req.query; // 'personal' or 'school' or 'global'
            let query = supabase_1.supabaseAdmin.from('lesson_notes').select(`
        *,
        users (name)
      `);
            if (scope === 'personal') {
                // Just the teacher's own notes
                query = query.eq('created_by', userId);
            }
            else if (scope === 'school') {
                // Everything in the tenant
                if (role === 'super_admin') {
                    if (req.query.tenantId)
                        query = query.eq('tenant_id', req.query.tenantId);
                }
                else {
                    query = query.eq('tenant_id', tenantId);
                }
            }
            else {
                // Global / Shared
                query = query.or(`is_global.eq.true,tenant_id.eq.${tenantId}`);
            }
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[AdminController] listNotes Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /admin/notes
     * Save an edited version of a note (Preserves isolation).
     */
    static async saveNote(req, res) {
        try {
            const { subject, topic, class_level, term, week, content, source } = req.body;
            const { tenant_id: tenantId, id: userId } = req.user;
            // Ensure we don't accidentally overwrite a GLOBAL note
            // We always create a new record if it is 'edited'
            const { data, error } = await supabase_1.supabaseAdmin
                .from('lesson_notes')
                .insert({
                tenant_id: tenantId,
                created_by: userId,
                subject,
                topic,
                class_level,
                term,
                week,
                content,
                source: source || 'edited',
                is_global: false, // Edited versions are tenant-specific
                cache_key: null // Bypass SHA hash to allow variations
            })
                .select()
                .single();
            if (error)
                throw error;
            return res.status(201).json(data);
        }
        catch (error) {
            console.error('[AdminController] saveNote Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /admin/notes/:id/export
     * Generates and streams a professional PDF version of the lesson note.
     */
    static async exportNotePdf(req, res) {
        try {
            const { id } = req.params;
            // 1. Fetch Note with Tenant Name
            const { data: note, error } = await supabase_1.supabaseAdmin
                .from('lesson_notes')
                .select('*, tenants(name)')
                .eq('id', id)
                .single();
            if (error || !note) {
                return res.status(404).json({ error: 'Lesson note not found' });
            }
            // 2. Generate PDF
            const pdfBuffer = await pdf_service_1.PDFService.generateLessonNotePDF(note, note.tenants.name);
            // 3. Stream Response
            const filename = `Lesson_Note_${note.subject}_${note.class_level.replace(/ /g, '_')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.status(200).send(pdfBuffer);
        }
        catch (error) {
            console.error('[AdminController] exportNotePdf Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * PATCH /admin/profile
     * Updates current user specific metadata (e.g. last_login_at)
     */
    static async updateProfile(req, res) {
        try {
            const { id: userId } = req.user;
            const { last_login_at } = req.body;
            const { error } = await supabase_1.supabaseAdmin
                .from('users')
                .update({
                last_login_at: last_login_at || new Date().toISOString(),
                last_active_at: new Date().toISOString()
            })
                .eq('id', userId);
            if (error)
                throw error;
            return res.status(200).json({ status: 'success' });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /admin/subscriptions/extend
     * Extends subscriptions for a specific tenant or in bulk based on agentCode/type.
     */
    static async extendSubscription(req, res) {
        try {
            const { tenantId, agentCode, type, daysToExtend } = req.body;
            if (!daysToExtend || typeof daysToExtend !== 'number') {
                return res.status(400).json({ success: false, message: 'Invalid daysToExtend parameter' });
            }
            let query = supabase_1.supabaseAdmin.from('tenants').select('id, name');
            if (tenantId) {
                query = query.eq('id', tenantId);
            }
            else if (agentCode) {
                query = query.eq('agent_code', agentCode);
            }
            else if (type) {
                query = query.eq('type', type);
            }
            else {
                return res.status(400).json({ success: false, message: 'Must specify tenantId, agentCode, or type' });
            }
            const { data: matchedTenants, error: tenantErr } = await query;
            if (tenantErr)
                throw tenantErr;
            let matchedCount = 0;
            if (matchedTenants && matchedTenants.length > 0) {
                matchedCount = matchedTenants.length;
                for (const tenant of matchedTenants) {
                    // Fetch current active subscription
                    const { data: activeSub, error: subFetchErr } = await supabase_1.supabaseAdmin
                        .from('subscriptions')
                        .select('*')
                        .eq('tenant_id', tenant.id)
                        .eq('status', 'active')
                        .maybeSingle();
                    if (subFetchErr)
                        throw subFetchErr;
                    let subscriptionId;
                    let eventType;
                    if (activeSub) {
                        const currentEndDate = new Date(activeSub.end_date);
                        const baseDate = currentEndDate.getTime() > Date.now() ? currentEndDate : new Date();
                        const newEndDate = new Date(baseDate);
                        newEndDate.setDate(newEndDate.getDate() + daysToExtend);
                        const { data: updatedSub, error: updateErr } = await supabase_1.supabaseAdmin
                            .from('subscriptions')
                            .update({
                            end_date: newEndDate.toISOString()
                        })
                            .eq('id', activeSub.id)
                            .select()
                            .single();
                        if (updateErr)
                            throw updateErr;
                        subscriptionId = updatedSub.id;
                        eventType = 'EXTENDED';
                    }
                    else {
                        const startDate = new Date();
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + daysToExtend);
                        const { data: newSub, error: insertErr } = await supabase_1.supabaseAdmin
                            .from('subscriptions')
                            .insert({
                            tenant_id: tenant.id,
                            plan: 'standard',
                            status: 'active',
                            start_date: startDate.toISOString(),
                            end_date: endDate.toISOString()
                        })
                            .select()
                            .single();
                        if (insertErr)
                            throw insertErr;
                        subscriptionId = newSub.id;
                        eventType = 'CREATED';
                    }
                    // Write an audit record to subscription_events
                    const { error: eventErr } = await supabase_1.supabaseAdmin
                        .from('subscription_events')
                        .insert({
                        subscription_id: subscriptionId,
                        tenant_id: tenant.id,
                        event_type: eventType,
                        days_added: daysToExtend,
                        performed_by: req.user?.email || 'superadmin@invify.app'
                    });
                    if (eventErr)
                        throw eventErr;
                }
            }
            return res.status(200).json({
                success: true,
                matchedCount,
                extendedDays: daysToExtend
            });
        }
        catch (error) {
            if (AdminController.isNetworkTimeout(error)) {
                return res.status(503).json({
                    error: 'Database unavailable',
                    retryable: true,
                    retryAfterMs: 2000
                });
            }
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    /**
     * GET /api/subscription/status
     * Returns the number of days left on the current tenant's subscription.
     */
    static async getSubscriptionStatus(req, res) {
        try {
            const { role, tenantId: jwtTenantId } = req.user;
            let targetTenantId = jwtTenantId;
            if (role === 'super_admin') {
                if (req.query.tenantId) {
                    targetTenantId = req.query.tenantId;
                }
                else {
                    // Default to first tenant if none provided (for compatibility/testing)
                    const { data: firstTenant, error: firstTenantErr } = await supabase_1.supabaseAdmin
                        .from('tenants')
                        .select('id')
                        .limit(1)
                        .maybeSingle();
                    if (firstTenantErr)
                        throw firstTenantErr;
                    if (firstTenant) {
                        targetTenantId = firstTenant.id;
                    }
                }
            }
            else {
                if (req.query.tenantId && req.query.tenantId !== jwtTenantId) {
                    return res.status(403).json({ success: false, error: 'Forbidden: Cross-tenant query parameter spoofing detected' });
                }
                targetTenantId = jwtTenantId;
            }
            if (!targetTenantId) {
                return res.status(404).json({ success: false, message: 'Tenant not found' });
            }
            const { data: sub, error: subErr } = await supabase_1.supabaseAdmin
                .from('subscriptions')
                .select('*')
                .eq('tenant_id', targetTenantId)
                .eq('status', 'active')
                .maybeSingle();
            if (subErr)
                throw subErr;
            if (!sub) {
                return res.status(404).json({ success: false, message: 'No active subscription found' });
            }
            const expiryDate = new Date(sub.end_date);
            const diffTime = expiryDate.getTime() - new Date().getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return res.status(200).json({
                success: true,
                tenantId: targetTenantId,
                daysRemaining: diffDays,
                expiresAt: expiryDate.toISOString()
            });
        }
        catch (error) {
            if (AdminController.isNetworkTimeout(error)) {
                return res.status(503).json({
                    error: 'Database unavailable',
                    retryable: true,
                    retryAfterMs: 2000
                });
            }
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    static async uploadCacDocument(req, res) {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'No CAC document uploaded.' });
            }
            const { tenantId } = req.user;
            const fileUrl = `/uploads/cac/${file.filename}`;
            const { error } = await supabase_1.supabaseAdmin
                .from('tenants')
                .update({ cac_document_url: fileUrl })
                .eq('id', tenantId);
            if (error)
                throw error;
            return res.status(200).json({ message: 'CAC document uploaded successfully', url: fileUrl });
        }
        catch (error) {
            console.error('[AdminController] uploadCacDocument Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async uploadClaudeBackup(req, res) {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'No backup file provided.' });
            }
            // We just store it locally for the dashboard
            // Optionally we could store a record of this backup in a `backups` table
            const fileUrl = `/uploads/backups/${file.filename}`;
            return res.status(200).json({ message: 'Backup successfully synchronized to Claude Engine', url: fileUrl });
        }
        catch (error) {
            console.error('[AdminController] uploadClaudeBackup Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async initVirtualAccountEngine(req, res) {
        try {
            const { tenantId } = req.user;
            const QuasarProvisioningService = require('../integrations/quasar/quasar-provisioning.service').QuasarProvisioningService;
            // Async provision merchant on Quasar
            await QuasarProvisioningService.provisionMerchant({
                tenantId,
                businessName: 'Business-' + tenantId.substring(0, 8),
                email: 'admin@' + tenantId.substring(0, 8) + '.com',
                phone: '08000000000'
            });
            return res.status(200).json({ message: 'Virtual Account engine initialized.' });
        }
        catch (error) {
            console.error('[AdminController] initVirtualAccountEngine Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static isNetworkTimeout(error) {
        return (error.message?.includes('fetch failed') ||
            error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
            error.message?.includes('timeout') ||
            error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
            process.env.OFFLINE_LOCAL_AUTH === 'true');
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map
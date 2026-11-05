"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
const uuid_1 = require("uuid");
const supabase_1 = require("../../db/supabase");
const agent_repository_1 = require("./repositories/agent.repository");
const password_policy_1 = require("../../utils/password-policy");
const kyc_storage_1 = require("./utils/kyc-storage");
const agent_access_service_1 = require("./services/agent-access.service");
const agent_fee_read_model_1 = require("./services/agent-fee-read-model");
const institution_classification_service_1 = require("../health-insurance/services/institution-classification.service");
const hmo_portal_service_1 = require("../health-insurance/services/hmo-portal.service");
const defaultMasterAgent = {
    id: (0, uuid_1.v4)(),
    agentCode: 'AAA000',
    passwordHash: 'AAA000',
    isFirstLogin: true,
    name: 'Master Setup Agent',
    email: 'master@invify.app',
    phone: '+2348000000000',
    whatsappNumber: '+2348000000000',
    address: '1 Master Admin Way',
    kycStatus: 'VERIFIED',
    status: 'ACTIVE',
    commissions: 0,
    points: 0,
    createdAt: new Date()
};
// No mock DB fallbacks
class AgentController {
    /**
     * Request password reset for an agent.
     * Always answers with the same message so the endpoint cannot be used to probe which emails are agents.
     */
    static async forgotPassword(req, res) {
        const genericReply = {
            success: true,
            message: 'If an agent account exists for this email, password reset instructions have been sent.',
        };
        try {
            const email = String(req.body?.email || '').trim().toLowerCase();
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }
            const { data: agent } = await supabase_1.supabaseAdmin
                .from('agents')
                .select('id, email, first_name, last_name, status')
                .eq('email', email)
                .is('deleted_at', null)
                .maybeSingle();
            if (agent && agent.status !== 'TERMINATED') {
                const sent = await agent_access_service_1.agentAccessService.sendPasswordReset(agent.email, `${agent.first_name} ${agent.last_name}`.trim());
                if (!sent)
                    console.warn(`[AgentForgotPassword] Reset email could not be delivered for agent ${agent.id}`);
            }
            return res.json(genericReply);
        }
        catch (err) {
            console.error('[AgentForgotPassword] Error:', err?.message || err);
            return res.json(genericReply);
        }
    }
    /**
     * Complete a password set/reset from the one-time link sent by email.
     */
    static async resetPassword(req, res) {
        try {
            const tokenHash = String(req.body?.token_hash || '').trim();
            const password = String(req.body?.password || '');
            if (!tokenHash || !password) {
                return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
            }
            const result = await agent_access_service_1.agentAccessService.completePasswordSet(tokenHash, password, req.body?.email);
            if (!result.ok) {
                return res.status(result.status).json({ success: false, message: result.message });
            }
            return res.json({ success: true, message: 'Your password has been set. You can now sign in.', email: result.email });
        }
        catch (err) {
            console.error('[AgentResetPassword] Error:', err?.message || err);
            return res.status(500).json({ success: false, message: 'Could not set password. Please request a new link.' });
        }
    }
    // ==========================================
    // AGENT PORTAL ROUTES
    // ==========================================
    /**
     * Agent Login logic
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required' });
            }
            // Check Maintenance Mode Global Lockout
            let is_maintenance_locked = false;
            let maintenance_message = 'System is currently under maintenance. Please try again later.';
            try {
                const { data, error } = await supabase_1.supabase.from('system_configurations').select('config_key, config_value').in('config_key', ['is_maintenance_locked', 'maintenance_message']);
                if (!error && data && data.length > 0) {
                    for (const row of data) {
                        if (row.config_key === 'is_maintenance_locked')
                            is_maintenance_locked = row.config_value === true || row.config_value === 'true';
                        if (row.config_key === 'maintenance_message')
                            maintenance_message = row.config_value;
                    }
                }
            }
            catch (dbErr) {
                is_maintenance_locked = false;
            }
            if (is_maintenance_locked) {
                return res.status(403).json({
                    success: false,
                    message: maintenance_message
                });
            }
            let authData = null;
            let authError = null;
            try {
                const result = await supabase_1.supabase.auth.signInWithPassword({ email, password });
                authData = result.data;
                authError = result.error;
            }
            catch (networkErr) {
                authError = networkErr;
            }
            if (authError || !authData?.session) {
                const msg = String(authError?.message || authError || '');
                const code = authError?.code || authError?.cause?.code;
                const connectivity = code === 'UND_ERR_CONNECT_TIMEOUT' ||
                    /fetch failed|ConnectTimeout|timeout|network|ENOTFOUND|ECONNREFUSED|offline/i.test(`${msg} ${authError?.cause?.message || ''}`);
                if (connectivity) {
                    return res.status(503).json({
                        success: false,
                        error: 'AUTH_SERVICE_UNAVAILABLE',
                        message: 'No internet connection. Institute login needs a network connection to Auth.',
                        retryable: true,
                    });
                }
                return res.status(401).json({ success: false, message: 'Invalid agent credentials' });
            }
            let { data: agent, error: agentError } = await supabase_1.supabaseAdmin
                .from('agents')
                .select('*')
                .eq('auth_user_id', authData.user.id)
                .is('deleted_at', null)
                .maybeSingle();
            if ((!agent || agentError) && email) {
                const byEmail = await supabase_1.supabaseAdmin
                    .from('agents')
                    .select('*')
                    .ilike('email', String(email).trim())
                    .is('deleted_at', null)
                    .maybeSingle();
                agent = byEmail.data;
                agentError = byEmail.error;
            }
            if (agentError || !agent) {
                return res.status(403).json({ success: false, message: 'Access forbidden. Agent profile not found.' });
            }
            if (agent.status === 'PENDING') {
                return res.status(403).json({ success: false, message: 'Your account is pending review by Invify Staff. You will be notified once approved.' });
            }
            if (agent.status === 'SUSPENDED') {
                return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
            }
            await supabase_1.supabase.from('agent_sessions').insert({
                agent_id: agent.id,
                token: authData.session.access_token,
                ip_address: req.ip || '',
                browser: req.headers['user-agent'] || '',
                status: 'ACTIVE'
            });
            const { data: agentProfile } = await supabase_1.supabaseAdmin
                .from('agent_profiles')
                .select('mfa_enabled, logo_url')
                .eq('agent_id', agent.id)
                .maybeSingle();
            const mfaEnabled = Boolean(agentProfile?.mfa_enabled);
            const logoUrl = agent.logo_url || agentProfile?.logo_url || null;
            const tradingName = agent.trading_name || null;
            const instCtx = await institution_classification_service_1.institutionClassificationService
                .resolveForAgentOrUser({
                authUserId: authData.user.id,
                email: agent.email,
                agentRecord: agent,
            })
                .catch(() => null);
            return res.status(200).json({
                success: true,
                mfaRequired: mfaEnabled,
                token: authData.session.access_token,
                agent: {
                    id: agent.id,
                    email: agent.email,
                    agentCode: agent.agent_code,
                    agent_code: agent.agent_code,
                    name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.email,
                    first_name: agent.first_name,
                    last_name: agent.last_name,
                    trading_name: tradingName,
                    tradingName: tradingName,
                    logo_url: logoUrl,
                    logoUrl: logoUrl,
                    phone: agent.phone || agent.phone_number || null,
                    status: agent.status,
                    kycStatus: instCtx?.kycStatus || agent.kyc_status || null,
                    institution_type: instCtx?.institutionType || agent.institution_type || 'BANK',
                    institutionType: instCtx?.institutionType || agent.institution_type || 'BANK',
                    portal_mode: instCtx?.portalMode || 'BANK',
                    portalMode: instCtx?.portalMode || 'BANK',
                    institution_id: instCtx?.institutionId || null,
                    institution_name: instCtx?.institutionName || null,
                    hmo_provider_id: instCtx?.hmoProviderId || null,
                    hmo_role: instCtx?.hmoRole || null,
                    hmo_permissions: instCtx?.hmoPermissions || [],
                    created_at: agent.created_at,
                    profile: { mfa_enabled: mfaEnabled },
                }
            });
        }
        catch (err) {
            const msg = String(err?.message || err || '');
            if (/fetch failed|ConnectTimeout|timeout|network|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
                return res.status(503).json({
                    success: false,
                    error: 'AUTH_SERVICE_UNAVAILABLE',
                    message: 'No internet connection. Institute login needs a network connection to Auth.',
                    retryable: true,
                });
            }
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Public Agent Registration
     */
    static async register(req, res) {
        try {
            const { fullName, email, phone, password, whatsappNumber, address, passportImage, idCard, agentCode } = req.body;
            if (!fullName || !email || !password) {
                return res.status(400).json({ success: false, message: 'Full name, email, and password are required' });
            }
            const { data: existing } = await supabase_1.supabase.from('agents').select('id').eq('email', email).single();
            if (existing) {
                return res.status(400).json({ success: false, message: 'An agent with this email already exists' });
            }
            // Generate a temporary code until approved
            const tempCode = `AGT-${Math.floor(1000 + Math.random() * 9000)}`;
            let passportUrl = '';
            let idCardUrl = '';
            // 1. Upload KYC assets to Contabo S3 Storage
            if (passportImage && passportImage.startsWith('data:')) {
                try {
                    passportUrl = await (0, kyc_storage_1.uploadBase64ToContabo)(passportImage, 'passports', `${email.replace(/[@.]/g, '_')}_passport`);
                }
                catch (s3Err) {
                    console.error('[AgentRegister] Passport S3 Upload Error:', s3Err.message);
                }
            }
            if (idCard && idCard.startsWith('data:')) {
                try {
                    idCardUrl = await (0, kyc_storage_1.uploadBase64ToContabo)(idCard, 'ids', `${email.replace(/[@.]/g, '_')}_id`);
                }
                catch (s3Err) {
                    console.error('[AgentRegister] ID Card S3 Upload Error:', s3Err.message);
                }
            }
            // 2. Write to Supabase auth & tables (agents & agent_profiles)
            const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;
            let supabaseUserId = undefined;
            if (hasSupabase) {
                try {
                    const { data: authData, error: authError } = await supabase_1.supabase.auth.admin.createUser({
                        email: email,
                        password: password,
                        email_confirm: true,
                        user_metadata: {
                            role: 'AGENT',
                            name: fullName
                        }
                    });
                    supabaseUserId = authData?.user?.id;
                    if (authError || !supabaseUserId) {
                        console.warn('[AgentRegister] Supabase Auth creation warning (using fallback UUID):', authError?.message);
                        supabaseUserId = (0, uuid_1.v4)();
                    }
                    const firstName = fullName.split(' ')[0] || fullName;
                    const lastName = fullName.split(' ').slice(1).join(' ') || 'Agent';
                    const { data: dbAgent, error: dbAgentError } = await supabase_1.supabase
                        .from('agents')
                        .insert({
                        auth_user_id: supabaseUserId,
                        agent_code: agentCode || tempCode,
                        email: email,
                        first_name: firstName,
                        last_name: lastName,
                        phone: phone,
                        status: 'PENDING'
                    })
                        .select()
                        .single();
                    if (dbAgentError) {
                        console.error('[AgentRegister] Supabase Agents table insert failed:', dbAgentError.message);
                    }
                    else if (dbAgent) {
                        const { error: profileError } = await supabase_1.supabase
                            .from('agent_profiles')
                            .insert({
                            agent_id: dbAgent.id,
                            address: address || '',
                            profile_photo_url: passportUrl || '',
                            kyc_status: 'PENDING'
                        });
                        if (profileError) {
                            console.error('[AgentRegister] Supabase Agent Profiles table insert failed:', profileError.message);
                        }
                    }
                }
                catch (supabaseErr) {
                    console.error('[AgentRegister] Supabase integration error:', supabaseErr.message);
                }
            }
            return res.status(201).json({
                success: true,
                message: 'Registration successful. Please wait for Invify Staff approval.',
                agent: {
                    id: supabaseUserId || tempCode,
                    email: email,
                    name: fullName
                }
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * First-time password change
     */
    static async changePassword(req, res) {
        try {
            const { agentCode, oldPassword, newPassword } = req.body;
            // Resolve email from agentCode
            const { data: existing } = await supabase_1.supabase.from('agents').select('email').eq('agent_code', agentCode).single();
            if (!existing)
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            // Authenticate old password
            const { data: authData, error: authError } = await supabase_1.supabase.auth.signInWithPassword({ email: existing.email, password: oldPassword });
            if (authError || !authData.session) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            if (oldPassword === newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'New password cannot be the same as your current password.',
                });
            }
            const policy = (0, password_policy_1.evaluatePasswordPolicy)(String(newPassword || ''), {
                email: existing.email,
                currentPassword: oldPassword,
            });
            if (!policy.ok) {
                return res.status(400).json({ success: false, message: policy.errors[0] });
            }
            // Update password
            const { error: updateError } = await supabase_1.supabase.auth.updateUser({ password: newPassword });
            if (updateError) {
                return res.status(500).json({ success: false, message: 'Failed to update password' });
            }
            return res.status(200).json({
                success: true,
                message: 'Password changed successfully. You can now log in.',
                token: authData.session.access_token,
                agent: {
                    agentCode,
                    name: authData.user.user_metadata?.name || 'Agent'
                }
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * Get agent dashboard stats and onboarded tenants
     */
    /**
     * Get Field Agent Portal Operations Dashboard Data
     */
    /**
     * Get Field Agent Portal Operations Dashboard Data
     */
    static async getDashboard(req, res) {
        try {
            const authUser = req.user;
            if (!authUser || !authUser.id) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
            let { data: agent, error } = await supabase_1.supabaseAdmin
                .from('agents')
                .select('*')
                .eq('auth_user_id', authUser.id)
                .is('deleted_at', null)
                .maybeSingle();
            if ((!agent || error) && authUser.agentId) {
                const byId = await supabase_1.supabaseAdmin
                    .from('agents')
                    .select('*')
                    .eq('id', authUser.agentId)
                    .is('deleted_at', null)
                    .maybeSingle();
                agent = byId.data;
                error = byId.error;
            }
            if ((!agent || error) && authUser.email) {
                const byEmail = await supabase_1.supabaseAdmin
                    .from('agents')
                    .select('*')
                    .ilike('email', String(authUser.email).trim())
                    .is('deleted_at', null)
                    .maybeSingle();
                agent = byEmail.data;
                error = byEmail.error;
            }
            if (error || !agent) {
                return res.status(403).json({ success: false, message: 'Institute profile not found. Access forbidden.' });
            }
            const agentId = agent.id;
            const agentCode = String(agent.agent_code || '').trim();
            const attributed = await (0, agent_fee_read_model_1.loadAttributedTenantIds)(agentId, agentCode).catch(() => ({
                tenantIds: [],
                attributedTenants: [],
            }));
            const ownedTenantIds = attributed.tenantIds;
            // 2. Fetch Core Data (Fault Tolerant)
            // Tenants: agent_tenants plus tenants.agent_code attribution (no second relationship table)
            const { data: tenants } = await supabase_1.supabaseAdmin
                .from('agent_tenants')
                .select('*')
                .eq('agent_id', agentId)
                .is('deleted_at', null);
            const linkedTenants = tenants || [];
            const allTenants = attributed.attributedTenants.length ? attributed.attributedTenants : linkedTenants;
            const now = new Date();
            const thisMonthTenants = allTenants.filter((t) => new Date(t.created_at).getMonth() === now.getMonth() && new Date(t.created_at).getFullYear() === now.getFullYear());
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthTenants = allTenants.filter((t) => new Date(t.created_at).getMonth() === lastMonth.getMonth() && new Date(t.created_at).getFullYear() === lastMonth.getFullYear());
            const calcGrowth = (curr, prev) => {
                if (prev === 0 && curr === 0)
                    return 'Insufficient History';
                if (prev === 0 && curr > 0)
                    return 'New Metric';
                const growth = Math.round(((curr - prev) / prev) * 100);
                return growth > 0 ? `↑ ${growth}% compared to last month` : (growth < 0 ? `↓ ${Math.abs(growth)}% compared to last month` : 'No change');
            };
            // Leads / Pipeline
            let pipeline = {
                prospects: 0,
                contacted: 0,
                kycSubmitted: 0,
                approved: 0,
                activated: 0,
                limitedMode: false
            };
            const { data: leads, error: leadsErr } = await supabase_1.supabaseAdmin.from('agent_leads').select('*').eq('agent_id', agentId);
            if (leadsErr) {
                pipeline.limitedMode = true;
                pipeline.kycSubmitted = allTenants.filter((t) => t.status === 'PENDING').length;
                pipeline.approved = allTenants.filter((t) => t.status === 'APPROVED').length;
                pipeline.activated = allTenants.filter((t) => t.status === 'ACTIVE').length;
            }
            else {
                const allLeads = leads || [];
                pipeline.prospects = allLeads.filter((l) => l.status === 'NEW').length;
                pipeline.contacted = allLeads.filter((l) => l.status === 'CONTACTED').length;
                pipeline.kycSubmitted = allTenants.filter((t) => t.status === 'PENDING').length;
                pipeline.approved = allTenants.filter((t) => t.status === 'APPROVED').length;
                pipeline.activated = allTenants.filter((t) => t.status === 'ACTIVE').length;
            }
            // Wallet & Commissions
            const { data: wallet } = await supabase_1.supabaseAdmin.from('agent_wallets').select('*').eq('agent_id', agentId).maybeSingle();
            const { data: ledger } = await supabase_1.supabaseAdmin.from('wallet_ledger').select('*').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(5);
            const { data: commissions } = await supabase_1.supabaseAdmin.from('commission_events').select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
            // Reputation
            const { data: reputation } = await supabase_1.supabaseAdmin.from('agent_reputation_summary').select('*').eq('agent_id', agentId).maybeSingle();
            const { count: rankCount } = await supabase_1.supabaseAdmin.from('agent_reputation_summary').select('agent_id', { count: 'exact', head: true }).gt('trust_score', reputation?.trust_score || 0);
            const rank = (rankCount || 0) + 1;
            // Terminals & Devices
            let terminalMetrics = { assigned: 0, activated: 0, pending: 0, offline: 0, activationRate: 0, syncSuccessRate: 100, lastAssigned: null };
            const { data: terminals, error: termErr } = await supabase_1.supabaseAdmin.from('pos_terminals').select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
            if (!termErr && terminals && terminals.length > 0) {
                terminalMetrics.assigned = terminals.length;
                terminalMetrics.activated = terminals.filter((t) => t.status === 'ACTIVE').length;
                terminalMetrics.pending = terminals.filter((t) => t.status === 'PENDING').length;
                terminalMetrics.offline = terminals.filter((t) => t.status === 'OFFLINE').length;
                terminalMetrics.activationRate = Math.round((terminalMetrics.activated / terminalMetrics.assigned) * 100);
                terminalMetrics.syncSuccessRate = Math.round(((terminalMetrics.assigned - terminalMetrics.offline) / terminalMetrics.assigned) * 100);
                terminalMetrics.lastAssigned = terminals[0].created_at;
            }
            let deviceMetrics = { assigned: 0, activated: 0, pending: 0, offline: 0, activationRate: 0, deploymentSuccess: 0, offlineRate: 0, lastActivated: null };
            const { data: devices, error: devErr } = await supabase_1.supabaseAdmin.from('agent_devices').select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
            if (!devErr && devices && devices.length > 0) {
                deviceMetrics.assigned = devices.length;
                deviceMetrics.activated = devices.filter((d) => d.status === 'ACTIVE').length;
                deviceMetrics.pending = devices.filter((d) => d.status === 'PENDING').length;
                deviceMetrics.offline = devices.filter((d) => d.status === 'OFFLINE').length;
                deviceMetrics.activationRate = Math.round((deviceMetrics.activated / deviceMetrics.assigned) * 100);
                deviceMetrics.deploymentSuccess = Math.round(((deviceMetrics.assigned - deviceMetrics.pending) / deviceMetrics.assigned) * 100);
                deviceMetrics.offlineRate = Math.round((deviceMetrics.offline / deviceMetrics.assigned) * 100);
                deviceMetrics.lastActivated = devices.find((d) => d.status === 'ACTIVE')?.created_at || devices[0].created_at;
            }
            // Territory Logic
            let territoryName = agent.territory || agent.region || agent.operational_area;
            if (!territoryName && allTenants.length > 0) {
                // Derive from portfolio
                const terrCounts = allTenants.reduce((acc, t) => {
                    const loc = t.city || t.state || t.region;
                    if (loc) {
                        acc[loc] = (acc[loc] || 0) + 1;
                    }
                    return acc;
                }, {});
                if (Object.keys(terrCounts).length > 0) {
                    territoryName = Object.keys(terrCounts).reduce((a, b) => terrCounts[a] > terrCounts[b] ? a : b);
                }
            }
            if (!territoryName)
                territoryName = 'Territory Not Assigned';
            // Attendance
            let attendance = { enabled: true, status: 'Active', checkIn: '08:00 AM', location: 'Unknown', hours: '0h', score: 100, message: '' };
            const { data: attData, error: attErr } = await supabase_1.supabaseAdmin.from('agent_attendance').select('*').eq('agent_id', agentId).maybeSingle();
            if (attErr) {
                attendance = { enabled: false, status: 'Offline', checkIn: '', location: '', hours: '', score: 0, message: 'Attendance tracking will be enabled once the Workforce Management module is deployed.' };
            }
            const recentMerchants = allTenants.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
            const feeOrchestration = await (0, agent_fee_read_model_1.loadAgentFeeReadModel)(agentCode, ownedTenantIds, agentId).catch(() => ({
                assessed_kobo: 0,
                pending_payable_kobo: 0,
                recent: [],
            }));
            const pendingOnboarding = allTenants.filter((t) => {
                const status = String(t.status || '').toUpperCase();
                return status === 'PENDING' || status === 'ONBOARDING' || status === 'PENDING_APPROVAL';
            }).length;
            const activeTenants = allTenants.filter((t) => String(t.status || '').toUpperCase() === 'ACTIVE').length;
            const instCtx = await institution_classification_service_1.institutionClassificationService
                .resolveForAgentOrUser({
                authUserId: authUser.id,
                email: agent.email,
                agentRecord: agent,
            })
                .catch(() => null);
            let hmoDashboard = null;
            if (instCtx && instCtx.institutionType === 'HMO' && instCtx.portalMode === 'HMO' && instCtx.hmoProviderId) {
                hmoDashboard = await hmo_portal_service_1.hmoPortalService.getDashboardOverview(instCtx).catch(() => null);
            }
            const payload = {
                success: true,
                identity: {
                    id: agent.id,
                    agent_code: agentCode,
                    name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.name,
                    email: agent.email || null,
                    phone: agent.phone || agent.phone_number || null,
                    status: agent.status || null,
                    agent_type: agent.agent_type || agent.type || null,
                    institution: instCtx?.institutionName || agent.institution_name || agent.bank_name || agent.institution || null,
                    institution_type: instCtx?.institutionType || 'BANK',
                    institutionType: instCtx?.institutionType || 'BANK',
                    portal_mode: instCtx?.portalMode || 'BANK',
                    portalMode: instCtx?.portalMode || 'BANK',
                    institution_id: instCtx?.institutionId || null,
                    hmo_provider_id: instCtx?.hmoProviderId || null,
                    hmo_role: instCtx?.hmoRole || null,
                    hmo_permissions: instCtx?.hmoPermissions || [],
                    approval_status: instCtx?.approvalStatus || agent.status || 'ACTIVE',
                    restriction_reason: instCtx?.restrictionReason || null,
                    date_joined: agent.created_at || null,
                    kyc_status: instCtx?.kycStatus || agent.kyc_status || null,
                    territory: territoryName || null,
                },
                institutionContext: instCtx,
                hmoDashboard,
                kpis: {
                    totalMerchants: { value: allTenants.length, trend: 'Insufficient History' },
                    totalTenants: { value: allTenants.length, trend: 'Insufficient History' },
                    activeTenants: { value: activeTenants, trend: 'Insufficient History' },
                    pendingOnboarding: { value: pendingOnboarding, trend: 'Insufficient History' },
                    thisMonth: { value: thisMonthTenants.length, trend: calcGrowth(thisMonthTenants.length, lastMonthTenants.length) },
                    activeDevices: { value: deviceMetrics.activated, trend: 'Insufficient History' },
                    activeTerminals: { value: terminalMetrics.activated, trend: 'Insufficient History' },
                    earnedCommissions: { value: wallet?.total_earned || 0, trend: calcGrowth(wallet?.total_earned || 0, 0) },
                    assessedCommissionKobo: { value: Number(feeOrchestration.assessed_kobo || 0), trend: 'SHADOW' },
                    pendingCommissionKobo: { value: Number(feeOrchestration.pending_payable_kobo || 0), trend: 'NOT YET AVAILABLE' },
                    availableCommissionKobo: { value: 0, trend: 'NOT YET AVAILABLE' },
                    availableBalance: { value: wallet?.available_balance || 0, trend: 'Legacy wallet' },
                    reputationScore: { value: reputation?.score || 0, trend: 'No change' }
                },
                targets: {
                    monthlyTarget: 50,
                    completed: thisMonthTenants.length,
                    remaining: Math.max(50 - thisMonthTenants.length, 0),
                    percentage: Math.min(Math.round((thisMonthTenants.length / 50) * 100), 100)
                },
                pipeline: pipeline,
                tasks: [
                    ...(pipeline.kycSubmitted > 0 ? [{ id: 1, title: 'Upload KYC', text: `${pipeline.kycSubmitted} merchants awaiting KYC`, priority: 'High', actionKey: 'upload_kyc' }] : []),
                    ...(terminalMetrics.pending > 0 ? [{ id: 2, title: 'Assign Terminal', text: `${terminalMetrics.pending} pending terminal assignments`, priority: 'Medium', actionKey: 'assign_terminal' }] : []),
                ],
                alerts: [
                    ...(terminalMetrics.offline > 0 ? [{ id: 1, text: `${terminalMetrics.offline} terminals offline`, severity: 'Warning' }] : []),
                    ...(pipeline.kycSubmitted > 5 ? [{ id: 2, text: `KYC Backlog: ${pipeline.kycSubmitted} items`, severity: 'Critical' }] : []),
                ],
                deployments: {
                    terminals: terminalMetrics,
                    devices: deviceMetrics
                },
                wallet: {
                    summary: {
                        availableBalance: wallet?.available_balance || 0,
                        pendingEarnings: wallet?.pending_balance || 0,
                        pendingBalance: wallet?.pending_balance || 0,
                        totalEarnings: wallet?.total_earned || 0
                    },
                    ledger: ledger || [],
                    recentCommissions: (commissions || []).slice(0, 5),
                    payout_execution_enabled: Boolean(feeOrchestration.payout_execution_enabled),
                },
                feeOrchestration,
                portfolioHealth: {
                    healthy: allTenants.filter((t) => t.status === 'ACTIVE').length,
                    attentionRequired: allTenants.filter((t) => t.status === 'SUSPENDED' || t.status === 'PENDING').length,
                    dormant: allTenants.filter((t) => t.status === 'DORMANT').length,
                },
                territory: {
                    name: territoryName,
                    merchants: allTenants.length,
                    active: allTenants.filter((t) => t.status === 'ACTIVE').length,
                    pending: allTenants.filter((t) => t.status === 'PENDING').length
                },
                attendance: attendance,
                recentMerchants: recentMerchants,
                analytics: {
                    merchantGrowth: [], // Kept empty to trigger new empty state logic
                    commissionTrend: (feeOrchestration.charts?.commission_by_day || []).map((d) => Number(d.assessed_kobo || 0)),
                    activationFunnel: [
                        pipeline.prospects + pipeline.contacted + pipeline.kycSubmitted + pipeline.approved + pipeline.activated,
                        pipeline.kycSubmitted + pipeline.approved + pipeline.activated,
                        pipeline.approved + pipeline.activated,
                        pipeline.activated
                    ]
                },
                reputation: {
                    trust_score: reputation?.trust_score || 0,
                    level_name: reputation?.level_name || 'New Agent',
                    rank: rank || '-'
                },
                quickActions: [
                    { label: 'Create Lead', route: '/institute/leads', icon: 'person_add' },
                    { label: 'Upload KYC', route: '/institute/profile?tab=kyc', icon: 'file_upload' },
                    { label: 'Assign Device', route: '/institute/assign-device', icon: 'devices' },
                    { label: 'Assign Terminal', route: '/institute/assign-terminal', icon: 'point_of_sale' },
                    { label: 'Request Withdrawal', route: '/institute/wallet', icon: 'payments' },
                    { label: 'Support Ticket', route: '/institute/support', icon: 'support_agent' }
                ]
            };
            return res.status(200).json(payload);
        }
        catch (err) {
            console.error('[getDashboard] Error:', err);
            return res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
        }
    }
    static async assignHardware(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { data: agent } = await supabase_1.supabase.from('agents').select('*').eq('auth_user_id', authUserId).single();
            if (!agent)
                return res.status(404).json({ success: false, message: 'Agent not found' });
            const instCtx = await institution_classification_service_1.institutionClassificationService
                .resolveForAgentOrUser({ authUserId, email: agent.email, agentRecord: agent })
                .catch(() => null);
            if (instCtx?.institutionType === 'HMO' || instCtx?.institutionType === 'HOSPITAL') {
                return res.status(403).json({
                    success: false,
                    message: `Hardware assignment is a Bank/Aggregator operation and is forbidden for ${instCtx.institutionType} institutions.`,
                });
            }
            const agentId = agent.id;
            const { type, tenantId, serialNumber } = req.body;
            if (!tenantId || !serialNumber) {
                return res.status(400).json({ success: false, message: 'Tenant and Serial Number are required' });
            }
            if (type === 'DEVICE') {
                // Check if device already exists in devices
                const { data: existingDevice } = await supabase_1.supabase
                    .from('devices')
                    .select('id')
                    .eq('device_id', serialNumber)
                    .maybeSingle();
                if (existingDevice) {
                    const { error } = await supabase_1.supabase
                        .from('devices')
                        .update({
                        tenant_id: tenantId,
                        status: 'active',
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', existingDevice.id);
                    if (error)
                        throw new Error('Failed to update device assignment: ' + error.message);
                }
                else {
                    const { error } = await supabase_1.supabase
                        .from('devices')
                        .insert({
                        tenant_id: tenantId,
                        device_id: serialNumber,
                        device_name: 'Agent-Assigned Device',
                        status: 'active'
                    });
                    if (error)
                        throw new Error('Failed to create device assignment: ' + error.message);
                }
            }
            else if (type === 'TERMINAL') {
                // Check if terminal exists in terminal_inventory
                const { data: existingTerminal } = await supabase_1.supabase
                    .from('terminal_inventory')
                    .select('id')
                    .or(`pos_serial_number.eq.${serialNumber},terminal_id.eq.${serialNumber}`)
                    .maybeSingle();
                if (existingTerminal) {
                    const { error } = await supabase_1.supabase
                        .from('terminal_inventory')
                        .update({
                        assigned_tenant_id: tenantId,
                        assignment_status: 'assigned',
                        assigned_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', existingTerminal.id);
                    if (error)
                        throw new Error('Failed to update terminal assignment: ' + error.message);
                }
                else {
                    const { error } = await supabase_1.supabase
                        .from('terminal_inventory')
                        .insert({
                        terminal_id: serialNumber,
                        pos_serial_number: serialNumber,
                        assigned_tenant_id: tenantId,
                        assignment_status: 'assigned',
                        assigned_at: new Date().toISOString(),
                        terminal_type: 'N3'
                    });
                    if (error)
                        throw new Error('Failed to create terminal assignment: ' + error.message);
                }
            }
            else {
                return res.status(400).json({ success: false, message: 'Invalid hardware type' });
            }
            return res.status(200).json({ success: true, message: 'Hardware assigned successfully' });
        }
        catch (err) {
            console.error('[AssignHardware] Error:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    static async syncHardware(req, res) {
        try {
            const authUser = req.user;
            if (authUser?.id || authUser?.email) {
                const instCtx = await institution_classification_service_1.institutionClassificationService
                    .resolveForAgentOrUser({ authUserId: authUser.id, email: authUser.email })
                    .catch(() => null);
                if (instCtx?.institutionType === 'HMO' || instCtx?.institutionType === 'HOSPITAL') {
                    return res.status(403).json({
                        success: false,
                        message: `Hardware sync is forbidden for ${instCtx.institutionType} institutions.`,
                    });
                }
            }
            // Dummy sync endpoint for the UI to hit
            return res.status(200).json({ success: true, message: 'Hardware sync initiated' });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    static async updateAgentStatus(req, res) {
        return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
    }
    static async updateAgentKyc(req, res) {
        return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
    }
    static async getAgentCommissions(req, res) {
        return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
    }
    static async updateAgentCommissions(req, res) {
        return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
    }
    static async messageAgent(req, res) {
        return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
    }
    static async messageAgentTenants(req, res) {
        return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
    }
    static async resolveSuspension(req, res) {
        try {
            const { email, passportImage, idCard, answer, address, phone, whatsappNumber } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Agent email is required.' });
            }
            // Check if mock mode is active
            if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
                return res.status(200).json({
                    success: true,
                    message: 'Suspension resolution successfully submitted (Mock Mode)'
                });
            }
            // 1. Fetch the Agent
            const { data: agent, error: agentErr } = await supabase_1.supabase
                .from('agents')
                .select('*')
                .eq('email', email)
                .single();
            if (agentErr || !agent) {
                return res.status(404).json({ success: false, message: 'Agent not found.' });
            }
            // 2. Upload images to S3
            let passportUrl = '';
            let idCardUrl = '';
            if (passportImage && passportImage.startsWith('data:')) {
                try {
                    passportUrl = await (0, kyc_storage_1.uploadBase64ToContabo)(passportImage, 'passports', `${email.replace(/[@.]/g, '_')}_passport`);
                }
                catch (s3Err) {
                    console.error('[ResolveSuspension] Passport Upload Error:', s3Err.message);
                }
            }
            if (idCard && idCard.startsWith('data:')) {
                try {
                    idCardUrl = await (0, kyc_storage_1.uploadBase64ToContabo)(idCard, 'ids', `${email.replace(/[@.]/g, '_')}_id`);
                }
                catch (s3Err) {
                    console.error('[ResolveSuspension] ID Card Upload Error:', s3Err.message);
                }
            }
            // 3. Update the agent status to ACTIVE
            const oldStatus = agent.status;
            const { error: updateAgentErr } = await supabase_1.supabase
                .from('agents')
                .update({
                status: 'ACTIVE',
                phone: phone || agent.phone
            })
                .eq('id', agent.id);
            if (updateAgentErr) {
                throw updateAgentErr;
            }
            // 4. Log status history change
            await supabase_1.supabase
                .from('agent_status_history')
                .insert({
                agent_id: agent.id,
                old_status: oldStatus,
                new_status: 'ACTIVE',
                changed_by: agent.id, // Agent self-resolution
                reason: `Suspension resolved. Answer submitted: ${answer || 'N/A'}`
            });
            // 5. Update agent profile
            const profileUpdates = {
                kyc_status: 'VERIFIED'
            };
            if (address)
                profileUpdates.address = address;
            if (passportUrl)
                profileUpdates.profile_photo_url = passportUrl;
            const { error: profileErr } = await supabase_1.supabase
                .from('agent_profiles')
                .upsert({
                agent_id: agent.id,
                ...profileUpdates,
                updated_at: new Date().toISOString()
            });
            if (profileErr) {
                console.error('[ResolveSuspension] Agent Profile update failed:', profileErr.message);
            }
            // 6. Log audit event
            try {
                await agent_repository_1.agentRepository.logAudit(agent.id, 'AGENT', agent.id, 'RESOLVE_SUSPENSION', { old_status: oldStatus }, { new_status: 'ACTIVE', answer, idCardUrl, passportUrl }, req.ip || '', req.headers['user-agent'] || '');
            }
            catch (auditErr) {
                console.error('[ResolveSuspension] Audit log failed:', auditErr.message);
            }
            return res.status(200).json({
                success: true,
                message: 'Suspension successfully resolved and account activated.'
            });
        }
        catch (err) {
            console.error('[ResolveSuspension] Error:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.AgentController = AgentController;
//# sourceMappingURL=agent.controller.js.map
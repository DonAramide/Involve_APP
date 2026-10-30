"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentAccessService = exports.AgentAccessService = exports.AgentAccessError = void 0;
const crypto_1 = require("crypto");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_1 = require("../../../db/supabase");
const build_variant_1 = require("../../../config/build-variant");
const email_service_1 = require("../../../services/email.service");
const password_policy_1 = require("../../../utils/password-policy");
const agent_repository_1 = require("../repositories/agent.repository");
class AgentAccessError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'AgentAccessError';
    }
}
exports.AgentAccessError = AgentAccessError;
function isAlreadyRegistered(message) {
    const m = message.toLowerCase();
    return m.includes('already') && (m.includes('registered') || m.includes('exists'));
}
class AgentAccessService {
    getPortalUrls() {
        const configured = build_variant_1.BuildVariantService.getInstance().getAgentPortalUrl();
        const url = new URL(configured);
        const rewritten = url.pathname.replace(/\/agent(\/|$)/g, '/institute$1');
        const setPasswordUrl = rewritten.includes('reset-password')
            ? `${url.origin}${rewritten}`
            : `${url.origin}/institute/reset-password`;
        return { loginUrl: `${url.origin}/institute/login`, setPasswordUrl };
    }
    /**
     * Creates the Supabase login for a new agent with an unusable random password.
     * The agent chooses their own password through the emailed set-password link.
     */
    async createLogin(email, name) {
        const { data, error } = await supabase_1.supabaseAuthAdmin.auth.admin.createUser({
            email,
            password: `${(0, crypto_1.randomBytes)(24).toString('base64url')}Aa1!`,
            email_confirm: true,
            user_metadata: { role: 'AGENT', name },
        });
        if (error || !data?.user) {
            const message = error?.message || 'unknown error';
            if (isAlreadyRegistered(message)) {
                throw new AgentAccessError('This email already has an Invify login. Use a different email for the agent.', 409);
            }
            throw new AgentAccessError(`Failed to create agent login: ${message}`, 502);
        }
        return data.user.id;
    }
    async deleteLogin(authUserId) {
        try {
            const result = await supabase_1.supabaseAuthAdmin.auth.admin.deleteUser(authUserId);
            if (result?.error)
                throw result.error;
        }
        catch (err) {
            console.error(`[AgentAccess] Failed to roll back auth user ${authUserId}:`, err?.message || err);
        }
    }
    async buildSetPasswordLink(email) {
        const { data, error } = await supabase_1.supabaseAuthAdmin.auth.admin.generateLink({ type: 'recovery', email });
        const tokenHash = data?.properties?.hashed_token;
        if (error || !tokenHash) {
            throw new AgentAccessError(`Could not generate password link: ${error?.message || 'no token returned'}`, 502);
        }
        const { setPasswordUrl } = this.getPortalUrls();
        const params = new URLSearchParams({ token_hash: tokenHash, type: 'recovery', email });
        return `${setPasswordUrl}?${params.toString()}`;
    }
    async sendWelcome(email, name, agentCode) {
        try {
            const setPasswordLink = await this.buildSetPasswordLink(email);
            return await email_service_1.emailService.sendAgentWelcomeEmail(email, {
                name,
                agentCode,
                setPasswordLink,
                loginUrl: this.getPortalUrls().loginUrl,
            });
        }
        catch (err) {
            console.error(`[AgentAccess] Welcome email failed for ${email}:`, err?.message || err);
            return false;
        }
    }
    async sendPasswordReset(email, name) {
        try {
            const setPasswordLink = await this.buildSetPasswordLink(email);
            return await email_service_1.emailService.sendAgentPasswordResetEmail(email, {
                name,
                setPasswordLink,
                loginUrl: this.getPortalUrls().loginUrl,
            });
        }
        catch (err) {
            console.error(`[AgentAccess] Reset email failed for ${email}:`, err?.message || err);
            return false;
        }
    }
    /**
     * Consumes a one-time recovery token and sets the agent's password.
     * The policy is checked before the token is consumed so a rejected password does not burn the link.
     */
    async completePasswordSet(tokenHash, password, claimedEmail) {
        const email = String(claimedEmail || '').trim().toLowerCase();
        const policy = (0, password_policy_1.evaluatePasswordPolicy)(password, email ? { email } : {});
        if (!policy.ok) {
            return { ok: false, status: 400, message: policy.errors[0] };
        }
        const { url, key } = build_variant_1.BuildVariantService.getInstance().getSupabaseConfig();
        const verifier = (0, supabase_js_1.createClient)(url, key, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const { data, error } = await verifier.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        const user = data?.user;
        if (error || !user) {
            return {
                ok: false,
                status: 400,
                message: 'This link is invalid or has expired. Use "Forgot Password" on the agent login page to get a new one.',
            };
        }
        if (email && user.email && user.email.toLowerCase() !== email) {
            return { ok: false, status: 400, message: 'This link does not match the account email.' };
        }
        const { data: agent } = await supabase_1.supabaseAdmin
            .from('agents')
            .select('id, status')
            .eq('auth_user_id', user.id)
            .is('deleted_at', null)
            .maybeSingle();
        if (!agent || agent.status === 'TERMINATED') {
            return { ok: false, status: 403, message: 'No active agent account is linked to this link.' };
        }
        const { error: updateError } = await supabase_1.supabaseAuthAdmin.auth.admin.updateUserById(user.id, { password });
        if (updateError) {
            return { ok: false, status: 502, message: 'Could not save the new password. Please try again.' };
        }
        await verifier.auth.signOut().catch(() => undefined);
        await agent_repository_1.agentRepository.logAudit(user.id, 'AGENT', agent.id, 'PASSWORD_SET', null, { via: 'email_link' });
        return { ok: true, email: user.email || email };
    }
}
exports.AgentAccessService = AgentAccessService;
exports.agentAccessService = new AgentAccessService();
//# sourceMappingURL=agent-access.service.js.map
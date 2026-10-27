import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, supabaseAuthAdmin } from '../../../db/supabase';
import { BuildVariantService } from '../../../config/build-variant';
import { emailService } from '../../../services/email.service';
import { evaluatePasswordPolicy } from '../../../utils/password-policy';
import { agentRepository } from '../repositories/agent.repository';

export class AgentAccessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AgentAccessError';
  }
}

type PasswordSetResult =
  | { ok: true; email: string }
  | { ok: false; status: number; message: string };

function isAlreadyRegistered(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('already') && (m.includes('registered') || m.includes('exists'));
}

export class AgentAccessService {
  getPortalUrls(): { loginUrl: string; setPasswordUrl: string } {
    const configured = BuildVariantService.getInstance().getAgentPortalUrl();
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
  async createLogin(email: string, name: string): Promise<string> {
    const { data, error } = await supabaseAuthAdmin.auth.admin.createUser({
      email,
      password: `${randomBytes(24).toString('base64url')}Aa1!`,
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

  async deleteLogin(authUserId: string): Promise<void> {
    try {
      const result = await supabaseAuthAdmin.auth.admin.deleteUser(authUserId);
      if (result?.error) throw result.error;
    } catch (err: any) {
      console.error(`[AgentAccess] Failed to roll back auth user ${authUserId}:`, err?.message || err);
    }
  }

  private async buildSetPasswordLink(email: string): Promise<string> {
    const { data, error } = await supabaseAuthAdmin.auth.admin.generateLink({ type: 'recovery', email });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      throw new AgentAccessError(`Could not generate password link: ${error?.message || 'no token returned'}`, 502);
    }
    const { setPasswordUrl } = this.getPortalUrls();
    const params = new URLSearchParams({ token_hash: tokenHash, type: 'recovery', email });
    return `${setPasswordUrl}?${params.toString()}`;
  }

  async sendWelcome(email: string, name: string, agentCode: string): Promise<boolean> {
    try {
      const setPasswordLink = await this.buildSetPasswordLink(email);
      return await emailService.sendAgentWelcomeEmail(email, {
        name,
        agentCode,
        setPasswordLink,
        loginUrl: this.getPortalUrls().loginUrl,
      });
    } catch (err: any) {
      console.error(`[AgentAccess] Welcome email failed for ${email}:`, err?.message || err);
      return false;
    }
  }

  async sendPasswordReset(email: string, name: string): Promise<boolean> {
    try {
      const setPasswordLink = await this.buildSetPasswordLink(email);
      return await emailService.sendAgentPasswordResetEmail(email, {
        name,
        setPasswordLink,
        loginUrl: this.getPortalUrls().loginUrl,
      });
    } catch (err: any) {
      console.error(`[AgentAccess] Reset email failed for ${email}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Consumes a one-time recovery token and sets the agent's password.
   * The policy is checked before the token is consumed so a rejected password does not burn the link.
   */
  async completePasswordSet(tokenHash: string, password: string, claimedEmail?: string): Promise<PasswordSetResult> {
    const email = String(claimedEmail || '').trim().toLowerCase();
    const policy = evaluatePasswordPolicy(password, email ? { email } : {});
    if (!policy.ok) {
      return { ok: false, status: 400, message: policy.errors[0] };
    }

    const { url, key } = BuildVariantService.getInstance().getSupabaseConfig();
    const verifier = createClient(url, key, {
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

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, status')
      .eq('auth_user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!agent || agent.status === 'TERMINATED') {
      return { ok: false, status: 403, message: 'No active agent account is linked to this link.' };
    }

    const { error: updateError } = await supabaseAuthAdmin.auth.admin.updateUserById(user.id, { password });
    if (updateError) {
      return { ok: false, status: 502, message: 'Could not save the new password. Please try again.' };
    }

    await verifier.auth.signOut().catch(() => undefined);
    await agentRepository.logAudit(user.id, 'AGENT', agent.id, 'PASSWORD_SET', null, { via: 'email_link' });

    return { ok: true, email: user.email || email };
  }
}

export const agentAccessService = new AgentAccessService();

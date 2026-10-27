const createUser = jest.fn();
const deleteUser = jest.fn();
const generateLink = jest.fn();
const updateUserById = jest.fn();
const agentLookup = jest.fn();
const verifyOtp = jest.fn();

jest.mock('../src/db/supabase', () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    maybeSingle: () => agentLookup(),
  };
  return {
    supabase: {},
    supabaseAdmin: {
      from: () => chain,
    },
    supabaseAuthAdmin: {
      auth: { admin: { createUser, deleteUser, generateLink, updateUserById } },
    },
  };
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { verifyOtp, signOut: jest.fn().mockResolvedValue({}) } }),
}));

jest.mock('../src/services/email.service', () => ({
  emailService: {
    sendAgentWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendAgentPasswordResetEmail: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../src/modules/agent-portal/utils/kyc-storage', () => ({
  uploadBase64ToContabo: jest.fn().mockResolvedValue('https://files.test/passport.png'),
}));

jest.mock('../src/modules/agent-portal/repositories/agent.repository', () => ({
  AgentSchemaUnavailableError: class extends Error {},
  agentRepository: {
    findConflict: jest.fn(),
    createAgent: jest.fn(),
    logAudit: jest.fn(),
    findById: jest.fn(),
  },
}));

import { agentService } from '../src/modules/agent-portal/services/agent.service';
import { agentAccessService } from '../src/modules/agent-portal/services/agent-access.service';
import { agentRepository } from '../src/modules/agent-portal/repositories/agent.repository';
import { emailService } from '../src/services/email.service';

const repo = agentRepository as jest.Mocked<typeof agentRepository>;
const mail = emailService as jest.Mocked<typeof emailService>;
const STRONG_PASSWORD = 'Qz7#mVt!9pLw';

describe('Agent access provisioning', () => {
  beforeAll(() => {
    process.env.BUILD_VARIANT = 'LOCAL';
    process.env.LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.LOCAL_SUPABASE_KEY = 'test-anon-key';
    process.env.LOCAL_AGENT_PORTAL_URL = 'https://agents.test/agent/reset-password';
    require('../src/config/build-variant').BuildVariantService.resetInstance();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findConflict.mockResolvedValue(null);
    createUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
    generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'hash-123' } }, error: null });
    repo.createAgent.mockImplementation(async (agent: any) => ({ id: 'agent-1', ...agent }));
  });

  test('onboarding creates a real login and emails a set-password link', async () => {
    const { agent, welcomeEmailSent } = await agentService.onboardAgent(
      '11111111-1111-1111-1111-111111111111',
      { name: 'Ada Obi', email: 'Ada@Example.com', phone: '+2348000000001', address: '1 Road', agentCode: 'ada001' },
    );

    expect(welcomeEmailSent).toBe(true);
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'ada@example.com', email_confirm: true }));
    expect(agent).toEqual(expect.objectContaining({
      auth_user_id: 'auth-user-1',
      agent_code: 'ADA001',
      first_name: 'Ada',
      last_name: 'Obi',
      status: 'ACTIVE',
    }));

    const [to, opts] = mail.sendAgentWelcomeEmail.mock.calls[0];
    expect(to).toBe('ada@example.com');
    expect(opts.loginUrl).toBe('https://agents.test/institute/login');
    expect(opts.setPasswordLink).toMatch(/^https:\/\/agents\.test\/institute\/reset-password\?token_hash=hash-123&type=recovery&email=ada%40example\.com$/);
  });

  test('onboarding rolls back the login when the agent insert fails', async () => {
    repo.createAgent.mockRejectedValue(new Error('insert failed'));

    await expect(agentService.onboardAgent('11111111-1111-1111-1111-111111111111', { name: 'Ada Obi', email: 'ada@example.com' }))
      .rejects.toThrow('insert failed');
    expect(deleteUser).toHaveBeenCalledWith('auth-user-1');
    expect(mail.sendAgentWelcomeEmail).not.toHaveBeenCalled();
  });

  test('onboarding rejects duplicates before creating a login', async () => {
    repo.findConflict.mockResolvedValue('email');

    await expect(agentService.onboardAgent('11111111-1111-1111-1111-111111111111', { name: 'Ada Obi', email: 'ada@example.com' }))
      .rejects.toMatchObject({ status: 409 });
    expect(createUser).not.toHaveBeenCalled();
  });

  test('weak password is rejected without consuming the one-time token', async () => {
    const result = await agentAccessService.completePasswordSet('hash-123', 'short', 'ada@example.com');

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  test('valid token sets the password for the linked agent', async () => {
    verifyOtp.mockResolvedValue({ data: { user: { id: 'auth-user-1', email: 'ada@example.com' } }, error: null });
    agentLookup.mockResolvedValue({ data: { id: 'agent-1', status: 'ACTIVE' } });
    updateUserById.mockResolvedValue({ error: null });

    const result = await agentAccessService.completePasswordSet('hash-123', STRONG_PASSWORD, 'ada@example.com');

    expect(result).toEqual({ ok: true, email: 'ada@example.com' });
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-123', type: 'recovery' });
    expect(updateUserById).toHaveBeenCalledWith('auth-user-1', { password: STRONG_PASSWORD });
  });

  test('expired or invalid token does not change any password', async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });

    const result = await agentAccessService.completePasswordSet('bad', STRONG_PASSWORD, 'ada@example.com');

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(updateUserById).not.toHaveBeenCalled();
  });
});

import { supabaseAdmin } from '../db/supabase';

export const INVIFY_DEFAULT_AGENT_CODE = 'AAA000';

const INACTIVE_STATUSES = new Set(['SUSPENDED', 'TERMINATED']);

export type AgentCodeLookup = {
  valid: boolean;
  exists: boolean;
  isDefault: boolean;
  code: string;
  agentName?: string | null;
  status?: string | null;
  error?: string;
};

export function normalizeAgentCode(raw: unknown): string {
  return String(raw || '').trim().toUpperCase();
}

export function isInvifyDefaultAgentCode(code: unknown): boolean {
  return normalizeAgentCode(code) === INVIFY_DEFAULT_AGENT_CODE;
}

export function isValidAgentCodeFormat(code: string): boolean {
  return /^[A-Z0-9-]{3,20}$/.test(code);
}

function isMissingAgentsTable(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    /Could not find the table ['"]?public\.agents/i.test(message) ||
    /schema cache/i.test(message) ||
    /relation ['"]?public\.agents['"]? does not exist/i.test(message)
  );
}

function defaultInvifyLookup(code: string): AgentCodeLookup {
  return {
    valid: true,
    exists: true,
    isDefault: true,
    code,
    agentName: 'Invify',
    status: 'ACTIVE',
  };
}

function missingLookup(code: string): AgentCodeLookup {
  return {
    valid: false,
    exists: false,
    isDefault: isInvifyDefaultAgentCode(code),
    code,
    error: 'This agent code does not exist',
  };
}

/**
 * Confirms an onboarding agent code against the agents table.
 * AAA000 is always accepted as Invify's default agent.
 */
export async function lookupAgentCode(raw: unknown): Promise<AgentCodeLookup> {
  const code = normalizeAgentCode(raw);
  if (!code) {
    return {
      valid: false,
      exists: false,
      isDefault: false,
      code: '',
      error: 'Agent code is required',
    };
  }
  if (!isValidAgentCodeFormat(code)) {
    return {
      valid: false,
      exists: false,
      isDefault: isInvifyDefaultAgentCode(code),
      code,
      error: 'Enter a valid agent code',
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('id, agent_code, first_name, last_name, status, deleted_at')
      .eq('agent_code', code)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      if (isMissingAgentsTable(error) && isInvifyDefaultAgentCode(code)) {
        return defaultInvifyLookup(code);
      }
      if (isMissingAgentsTable(error)) {
        return missingLookup(code);
      }
      throw error;
    }

    if (data) {
      const status = String(data.status || '').toUpperCase();
      const agentName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
      if (INACTIVE_STATUSES.has(status)) {
        return {
          valid: false,
          exists: true,
          isDefault: isInvifyDefaultAgentCode(code),
          code,
          agentName,
          status,
          error: 'This agent is not active',
        };
      }
      return {
        valid: true,
        exists: true,
        isDefault: isInvifyDefaultAgentCode(code),
        code,
        agentName,
        status,
      };
    }
  } catch (error: any) {
    if (isInvifyDefaultAgentCode(code)) {
      return defaultInvifyLookup(code);
    }
    throw error;
  }

  if (isInvifyDefaultAgentCode(code)) {
    return defaultInvifyLookup(code);
  }
  return missingLookup(code);
}

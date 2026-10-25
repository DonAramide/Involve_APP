import { supabaseAdmin as supabase } from '../../../db/supabase';

function isMissingRelationError(error: any): boolean {
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

function isMissingColumnError(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    /Could not find the ['"]?\w+['"]? column/i.test(message) ||
    /column ['"]?\w+['"]? does not exist/i.test(message)
  );
}

export class AgentSchemaUnavailableError extends Error {
  readonly code = 'AGENT_SCHEMA_UNAVAILABLE';
  constructor(message = 'Agent portal schema is not provisioned in this environment') {
    super(message);
    this.name = 'AgentSchemaUnavailableError';
  }
}

export class AgentRepository {
  /**
   * Retrieves all agents with their territories and roles
   */
  async findAll(filters?: { status?: string; territory_id?: string }) {
    let query = supabase
      .from('agents')
      .select(`
        *,
        agent_profiles (*)
      `)
      .is('deleted_at', null);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.territory_id) {
      query = query.eq('territory_id', filters.territory_id);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingRelationError(error)) {
        throw new AgentSchemaUnavailableError(error.message);
      }
      // Fallback without embeds if related tables are absent
      if (/agent_profiles|Could not find the/i.test(String(error.message || ''))) {
        const plain = await supabase.from('agents').select('*').is('deleted_at', null);
        if (plain.error) {
          if (isMissingRelationError(plain.error)) {
            throw new AgentSchemaUnavailableError(plain.error.message);
          }
          throw plain.error;
        }
        return plain.data;
      }
      throw error;
    }
    return data;
  }

  /**
   * Finds a specific agent by ID
   */
  async findById(id: string) {
    const { data, error } = await supabase
      .from('agents')
      .select(`
        *,
        agent_profiles (*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        throw new AgentSchemaUnavailableError(error.message);
      }
      throw error;
    }
    return data;
  }

  async findConflict(email: string, agentCode: string): Promise<'email' | 'code' | null> {
    const [byEmail, byCode] = await Promise.all([
      supabase.from('agents').select('id').ilike('email', email.replace(/[\\%_]/g, '\\$&')).limit(1),
      supabase.from('agents').select('id').eq('agent_code', agentCode).limit(1),
    ]);

    for (const result of [byEmail, byCode]) {
      if (result.error) {
        if (isMissingRelationError(result.error)) {
          throw new AgentSchemaUnavailableError(result.error.message);
        }
        throw result.error;
      }
    }
    if ((byEmail.data || []).length) return 'email';
    if ((byCode.data || []).length) return 'code';
    return null;
  }

  /**
   * Creates an agent and profile inside a transaction-like flow.
   * Gracefully handles optional extended columns (institution_type, logo_url, etc.)
   * when running against schemas where additive migrations have not yet been applied.
   */
  async createAgent(agentData: any, profileData: any) {
    // 1. Insert Agent
    let agent: any;
    const agentInsert = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (agentInsert.error && isMissingColumnError(agentInsert.error)) {
      const { institution_type, trading_name, logo_url, ...baseAgentData } = agentData;
      const fallbackInsert = await supabase
        .from('agents')
        .insert(baseAgentData)
        .select()
        .single();
      if (fallbackInsert.error) {
        if (isMissingRelationError(fallbackInsert.error)) {
          throw new AgentSchemaUnavailableError(fallbackInsert.error.message);
        }
        throw fallbackInsert.error;
      }
      agent = fallbackInsert.data;
    } else if (agentInsert.error) {
      if (isMissingRelationError(agentInsert.error)) {
        throw new AgentSchemaUnavailableError(agentInsert.error.message);
      }
      throw agentInsert.error;
    } else {
      agent = agentInsert.data;
    }

    // 2. Insert Profile
    const profileInsert = await supabase
      .from('agent_profiles')
      .insert({
        agent_id: agent.id,
        ...profileData
      });

    if (profileInsert.error && isMissingColumnError(profileInsert.error)) {
      const {
        logo_url,
        cac_registration_number,
        tax_identification_number,
        regulator_license_reference,
        regulatory_metadata,
        ...baseProfileData
      } = profileData;

      const fallbackProfile = await supabase
        .from('agent_profiles')
        .insert({
          agent_id: agent.id,
          ...baseProfileData
        });

      if (fallbackProfile.error) {
        await supabase.from('agents').delete().eq('id', agent.id);
        if (isMissingRelationError(fallbackProfile.error)) {
          throw new AgentSchemaUnavailableError(fallbackProfile.error.message);
        }
        throw fallbackProfile.error;
      }
    } else if (profileInsert.error) {
      await supabase.from('agents').delete().eq('id', agent.id);
      if (isMissingRelationError(profileInsert.error)) {
        throw new AgentSchemaUnavailableError(profileInsert.error.message);
      }
      throw profileInsert.error;
    }

    return agent;
  }

  /**
   * Update Agent core details
   */
  async updateAgent(id: string, updates: any) {
    let res = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (res.error && isMissingColumnError(res.error)) {
      const { institution_type, trading_name, logo_url, ...baseUpdates } = updates;
      res = await supabase
        .from('agents')
        .update(baseUpdates)
        .eq('id', id)
        .select()
        .single();
    }

    if (res.error) throw res.error;
    return res.data;
  }

  /**
   * Update Agent profile details
   */
  async updateAgentProfile(agentId: string, updates: any) {
    let res = await supabase
      .from('agent_profiles')
      .update(updates)
      .eq('agent_id', agentId)
      .select()
      .single();

    if (res.error && isMissingColumnError(res.error)) {
      const { logo_url, cac_registration_number, regulator_license_reference, ...baseUpdates } = updates;
      res = await supabase
        .from('agent_profiles')
        .update(baseUpdates)
        .eq('agent_id', agentId)
        .select()
        .single();
    }

    if (res.error) throw res.error;
    return res.data;
  }

  /**
   * Updates Agent logo on both core agent and profile tables
   */
  async updateLogo(agentId: string, logoUrl: string | null) {
    try {
      await supabase.from('agents').update({ logo_url: logoUrl }).eq('id', agentId);
    } catch (_) {}
    try {
      await supabase.from('agent_profiles').update({ logo_url: logoUrl }).eq('agent_id', agentId);
    } catch (_) {}
  }

  /**
   * Updates Agent Status and logs history
   */
  async updateStatus(id: string, newStatus: string, oldStatus: string, changedBy: string, reason: string) {
    // 1. Log History
    await supabase.from('agent_status_history').insert({
      agent_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason
    });

    // 2. Update status
    return this.updateAgent(id, { status: newStatus });
  }

  /**
   * Logs an action in the immutable Agent Audit Log
   */
  async logAudit(
    actorId: string, 
    entityType: string, 
    entityId: string | null, 
    action: string, 
    oldValue: any = null, 
    newValue: any = null, 
    ipAddress?: string, 
    userAgent?: string
  ) {
    try {
      await supabase.from('agent_audit_logs').insert({
        actor_id: actorId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_value: oldValue,
        new_value: newValue,
        ip_address: ipAddress || null,
        user_agent: userAgent || null
      });
    } catch (err: any) {
      console.warn('[AgentRepository] Failed to write audit log:', err?.message || err);
    }
  }
}

export const agentRepository = new AgentRepository();

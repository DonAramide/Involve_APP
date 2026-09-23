import { supabase } from '../../../db/supabase';

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

  /**
   * Creates an agent and profile inside a transaction-like flow
   * Note: Supabase JS client doesn't support explicit transactions over REST, 
   * so we rely on Postgres RPC or sequential inserts.
   */
  async createAgent(agentData: any, profileData: any) {
    // Insert Agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (agentError) {
      if (isMissingRelationError(agentError)) {
        throw new AgentSchemaUnavailableError(agentError.message);
      }
      throw agentError;
    }

    // Insert Profile
    const { error: profileError } = await supabase
      .from('agent_profiles')
      .insert({
        agent_id: agent.id,
        ...profileData
      });

    if (profileError) {
      // Manual rollback
      await supabase.from('agents').delete().eq('id', agent.id);
      if (isMissingRelationError(profileError)) {
        throw new AgentSchemaUnavailableError(profileError.message);
      }
      throw profileError;
    }

    return agent;
  }

  /**
   * Update Agent core details
   */
  async updateAgent(id: string, updates: any) {
    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update Agent profile details
   */
  async updateAgentProfile(agentId: string, updates: any) {
    const { data, error } = await supabase
      .from('agent_profiles')
      .update(updates)
      .eq('agent_id', agentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Updates Agent Status and logs history
   */
  async updateStatus(id: string, newStatus: string, oldStatus: string, changedBy: string, reason: string) {
    // 1. Log History
    const { error: historyError } = await supabase
      .from('agent_status_history')
      .insert({
        agent_id: id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
        reason: reason
      });

    if (historyError) throw historyError;

    // 2. Update Status
    const { data, error } = await supabase
      .from('agents')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Audit Logging Enforcement
   */
  async logAudit(actorId: string, entityType: string, entityId: string, action: string, oldValue: any, newValue: any, ipAddress?: string, userAgent?: string) {
    const { error } = await supabase
      .from('agent_audit_logs')
      .insert({
        actor_id: actorId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_value: oldValue,
        new_value: newValue,
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent || 'unknown'
      });

    if (error) {
      console.error('[AgentRepository] Failed to write audit log:', error);
    }
  }
}

export const agentRepository = new AgentRepository();

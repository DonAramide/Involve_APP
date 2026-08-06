import { supabase } from '../../../db/supabase';

export class AgentRepository {
  /**
   * Retrieves all agents with their territories and roles
   */
  async findAll(filters?: { status?: string; territory_id?: string }) {
    let query = supabase
      .from('agents')
      .select(`
        *,
        agent_profiles (*),
        agent_territories (*),
        agent_roles (*)
      `)
      .is('deleted_at', null);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.territory_id) {
      query = query.eq('territory_id', filters.territory_id);
    }

    const { data, error } = await query;
    if (error) throw error;
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
        agent_profiles (*),
        agent_territories (*),
        agent_roles (*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
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

    if (agentError) throw agentError;

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

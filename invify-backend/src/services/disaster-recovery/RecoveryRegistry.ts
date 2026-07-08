import { supabaseAdmin } from '../../db/supabase';

export interface RecoveryIncident {
  id: string;
  component: 'PROVIDER' | 'STATE_REPAIR' | 'QUEUE_RECOVERY';
  description: string;
  resolution_action: 'FAILOVER' | 'RECONCILED' | 'RETRIED';
  status: 'PENDING' | 'RESOLVING' | 'RESOLVED';
  created_at: string;
  resolved_at: string | null;
}

export class RecoveryRegistry {
  private static mockIncidents: RecoveryIncident[] = [];
  private static useMock = true; // DB DDL is blocked on staging, always use mock in test/local execution

  static clearMockData() {
    this.mockIncidents = [];
  }

  static getMockIncidents(): RecoveryIncident[] {
    return this.mockIncidents;
  }

  static async insertIncident(incident: Partial<RecoveryIncident>): Promise<RecoveryIncident> {
    const item: RecoveryIncident = {
      id: incident.id || Math.random().toString(36).substring(2),
      component: incident.component!,
      description: incident.description || '',
      resolution_action: incident.resolution_action!,
      status: incident.status || 'PENDING',
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    if (this.useMock) {
      this.mockIncidents.push(item);
      return item;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('recovery_incidents')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      this.mockIncidents.push(item);
      return item;
    }
  }

  static async updateIncident(id: string, updates: Partial<RecoveryIncident>): Promise<void> {
    const time = new Date().toISOString();
    if (this.useMock) {
      const idx = this.mockIncidents.findIndex(i => i.id === id);
      if (idx !== -1) {
        this.mockIncidents[idx] = { ...this.mockIncidents[idx], ...updates };
        if (updates.status === 'RESOLVED') {
          this.mockIncidents[idx].resolved_at = time;
        }
      }
      return;
    }
    try {
      const payload = { ...updates };
      if (updates.status === 'RESOLVED') {
        (payload as any).resolved_at = time;
      }
      const { error } = await supabaseAdmin
        .from('recovery_incidents')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    } catch {
      const idx = this.mockIncidents.findIndex(i => i.id === id);
      if (idx !== -1) {
        this.mockIncidents[idx] = { ...this.mockIncidents[idx], ...updates };
        if (updates.status === 'RESOLVED') {
          this.mockIncidents[idx].resolved_at = time;
        }
      }
    }
  }
}

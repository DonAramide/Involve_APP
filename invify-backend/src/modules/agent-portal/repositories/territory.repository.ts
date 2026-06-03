import { supabase } from '../../../db/supabase';

export class TerritoryRepository {
  async create(data: any) {
    const { data: territory, error } = await supabase.from('agent_territories').insert(data).select().single();
    if (error) throw error;
    return territory;
  }
  async findAll() {
    const { data, error } = await supabase.from('agent_territories').select('*').is('deleted_at', null);
    if (error) throw error;
    return data;
  }
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('agent_territories').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
export const territoryRepository = new TerritoryRepository();
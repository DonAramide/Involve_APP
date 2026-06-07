import { supabase } from '../../../db/supabase';

export class SupportRepository {
  async findAll() {
    const { data, error } = await supabase.from('support_tickets').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
}
export const supportRepository = new SupportRepository();

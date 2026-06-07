import { supabase } from '../../../db/supabase';
export class RbacRepository {
  async listRoles() {
    const { data, error } = await supabase.from('agent_roles').select('*');
    if (error) throw error;
    return data;
  }
}
export const rbacRepository = new RbacRepository();

import { supabase } from '../../../db/supabase';

export class KBService {
  async getCategories() {
    const { data, error } = await supabase
      .from('kb_categories')
      .select('*');
    if (error) throw error;
    return data;
  }

  async getArticles() {
    const { data, error } = await supabase
      .from('kb_articles')
      .select('*');
    if (error) throw error;
    return data;
  }

  async getArticleById(id: string) {
    const { data, error } = await supabase
      .from('kb_articles')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}

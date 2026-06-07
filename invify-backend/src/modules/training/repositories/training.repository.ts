import { supabase } from '../../../db/supabase';

export class TrainingRepository {
  async findCourses() {
    const { data, error } = await supabase.from('training_courses').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
}
export const trainingRepository = new TrainingRepository();

import { supabase } from '../../../db/supabase';

export class TrainingService {
  async getCourses() {
    const { data, error } = await supabase
      .from('training_courses')
      .select('*');
    if (error) throw error;
    return data;
  }

  async enrollCourse(enrollmentData: any) {
    const { data, error } = await supabase
      .from('training_enrollments')
      .insert([enrollmentData])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateProgress(progressData: any) {
    const { enrollment_id, progress } = progressData;
    const { data, error } = await supabase
      .from('training_enrollments')
      .update({ progress })
      .eq('id', enrollment_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

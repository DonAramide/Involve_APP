"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingService = void 0;
const supabase_1 = require("../../../db/supabase");
class TrainingService {
    async getCourses() {
        const { data, error } = await supabase_1.supabase
            .from('training_courses')
            .select('*');
        if (error)
            throw error;
        return data;
    }
    async enrollCourse(enrollmentData) {
        const { data, error } = await supabase_1.supabase
            .from('training_enrollments')
            .insert([enrollmentData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateProgress(progressData) {
        const { enrollment_id, progress } = progressData;
        const { data, error } = await supabase_1.supabase
            .from('training_enrollments')
            .update({ progress })
            .eq('id', enrollment_id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
}
exports.TrainingService = TrainingService;
//# sourceMappingURL=training.service.js.map
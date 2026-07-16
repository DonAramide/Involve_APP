"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainingRepository = exports.TrainingRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class TrainingRepository {
    async findCourses() {
        const { data, error } = await supabase_1.supabase.from('training_courses').select('*').is('deleted_at', null).order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
}
exports.TrainingRepository = TrainingRepository;
exports.trainingRepository = new TrainingRepository();
//# sourceMappingURL=training.repository.js.map
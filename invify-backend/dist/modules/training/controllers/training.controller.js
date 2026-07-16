"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingController = void 0;
const training_service_1 = require("../services/training.service");
const trainingService = new training_service_1.TrainingService();
class TrainingController {
    async getCourses(req, res) {
        try {
            const courses = await trainingService.getCourses();
            res.json(courses);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async enrollCourse(req, res) {
        try {
            const enrollment = await trainingService.enrollCourse(req.body);
            res.status(201).json(enrollment);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async updateProgress(req, res) {
        try {
            const progress = await trainingService.updateProgress(req.body);
            res.json(progress);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.TrainingController = TrainingController;
//# sourceMappingURL=training.controller.js.map
// backend/src/api/controllers/ai.controller.js
const aiService = require('../../services/ai.service');

/**
 * Handles AI generation requests.
 */
class AIController {
    /**
     * POST /ai/lesson-note/generate
     */
    async generateLessonNote(req, res) {
        const { className, subjectName, term, week, topic, schoolId, teacherId, forceRefresh } = req.body;

        // Basic validation
        if (!className || !subjectName || !topic || !schoolId) {
            return res.status(400).json({ 
                error: 'Missing required parameters. class, subject, topic, and schoolId are mandatory.' 
            });
        }

        try {
            const note = await aiService.generateLessonNote({
                className,
                subjectName,
                term,
                week,
                topic,
                schoolId,
                teacherId: teacherId || req.user?.id || 'unknown_teacher',
                forceRefresh: forceRefresh === true
            });

            return res.status(200).json(note);
        } catch (error) {
            console.error('AI Controller Error:', error.message);
            return res.status(500).json({ 
                error: 'Failed to generate lesson note. ' + error.message 
            });
        }
    }
}

module.exports = new AIController();

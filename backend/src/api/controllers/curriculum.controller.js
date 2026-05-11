// backend/src/api/controllers/curriculum.controller.js
const { supabase } = require('../../config/supabase');

class CurriculumController {
    /**
     * GET /api/curriculum/topics
     * Query: subject, classLevel, term
     */
    async getTopics(req, res) {
        const { subject, classLevel, term } = req.query;

        if (!subject || !classLevel || !term) {
            return res.status(400).json({ error: 'Missing subject, classLevel, or term' });
        }

        try {
            const { data, error } = await supabase
                .from('curriculum_topics')
                .select('*')
                .eq('subject', subject)
                .eq('class_level', classLevel)
                .eq('term', term)
                .order('week', { ascending: true });

            if (error) throw error;
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch topics' });
        }
    }

    /**
     * GET /api/curriculum/subjects
     */
    async getSubjects(req, res) {
        try {
            const { data, error } = await supabase
                .from('curriculum_topics')
                .select('subject')
                .order('subject', { ascending: true });

            if (error) throw error;
            
            // Return unique subjects
            const uniqueSubjects = [...new Set(data.map(item => item.subject))];
            return res.status(200).json(uniqueSubjects);
        } catch (error) {
            console.error('Curriculum Controller Error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch subjects' });
        }
    }
}

module.exports = new CurriculumController();

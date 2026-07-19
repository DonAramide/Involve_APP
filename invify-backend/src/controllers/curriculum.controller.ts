// src/controllers/curriculum.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

export class CurriculumController {
  /**
   * GET /admin/curriculum
   * Lists standardized curriculum topics with filtering.
   */
  static async listCurriculum(req: Request, res: Response) {
    try {
      const { subject, class_level, term } = req.query;

      let query = supabase.from('curriculum_topics').select('*');

      if (subject) query = query.eq('subject', subject);
      if (class_level) query = query.eq('class_level', class_level);
      if (term) query = query.eq('term', term);

      const { data, error } = await query.order('class_level').order('term').order('week');

      if (error) {
        console.warn(`[CurriculumController] Warning (possibly missing table): ${error.message}`);
        return res.status(200).json([]);
      }
      return res.status(200).json(data || []);
    } catch (error: any) {
      console.error('[CurriculumController] listCurriculum Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/curriculum
   * Restricted to Super Admin.
   */
  static async createTopic(req: Request, res: Response) {
    try {
      const { subject, class_level, term, week, topic, subtopics } = req.body;

      const { data, error } = await supabase
        .from('curriculum_topics')
        .insert({ subject, class_level, term, week, topic, subtopics })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'A topic already exists for this subject, class, term, and week.' });
        }
        throw error;
      }
      return res.status(201).json(data);
    } catch (error: any) {
      console.error('[CurriculumController] createTopic Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /admin/curriculum/:id
   */
  static async updateTopic(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabase
        .from('curriculum_topics')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[CurriculumController] updateTopic Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /admin/curriculum/:id
   */
  static async deleteTopic(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('curriculum_topics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(204).send();
    } catch (error: any) {
      console.error('[CurriculumController] deleteTopic Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}

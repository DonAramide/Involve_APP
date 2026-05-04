// src/controllers/ai.controller.ts
import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';

export class AIController {
  /**
   * POST /ai/lesson-note/generate
   */
  static async generateLessonNote(req: Request, res: Response) {
    try {
      const { className, subjectName, term, week, topic, forceRefresh } = req.body;
      const tenantId = (req as any).user?.tenantId || req.body.tenantId;

      if (!className || !subjectName || !topic || !tenantId) {
        return res.status(400).json({ error: "Missing required generation parameters" });
      }

      const note = await AIService.generateLessonNote({
        className, subjectName, term, week, topic, tenantId, forceRefresh
      });

      return res.status(200).json(note);
    } catch (error: any) {
      console.error('[AIController] generate Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /ai/lesson-note/refresh
   */
  static async refreshLessonNote(req: Request, res: Response) {
    try {
      const { className, subjectName, term, week } = req.body;
      const tenantId = (req as any).user?.tenantId;

      const note = await AIService.generateLessonNote({
        className, subjectName, term, week, tenantId, forceRefresh: true
      });

      return res.status(200).json(note);
    } catch (error: any) {
      console.error('[AIController] refresh Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}

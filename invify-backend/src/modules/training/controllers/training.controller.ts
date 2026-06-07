import { Request, Response } from 'express';
import { TrainingService } from '../services/training.service';

const trainingService = new TrainingService();

export class TrainingController {
  async getCourses(req: Request, res: Response) {
    try {
      const courses = await trainingService.getCourses();
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async enrollCourse(req: Request, res: Response) {
    try {
      const enrollment = await trainingService.enrollCourse(req.body);
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProgress(req: Request, res: Response) {
    try {
      const progress = await trainingService.updateProgress(req.body);
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

import { Request, Response } from 'express';
import { trainingService } from '../services/training.service';

export class TrainingController {
  static async listCourses(req: Request, res: Response) {
    try {
      const courses = await trainingService.getCourses();
      res.status(200).json({ success: true, data: courses });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}
import { trainingRepository } from '../repositories/training.repository';

export class TrainingService {
  async getCourses() {
    return trainingRepository.findCourses();
  }
}
export const trainingService = new TrainingService();
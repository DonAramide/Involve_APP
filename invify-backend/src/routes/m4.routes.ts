import { Router } from 'express';
import { SupportController } from '../modules/support/controllers/support.controller';
import { KBController } from '../modules/kb/controllers/kb.controller';
import { TrainingController } from '../modules/training/controllers/training.controller';
import { CertificationController } from '../modules/certification/controllers/certification.controller';

const router = Router();

const supportController = new SupportController();
const kbController = new KBController();
const trainingController = new TrainingController();
const certificationController = new CertificationController();

// Support Routes
router.get('/support/tickets', supportController.getTickets.bind(supportController));
router.post('/support/tickets', supportController.createTicket.bind(supportController));
router.get('/support/tickets/:id', supportController.getTicketById.bind(supportController));
router.post('/support/tickets/:id/comments', supportController.addComment.bind(supportController));

// KB Routes
router.get('/kb/categories', kbController.getCategories.bind(kbController));
router.get('/kb/articles', kbController.getArticles.bind(kbController));
router.get('/kb/articles/:id', kbController.getArticleById.bind(kbController));

// Training Routes
router.get('/training/courses', trainingController.getCourses.bind(trainingController));
router.post('/training/enroll', trainingController.enrollCourse.bind(trainingController));
router.patch('/training/progress', trainingController.updateProgress.bind(trainingController));

// Certification Routes
router.get('/agent/certifications', certificationController.getCertifications.bind(certificationController));

export default router;

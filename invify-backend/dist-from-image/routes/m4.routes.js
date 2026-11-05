"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const support_controller_1 = require("../modules/support/controllers/support.controller");
const kb_controller_1 = require("../modules/kb/controllers/kb.controller");
const training_controller_1 = require("../modules/training/controllers/training.controller");
const certification_controller_1 = require("../modules/certification/controllers/certification.controller");
const router = (0, express_1.Router)();
const supportController = new support_controller_1.SupportController();
const kbController = new kb_controller_1.KBController();
const trainingController = new training_controller_1.TrainingController();
const certificationController = new certification_controller_1.CertificationController();
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
exports.default = router;
//# sourceMappingURL=m4.routes.js.map
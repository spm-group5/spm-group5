import express from 'express';
const router = express.Router();
import reportController from '../controllers/report.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

// Route for generating project-specific task completion report
// Only admin users can access this endpoint
router.get('/reports/task-completion/project/:projectId', 
    requireAuth, 
    requireRole(['admin']), 
    reportController.generateProjectTaskCompletionReport
);

// Route for generating user-specific task completion report
// Only admin users can access this endpoint
router.get('/reports/task-completion/user/:userId', 
    requireAuth, 
    requireRole(['admin']), 
    reportController.generateUserTaskCompletionReport
);

export default router;
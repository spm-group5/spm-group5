import express from 'express';
const router = express.Router();
import projectController from '../controllers/project.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

router.post('/projects', requireAuth, projectController.createProject);
// Updated to include canViewTasks metadata
router.get('/projects', requireAuth, projectController.getProjectsWithAccessMetadata);

// Admin-only routes (must be before parameterized routes)
// Updated to include canViewTasks metadata for admin
router.get('/projects/all', requireAuth, requireRole(['admin']), projectController.getProjectsWithAccessMetadata);

router.get('/projects/:projectId', requireAuth, projectController.getProjectById);
router.put('/projects/:projectId', requireAuth, projectController.updateProject);
router.delete('/projects/:projectId', requireAuth, projectController.deleteProject);

export default router;
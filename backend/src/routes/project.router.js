import express from 'express';
const router = express.Router();
import projectController from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

router.post('/projects', requireAuth, projectController.createProject);
router.get('/projects', requireAuth, projectController.getProjects);
router.get('/projects/:projectId', requireAuth, projectController.getProjectById);
router.put('/projects/:projectId', requireAuth, projectController.updateProject);
router.delete('/projects/:projectId', requireAuth, projectController.deleteProject);

export default router;
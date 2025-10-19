import express from 'express';
const router = express.Router();
import taskController from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

router.post('/tasks', requireAuth, taskController.createTask);
router.put('/tasks/:taskId', requireAuth, taskController.updateTask);
router.get('/tasks', requireAuth, taskController.getTasks);
router.get('/tasks/:taskId', requireAuth, taskController.getTaskById);
router.patch('/tasks/:taskId/archive', requireAuth, taskController.archiveTask);
router.patch('/tasks/:taskId/unarchive', requireAuth, taskController.unarchiveTask);
router.post('/tasks/:taskId/comments', requireAuth, taskController.addComment);

// Project task viewing endpoint with authorization
router.get('/projects/:projectId/tasks', requireAuth, taskController.getTasksByProject);

export default router;
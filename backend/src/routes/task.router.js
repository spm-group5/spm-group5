import express from 'express';
const router = express.Router();
import taskController from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

router.post('/tasks', requireAuth, taskController.createTask);
router.put('/tasks/:taskId', requireAuth, taskController.updateTask);
router.get('/tasks', requireAuth, taskController.getTasks);
router.get('/tasks/:taskId', requireAuth, taskController.getTaskById);
router.delete('/tasks/:taskId', requireAuth, taskController.deleteTask);

export default router;
import express from 'express';
import subtaskController from '../controllers/subtask.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create a new subtask
router.post('/subtasks', subtaskController.createSubtask);

// Get all subtasks for a parent task
router.get('/tasks/:parentTaskId/subtasks', subtaskController.getSubtasksByParentTask);

// Get all subtasks for a project
router.get('/projects/:projectId/subtasks', subtaskController.getSubtasksByProject);

// Get a subtask by ID
router.get('/subtasks/:subtaskId', subtaskController.getSubtaskById);

// Update a subtask
router.put('/subtasks/:subtaskId', subtaskController.updateSubtask);

// Archive a subtask
router.put('/subtasks/:subtaskId/archive', subtaskController.archiveSubtask);

// Get archived subtasks for a parent task
router.get('/tasks/:parentTaskId/subtasks/archived', subtaskController.getArchivedSubtasksByParentTask);

// Unarchive a subtask
router.put('/subtasks/:subtaskId/unarchive', subtaskController.unarchiveSubtask);

export default router;


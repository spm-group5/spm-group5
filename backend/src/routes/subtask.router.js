import express from 'express';
import subtaskController from '../controllers/subtask.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Manual Time Logging endpoints (MUST come before generic :subtaskId routes)
router.patch('/subtasks/:subtaskId/time-taken', subtaskController.updateSubtaskTimeTaken);
router.get('/subtasks/:subtaskId/total-time', subtaskController.getSubtaskTotalTime);

// Archive/Unarchive endpoints (MUST come before generic :subtaskId routes)
router.put('/subtasks/:subtaskId/archive', subtaskController.archiveSubtask);
router.put('/subtasks/:subtaskId/unarchive', subtaskController.unarchiveSubtask);

// Comment endpoints (MUST come before generic :subtaskId routes)
router.post('/subtasks/:subtaskId/comments', subtaskController.addComment);
router.put('/subtasks/:subtaskId/comments/:commentId', subtaskController.editComment);
router.delete('/subtasks/:subtaskId/comments/:commentId', subtaskController.deleteComment);

// Create a new subtask
router.post('/subtasks', subtaskController.createSubtask);

// Get all subtasks for a parent task
router.get('/tasks/:parentTaskId/subtasks', subtaskController.getSubtasksByParentTask);

// Get all subtasks for a project
router.get('/projects/:projectId/subtasks', subtaskController.getSubtasksByProject);

// Generic routes (MUST come LAST to avoid shadowing specific routes)
// Get a subtask by ID
router.get('/subtasks/:subtaskId', subtaskController.getSubtaskById);

// Update a subtask
router.put('/subtasks/:subtaskId', subtaskController.updateSubtask);

// Get archived subtasks for a parent task
router.get('/tasks/:parentTaskId/subtasks/archived', subtaskController.getArchivedSubtasksByParentTask);

export default router;


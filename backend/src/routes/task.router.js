import express from 'express';
const router = express.Router();
import taskController from '../controllers/task.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

router.post('/tasks', requireAuth, taskController.createTask);
router.put('/tasks/:taskId', requireAuth, taskController.updateTask);
router.get('/tasks', requireAuth, taskController.getTasks);
router.get('/tasks/:taskId', requireAuth, taskController.getTaskById);
router.patch('/tasks/:taskId/archive', requireAuth, taskController.archiveTask);
router.patch('/tasks/:taskId/unarchive', requireAuth, taskController.unarchiveTask);
router.post('/tasks/:taskId/comments', requireAuth, taskController.addComment);
router.delete('/tasks/:taskId/comments/:commentId', requireAuth, taskController.deleteComment);

// ASSIGNEE-SCOPE: Post-creation assignment endpoint (legacy - reassigns owner)
// OWNERSHIP-TRANSFER: Only managers and admins can transfer task ownership
router.post('/tasks/:id/assign', requireAuth, requireRole(['manager', 'admin']), taskController.assignOwner);

// ASSIGNEE-SCOPE: List eligible assignees for a task (based on project access)
router.get('/tasks/:id/assignees', requireAuth, taskController.listEligibleAssignees);

// ASSIGNEE-SCOPE: Add assignee to task (one at a time, up to 5 total)
router.post('/tasks/:id/assignees', requireAuth, taskController.addAssignee);

// ASSIGNEE-SCOPE: Remove assignee from task (Manager/Admin only)
router.delete('/tasks/:id/assignees', requireAuth, taskController.removeAssignee);

// Project task viewing endpoint with authorization
router.get('/projects/:projectId/tasks', requireAuth, taskController.getTasksByProject);

export default router;
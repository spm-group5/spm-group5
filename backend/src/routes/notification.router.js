import express from 'express';
import {
  getNotifications,
  markNotificationRead,
  deleteNotification
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all notifications for the logged-in user
router.get('/notifications', requireAuth, getNotifications);

// Mark a notification as read
router.patch('/notifications/:id/read', requireAuth, markNotificationRead);

// Delete a notification (optional)
router.delete('/notifications/:id', requireAuth, deleteNotification);

export default router;
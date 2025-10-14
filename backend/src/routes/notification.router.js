import express from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all notifications for the logged-in user
router.get('/notifications', requireAuth, getNotifications);

// Mark a notification as read
router.patch('/notifications/:id/read', requireAuth, markNotificationRead);

// Mark all notifications as read
router.patch('/notifications/mark-all-read', requireAuth, markAllNotificationsRead);

// Delete a notification (optional)
router.delete('/notifications/:id', requireAuth, deleteNotification);

export default router;
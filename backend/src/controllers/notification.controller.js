import notificationModel from '../models/notification.model.js';

// Get all notifications for the logged-in user (optionally filter unread)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { unread } = req.query;
    const filter = { user: userId };
    if (unread === 'true') filter.read = false;
    const notifications = await notificationModel.find(filter).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark a notification as read using its ID
export const markNotificationRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    await notificationModel.findByIdAndUpdate(notificationId, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all notifications as read for the logged-in user
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    await notificationModel.updateMany({ user: userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a notification (optional)
export const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    await notificationModel.findByIdAndDelete(notificationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
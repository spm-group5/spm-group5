import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as notificationController from './notification.controller.js';
import notificationModel from '../models/notification.model.js';

vi.mock('../models/notification.model.js');

describe('Notification Controller', () => {
  const req = { user: { _id: 'user123' }, params: { id: 'notif456' }, query: {} };
  const res = {
    json: vi.fn(),
    status: vi.fn().mockReturnThis()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get notifications for user', async () => {
    notificationModel.find.mockReturnValue({
        sort: vi.fn().mockReturnValue([{ message: 'Test' }]) 
    }
    );
    await notificationController.getNotifications(req, res);
    expect(notificationModel.find).toHaveBeenCalledWith({ user: 'user123' });
    expect(res.json).toHaveBeenCalledWith([{ message: 'Test' }]);
  });

  it('should get unread notifications for user', async () => {
  req.query.unread = 'true';
  notificationModel.find.mockReturnValue({
    sort: vi.fn().mockReturnValue([{ message: 'Unread' }])
  });
  await notificationController.getNotifications(req, res);
  expect(notificationModel.find).toHaveBeenCalledWith({ user: 'user123', read: false });
  expect(res.json).toHaveBeenCalledWith([{ message: 'Unread' }]);
});

  it('should mark notification as read', async () => {
    notificationModel.findByIdAndUpdate.mockResolvedValue({});
    await notificationController.markNotificationRead(req, res);
    expect(notificationModel.findByIdAndUpdate).toHaveBeenCalledWith('notif456', { read: true });
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('should delete notification', async () => {
    notificationModel.findByIdAndDelete.mockResolvedValue({});
    await notificationController.deleteNotification(req, res);
    expect(notificationModel.findByIdAndDelete).toHaveBeenCalledWith('notif456');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
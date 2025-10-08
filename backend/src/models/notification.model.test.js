import { describe, it, expect, vi } from 'vitest';
import notificationModel from './notification.model.js';

describe('Notification Model (Mocked)', () => {
  it('should set default read to false', () => {
    const notification = new notificationModel({
      user: '507f1f77bcf86cd799439011',
      message: 'Test notification'
    });
    expect(notification.read).toBe(false);
  });

  it('should set createdAt to a date', () => {
    const notification = new notificationModel({
      user: '507f1f77bcf86cd799439011',
      message: 'Test notification'
    });
    expect(notification.createdAt).toBeInstanceOf(Date);
  });

  it('should require user field', async () => {
    const notification = new notificationModel({
      message: 'Missing user'
    });
    let error;
    try {
      await notification.validate();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.errors.user).toBeDefined();
  });

  it('should allow assignor and deadline fields', () => {
    const notification = new notificationModel({
      user: '507f1f77bcf86cd799439011',
      assignor: 'manager1',
      deadline: new Date('2025-10-30')
    });
    expect(notification.assignor).toBe('manager1');
    expect(notification.deadline).toEqual(new Date('2025-10-30'));
  });
});
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';

let mongoServer;
let currentUser = null;

vi.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req, res, next) => {
    if (currentUser) {
      req.user = currentUser;
      next();
    } else {
      res.status(401).json({ success: false, message: 'Authentication required' });
    }
  },
  requireRole: (roles) => (req, res, next) => {
    if (currentUser && currentUser.roles.some(role => roles.includes(role))) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
  }
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  currentUser = await User.create({ username: 'notifuser', roles: ['staff'], department: 'it', hashed_password: 'hashedpassword123' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Notification.deleteMany({});
});

describe('Notification Router', () => {
  it('GET /api/notifications returns user notifications', async () => {
    await Notification.create({ user: currentUser._id, message: 'First' });
    await Notification.create({ user: currentUser._id, message: 'Second', read: true });
    const res = await request(app).get('/api/notifications').expect(200);
    expect(res.body.length).toBe(2);
  });

  it('GET /api/notifications?unread=true returns only unread', async () => {
    await Notification.create({ user: currentUser._id, message: 'First' });
    await Notification.create({ user: currentUser._id, message: 'Second', read: true });
    const res = await request(app).get('/api/notifications?unread=true').expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].read).toBe(false);
  });

  it('PATCH /api/notifications/:id/read marks as read', async () => {
    const notif = await Notification.create({ user: currentUser._id, message: 'Unread' });
    await request(app).patch(`/api/notifications/${notif._id}/read`).expect(200);
    const updated = await Notification.findById(notif._id);
    expect(updated.read).toBe(true);
  });

  it('DELETE /api/notifications/:id deletes notification', async () => {
    const notif = await Notification.create({ user: currentUser._id, message: 'Delete me' });
    await request(app).delete(`/api/notifications/${notif._id}`).expect(200);
    const deleted = await Notification.findById(notif._id);
    expect(deleted).toBeNull();
  });
});
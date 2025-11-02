import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import Task from '../../models/task.model.js';
import User from '../../models/user.model.js';
import Notification from '../../models/notification.model.js';
import { createAndAuthenticateUser } from './authHelpers.js';

vi.stubGlobal('io', {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn()
});

describe('Integration: Task Comment � In-App Notification', () => {
  let agent;
  let user1;
  let user2;
  let testProject;
  let testTask;

  afterEach(async () => {
    try {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    } catch (error) {
      console.error('Error clearing collections:', error);
    }
  });

  beforeEach(async () => {
    agent = request.agent(app);

    user1 = await createAndAuthenticateUser(agent, {
      username: `user1-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@example.com`,
      roles: ['manager'],
      department: 'it',
      hashed_password: 'password123'
    });

    user2 = await User.create({
      username: `user2-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@example.com`,
      roles: ['manager'],
      department: 'it',
      hashed_password: 'password123'
    });

    const projectRes = await agent
      .post('/api/projects')
      .send({
        name: 'Task Comment Test Project',
        description: 'Project for testing task comment notifications',
        priority: 5
      })
      .expect(201);
    testProject = projectRes.body.data;

    const taskRes = await agent
      .post('/api/tasks')
      .send({
        title: 'Task Comment Test Task',
        description: 'Task with assignees for testing comments',
        project: testProject._id,
        priority: 3
      })
      .expect(201);
    testTask = taskRes.body.data;
  });

  describe('Happy Path: Comment Notification to Co-Assignees', () => {
    it('should create notification for co-assignee when task is commented', async () => {
      await agent
        .put(`/api/tasks/${testTask._id}`)
        .send({
          assignee: [user1._id.toString(), user2._id.toString()]
        })
        .expect(200);

      await Notification.deleteMany({});

      const notificationsBefore = await Notification.find({ user: user1._id });
      expect(notificationsBefore).toHaveLength(0);

      const user2Agent = request.agent(app);
      await user2Agent
        .post('/api/login')
        .send({
          username: user2.username,
          password: 'password123'
        })
        .expect(200);

      const commentRes = await user2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'This is a comment from User 2' })
        .expect(200);

      expect(commentRes.body.success).toBe(true);
      expect(commentRes.body.data.comments).toHaveLength(1);
      expect(commentRes.body.data.comments[0].text).toBe('This is a comment from User 2');
      expect(commentRes.body.data.comments[0].author).toBe(user2._id.toString());

      const notificationsAfter = await Notification.find({ user: user1._id });
      expect(notificationsAfter.length).toBeGreaterThan(0);

      const notification = notificationsAfter[0];
      expect(notification.user.toString()).toEqual(user1._id.toString());
      expect(notification.message).toContain(testTask.title);
      expect(notification.message).toContain(user2.username);
      expect(notification.task.toString()).toEqual(testTask._id);
      expect(notification.read).toBe(false);
    });

    it('should NOT create notification for the user who posted the comment', async () => {
      const user2Agent = request.agent(app);
      await user2Agent
        .post('/api/login')
        .send({
          username: user2.username,
          password: 'password123'
        })
        .expect(200);

      await user2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'My own comment' })
        .expect(200);

      const user2Notifications = await Notification.find({
        user: user2._id,
        type: 'comment'
      });
      expect(user2Notifications).toHaveLength(0);
    });
  });

  describe('Permission Tests: Comment Authorization', () => {
    it('should reject comment from staff user not assigned to task and return 403', async () => {
      const staffUser = await User.create({
        username: `staff-${Date.now()}@example.com`,
        roles: ['staff'],
        department: 'it',
        hashed_password: 'password123'
      });

      const staffAgent = request.agent(app);
      await staffAgent
        .post('/api/login')
        .send({
          username: staffUser.username,
          password: 'password123'
        })
        .expect(200);

      const response = await staffAgent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'Unauthorized comment' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/permission|insufficient/i);

      const notifications = await Notification.countDocuments({ type: 'comment' });
      expect(notifications).toBe(0);
    });

    it('should allow manager to comment on task with assignee from their department', async () => {
      const manager2 = await User.create({
        username: `manager2-${Date.now()}@example.com`,
        roles: ['manager'],
        department: 'it',
        hashed_password: 'password123'
      });

      const manager2Agent = request.agent(app);
      await manager2Agent
        .post('/api/login')
        .send({
          username: manager2.username,
          password: 'password123'
        })
        .expect(200);

      const response = await manager2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'Manager from same department' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toHaveLength(1);

      const notifications = await Notification.find({ user: user1._id });
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should reject comment on non-existent task and return 404', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId();

      const response = await agent
        .post(`/api/tasks/${fakeTaskId}/comments`)
        .send({ text: 'Comment on fake task' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/task|not found/i);
    });
  });

  describe('Notification Details and Verification', () => {
    it('should create notification with correct fields when task is commented', async () => {
      await agent
        .put(`/api/tasks/${testTask._id}`)
        .send({
          assignee: [user1._id.toString(), user2._id.toString()]
        })
        .expect(200);

      await Notification.deleteMany({});

      const user2Agent = request.agent(app);
      await user2Agent
        .post('/api/login')
        .send({
          username: user2.username,
          password: 'password123'
        })
        .expect(200);

      await user2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'Test comment with fields' })
        .expect(200);

      const notifications = await Notification.find({ user: user1._id });
      expect(notifications.length).toBeGreaterThan(0);

      const notification = notifications[0];
      expect(notification).toHaveProperty('user');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('task');
      expect(notification).toHaveProperty('read');
      expect(notification).toHaveProperty('createdAt');

      expect(notification.user.toString()).toEqual(user1._id.toString());
      expect(notification.message).toMatch(testTask.title);
      expect(notification.task.toString()).toEqual(testTask._id.toString());
      expect(notification.read).toBe(false);
      expect(notification.createdAt instanceof Date).toBe(true);
    });

    it('should be retrievable via notifications API for assigned user', async () => {
      const user2Agent = request.agent(app);
      await user2Agent
        .post('/api/login')
        .send({
          username: user2.username,
          password: 'password123'
        })
        .expect(200);

      await user2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'Comment to retrieve' })
        .expect(200);

      const response = await agent
        .get('/api/notifications')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const taskNotification = response.body.find(n =>
        n.message && n.message.includes(testTask.title)
      );
      expect(taskNotification).toBeDefined();
      expect(taskNotification.read).toBe(false);
    });
  });

  describe('Multiple Assignees and Edge Cases', () => {
    it('should notify all assignees except commenter when comment is added', async () => {
      const user3 = await User.create({
        username: `user3-${Date.now()}@example.com`,
        roles: ['manager'],
        department: 'it',
        hashed_password: 'password123'
      });

      await agent
        .put(`/api/tasks/${testTask._id}`)
        .send({
          assignee: [user1._id.toString(), user2._id.toString(), user3._id.toString()]
        })
        .expect(200);

      const user2Agent = request.agent(app);
      await user2Agent
        .post('/api/login')
        .send({
          username: user2.username,
          password: 'password123'
        })
        .expect(200);

      await user2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'Comment from User 2' })
        .expect(200);

      const user1Notifs = await Notification.find({ user: user1._id });
      expect(user1Notifs.length).toBeGreaterThan(0);

      const user3Notifs = await Notification.find({ user: user3._id });
      expect(user3Notifs.length).toBeGreaterThan(0);

      const user2Notifs = await Notification.find({ user: user2._id });
      expect(user2Notifs).toHaveLength(0);
    });

    it('should reject comment with empty text and return 400', async () => {
      const response = await agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/text|required|comment/i);

      const taskInDb = await Task.findById(testTask._id);
      expect(taskInDb.comments).toHaveLength(0);
    });

    it('should reject comment with missing text field and return 400', async () => {
      const response = await agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/text|required|comment/i);
    });

    it('should only create notification for newly added assignees', async () => {
      await agent
        .put(`/api/tasks/${testTask._id}`)
        .send({
          assignee: [user1._id.toString(), user2._id.toString()]
        })
        .expect(200);

      await Notification.deleteMany({});

      const user1NotificationsBefore = await Notification.countDocuments({ user: user1._id });
      expect(user1NotificationsBefore).toBe(0);

      const user2Agent = request.agent(app);
      await user2Agent
        .post('/api/login')
        .send({
          username: user2.username,
          password: 'password123'
        })
        .expect(200);

      await user2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'First comment' })
        .expect(200);

      const user1NotificationsAfterFirst = await Notification.countDocuments({ user: user1._id });
      expect(user1NotificationsAfterFirst).toBeGreaterThan(0);

      await user2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: 'Second comment' })
        .expect(200);

      const user1NotificationsAfterSecond = await Notification.countDocuments({ user: user1._id });
      expect(user1NotificationsAfterSecond).toBeGreaterThan(user1NotificationsAfterFirst);
    });

    it('should verify comment is persisted in task document', async () => {
      const user2Agent = request.agent(app);
      await user2Agent
        .post('/api/login')
        .send({
          username: user2.username,
          password: 'password123'
        })
        .expect(200);

      const commentText = 'Persisted comment test';
      await user2Agent
        .post(`/api/tasks/${testTask._id}/comments`)
        .send({ text: commentText })
        .expect(200);

      const taskInDb = await Task.findById(testTask._id);
      expect(taskInDb.comments).toHaveLength(1);
      expect(taskInDb.comments[0].text).toBe(commentText);
      expect(taskInDb.comments[0].author.toString()).toEqual(user2._id.toString());
      expect(taskInDb.comments[0].authorName).toBe(user2.username);
      expect(taskInDb.comments[0].createdAt instanceof Date).toBe(true);
    });
  });
});

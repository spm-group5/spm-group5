import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import Subtask from '../../models/subtask.model.js';
import User from '../../models/user.model.js';
import Notification from '../../models/notification.model.js';
import { createAndAuthenticateUser } from './authHelpers.js';

vi.stubGlobal('io', {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn()
});

describe('Integration: Subtask Assignment � In-App Notification', () => {
  let agent;
  let assignorUser;
  let assigneeUser;
  let testProject;
  let testTask;
  let testSubtask;

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

    assignorUser = await createAndAuthenticateUser(agent, {
      username: `assignor-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@example.com`,
      roles: ['manager'],
      department: 'it',
      hashed_password: 'password123'
    });

    assigneeUser = await User.create({
      username: `assignee-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@example.com`,
      roles: ['manager'],
      department: 'it',
      hashed_password: 'password123'
    });

    const projectRes = await agent
      .post('/api/projects')
      .send({
        name: 'Subtask Assignment Test Project',
        description: 'Project for testing subtask assignment notifications',
        priority: 5
      })
      .expect(201);
    testProject = projectRes.body.data;

    const taskRes = await agent
      .post('/api/tasks')
      .send({
        title: 'Subtask Assignment Test Task',
        description: 'Task with assignees for testing subtask assignment',
        project: testProject._id,
        priority: 3
      })
      .expect(201);
    testTask = taskRes.body.data;

    const subtaskRes = await agent
      .post('/api/subtasks')
      .send({
        title: 'Subtask to be Assigned',
        description: 'This subtask will be assigned to another user',
        parentTaskId: testTask._id,
        projectId: testProject._id,
        priority: 2,
        assigneeId: [assignorUser._id]
      })
      .expect(201);
    testSubtask = subtaskRes.body.data;
  });

  describe('Happy Path: Subtask Assignment with Notification', () => {
    it('should assign subtask to another user and create in-app notification', async () => {
      const notificationsBefore = await Notification.find({ user: assigneeUser._id });
      expect(notificationsBefore).toHaveLength(0);

      const assignRes = await agent
        .put(`/api/subtasks/${testSubtask._id}`)
        .send({
          assigneeId: [assigneeUser._id]
        })
        .expect(200);

      expect(assignRes.body.success).toBe(true);
      expect(assignRes.body.message).toMatch(/updated|success/i);
      expect(assignRes.body.data).toHaveProperty('_id');
      expect(assignRes.body.data.assigneeId).toHaveLength(1);

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.assigneeId).toHaveLength(1);
      expect(subtaskInDb.assigneeId[0].toString()).toEqual(assigneeUser._id.toString());

      const notificationsAfter = await Notification.find({ user: assigneeUser._id });
      expect(notificationsAfter).toHaveLength(1);

      const notification = notificationsAfter[0];
      expect(notification.user.toString()).toEqual(assigneeUser._id.toString());
      expect(notification.message).toContain(testSubtask.title);
      expect(notification.assignor).toBeDefined();
      expect(notification.read).toBe(false);
      expect(notification.createdAt).toBeDefined();
    });
  });

  describe('Permission Tests: Only Task Assignees Can Assign Subtasks', () => {
    it('should allow manager to assign subtask and return 200', async () => {
      const response = await agent
        .put(`/api/subtasks/${testSubtask._id}`)
        .send({
          assigneeId: [assigneeUser._id]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assigneeId).toHaveLength(1);
    });

    it('should reject subtask assignment by staff user and return 403', async () => {
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
        .put(`/api/subtasks/${testSubtask._id}`)
        .send({
          assigneeId: [assigneeUser._id]
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/permission|insufficient/i);

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.assigneeId[0].toString()).toEqual(assignorUser._id.toString());
    });

    it('should reject assignment to non-existent subtask and return 400 or 404', async () => {
      const fakeSubtaskId = new mongoose.Types.ObjectId();

      const response = await agent
        .put(`/api/subtasks/${fakeSubtaskId}`)
        .send({
          assigneeId: [assigneeUser._id]
        })
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found|subtask/i);
    });
  });

  describe('Notification Details and Verification', () => {
    it('should create notification with correct fields when subtask is assigned', async () => {
      await agent
        .put(`/api/subtasks/${testSubtask._id}`)
        .send({
          assigneeId: [assigneeUser._id]
        })
        .expect(200);

      const notifications = await Notification.find({ user: assigneeUser._id });
      expect(notifications).toHaveLength(1);

      const notification = notifications[0];
      expect(notification).toHaveProperty('user');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('assignor');
      expect(notification).toHaveProperty('read');
      expect(notification).toHaveProperty('createdAt');

      expect(notification.user.toString()).toEqual(assigneeUser._id.toString());
      expect(notification.message).toMatch(testSubtask.title);
      expect(notification.read).toBe(false);
      expect(notification.createdAt instanceof Date).toBe(true);
    });

    it('should mark notification as unread when newly created', async () => {
      await agent
        .put(`/api/subtasks/${testSubtask._id}`)
        .send({
          assigneeId: [assigneeUser._id]
        })
        .expect(200);

      const notifications = await Notification.find({ user: assigneeUser._id });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].read).toBe(false);
    });

    it('should be retrievable via notifications API for assigned user', async () => {
      await agent
        .put(`/api/subtasks/${testSubtask._id}`)
        .send({
          assigneeId: [assigneeUser._id]
        })
        .expect(200);

      const assigneeAgent = request.agent(app);
      await assigneeAgent
        .post('/api/login')
        .send({
          username: assigneeUser.username,
          password: 'password123'
        })
        .expect(200);

      const response = await assigneeAgent
        .get('/api/notifications')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const subtaskNotification = response.body.find(n =>
        n.message && n.message.includes(testSubtask.title)
      );
      expect(subtaskNotification).toBeDefined();
      expect(subtaskNotification.read).toBe(false);
    });
  });

  describe('Multiple Assignees and Notification Edge Cases', () => {
    it('should create notification only for newly assigned users', async () => {
      const anotherUser = await User.create({
        username: `another-${Date.now()}@example.com`,
        roles: ['manager'],
        department: 'it',
        hashed_password: 'password123'
      });

      await agent
        .put(`/api/subtasks/${testSubtask._id}`)
        .send({
          assigneeId: [assignorUser._id, assigneeUser._id, anotherUser._id]
        })
        .expect(200);

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.assigneeId).toHaveLength(3);

      const assigneeNotifications = await Notification.find({ user: assigneeUser._id });
      const anotherUserNotifications = await Notification.find({ user: anotherUser._id });

      expect(assigneeNotifications.length).toBeGreaterThan(0);
      expect(anotherUserNotifications.length).toBeGreaterThan(0);
    });

    it('should verify subtask assignment is persisted correctly', async () => {
      const assignRes = await agent
        .put(`/api/subtasks/${testSubtask._id}`)
        .send({
          assigneeId: [assigneeUser._id]
        })
        .expect(200);

      expect(assignRes.body.data.assigneeId).toHaveLength(1);
      expect(assignRes.body.data.assigneeId[0]._id || assignRes.body.data.assigneeId[0]).toBeDefined();

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.assigneeId).toHaveLength(1);
      expect(subtaskInDb.assigneeId[0].toString()).toEqual(assigneeUser._id.toString());
      expect(subtaskInDb.title).toBe(testSubtask.title);
      expect(subtaskInDb.parentTaskId.toString()).toEqual(testTask._id);
    });
  });
});

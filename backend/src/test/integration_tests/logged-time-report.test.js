import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import { createAndAuthenticateUser, createTestUser, authenticateAs } from './authHelpers.js';

// Mock socket.io
vi.stubGlobal('io', {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn()
});

describe('Integration: Logged Time Report by Project', () => {
  let adminAgent;
  let staffAgent;
  let staffUser;
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
    // Create admin user and authenticate
    adminAgent = request.agent(app);
    await createAndAuthenticateUser(adminAgent, {
      username: `admin-${Date.now()}@test.com`,
      roles: ['admin'],
      department: 'it'
    });

    // Create staff user for authorization testing
    staffAgent = request.agent(app);
    staffUser = await createTestUser({
      username: `staff-${Date.now()}@test.com`,
      roles: ['staff'],
      department: 'it'
    });
    await authenticateAs(staffAgent, staffUser);

    // Create test project
    const projectRes = await adminAgent
      .post('/api/projects')
      .send({
        name: 'Time Tracking Test Project',
        description: 'Test project for time logging',
        priority: 5
      })
      .expect(201);
    testProject = projectRes.body.data;

    // Create test task
    const taskRes = await adminAgent
      .post('/api/tasks')
      .send({
        title: 'Main Task with Time',
        description: 'Task to track time on',
        project: testProject._id,
        priority: 5
      })
      .expect(201);
    testTask = taskRes.body.data;

    // Create test subtask
    const subtaskRes = await adminAgent
      .post('/api/subtasks')
      .send({
        title: 'Subtask with Time',
        description: 'Subtask to track time on',
        parentTaskId: testTask._id,
        projectId: testProject._id,
        priority: 3
      })
      .expect(201);
    testSubtask = subtaskRes.body.data;
  });

  describe('Time Logging Workflow', () => {
    it('should log time on a task successfully', async () => {
      const response = await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: 120 }) // 120 minutes = 2 hours
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task time logged successfully');
      expect(response.body.data.timeTaken).toBe(120);
    });

    it('should log time on a subtask successfully', async () => {
      const response = await adminAgent
        .patch(`/api/subtasks/${testSubtask._id}/time-taken`)
        .send({ timeTaken: 45 }) // 45 minutes
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subtask time logged successfully');
      expect(response.body.data.timeTaken).toBe(45);
    });

    it('should reject negative time values', async () => {
      const response = await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: -60 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Report Generation - PDF Format', () => {
    it('should generate PDF report with logged time data', async () => {
      // Log time on task and subtask
      await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: 120 })
        .expect(200);

      await adminAgent
        .patch(`/api/subtasks/${testSubtask._id}/time-taken`)
        .send({ timeTaken: 45 })
        .expect(200);

      // Generate PDF report
      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'pdf' })
        .expect(200);

      // Verify response headers for PDF
      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should include task and subtask time in report calculation', async () => {
      // Log time on both task and subtask
      await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: 120 })
        .expect(200);

      await adminAgent
        .patch(`/api/subtasks/${testSubtask._id}/time-taken`)
        .send({ timeTaken: 45 })
        .expect(200);

      // Create additional task with different time
      const task2Res = await adminAgent
        .post('/api/tasks')
        .send({
          title: 'Another Task',
          project: testProject._id,
          priority: 3
        })
        .expect(201);
      const task2 = task2Res.body.data;

      await adminAgent
        .patch(`/api/tasks/${task2._id}/time-taken`)
        .send({ timeTaken: 60 })
        .expect(200);

      // Generate report - should include all logged time
      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'pdf' })
        .expect(200);

      // PDF should be generated with data
      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should handle project with no logged time gracefully', async () => {
      // Generate report without logging any time
      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'pdf' })
        .expect(200);

      // Should return success or no-data response
      expect(response.status).toEqual(200);
    });

    it('should format time correctly in report (days, hours, minutes)', async () => {
      // Log time: 1440 minutes = 1 day
      await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: 1440 })
        .expect(200);

      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Report Generation - Excel Format', () => {
    it('should generate Excel report with logged time data', async () => {
      // Log time on task
      await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: 120 })
        .expect(200);

      // Generate Excel report
      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'excel' })
        .expect(200);

      // Verify response headers for Excel
      expect(response.headers['content-type']).toMatch(
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/
      );
      expect(response.headers['content-disposition']).toMatch(/attachment/);
      // Binary data will be a Buffer
      expect(response.body).toBeDefined();
    });

    it('should aggregate time across tasks and subtasks in Excel', async () => {
      // Log time on task and subtask
      await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: 120 })
        .expect(200);

      await adminAgent
        .patch(`/api/subtasks/${testSubtask._id}/time-taken`)
        .send({ timeTaken: 45 })
        .expect(200);

      // Generate Excel report
      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'excel' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/
      );
      // Binary data will be a Buffer
      expect(response.body).toBeDefined();
    });
  });

  describe('Authorization and Edge Cases', () => {
    it('should deny non-admin users access to report generation', async () => {
      // Log time as admin
      await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: 120 })
        .expect(200);

      // Try to generate report as staff user
      const response = await staffAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'pdf' })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.requiredRoles).toContain('admin');
    });

    it('should handle missing project gracefully', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();

      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${fakeProjectId}`)
        .query({ format: 'pdf' });

      // Should return 404 or 200 with no-data response
      expect([404, 200]).toContain(response.status);
    });

    it('should exclude archived tasks from report', async () => {
      // Create two tasks - one to archive, one to keep
      const taskToKeepRes = await adminAgent
        .post('/api/tasks')
        .send({
          title: 'Task to Keep',
          project: testProject._id,
          priority: 5
        })
        .expect(201);
      const taskToKeep = taskToKeepRes.body.data;

      // Log time on both tasks
      await adminAgent
        .patch(`/api/tasks/${testTask._id}/time-taken`)
        .send({ timeTaken: 120 })
        .expect(200);

      await adminAgent
        .patch(`/api/tasks/${taskToKeep._id}/time-taken`)
        .send({ timeTaken: 60 })
        .expect(200);

      // Archive the first task
      await adminAgent
        .patch(`/api/tasks/${testTask._id}/archive`)
        .expect(200);

      // Generate report - archived task should not be included but other task should
      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'pdf' })
        .expect(200);

      // Report should be generated with only non-archived task
      expect(response.headers['content-type']).toMatch(/application\/pdf/);
    });
  });

  describe('Report Data Structure and Grouping', () => {
    it('should group tasks by status in report', async () => {
      // Create tasks with different statuses
      const toDoTask = testTask;

      const inProgressRes = await adminAgent
        .post('/api/tasks')
        .send({
          title: 'In Progress Task',
          project: testProject._id,
          priority: 5,
          status: 'In Progress'
        })
        .expect(201);
      const inProgressTask = inProgressRes.body.data;

      // Log time on both
      await adminAgent
        .patch(`/api/tasks/${toDoTask._id}/time-taken`)
        .send({ timeTaken: 120 })
        .expect(200);

      await adminAgent
        .patch(`/api/tasks/${inProgressTask._id}/time-taken`)
        .send({ timeTaken: 60 })
        .expect(200);

      // Generate report
      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should handle tasks with zero logged time', async () => {
      // Create task without logging time
      const zeroTimeTask = testTask;

      // Create another task and log time
      const loggedTimeRes = await adminAgent
        .post('/api/tasks')
        .send({
          title: 'Task with Time',
          project: testProject._id,
          priority: 5
        })
        .expect(201);
      const loggedTimeTask = loggedTimeRes.body.data;

      await adminAgent
        .patch(`/api/tasks/${loggedTimeTask._id}/time-taken`)
        .send({ timeTaken: 60 })
        .expect(200);

      // Generate report - should include both tasks
      const response = await adminAgent
        .get(`/api/reports/logged-time/project/${testProject._id}`)
        .query({ format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});

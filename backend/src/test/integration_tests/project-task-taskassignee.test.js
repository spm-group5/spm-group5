import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import Project from '../../models/project.model.js';
import Task from '../../models/task.model.js';
import User from '../../models/user.model.js';

let currentUser = null;

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req, res, next) => {
    if (currentUser) {
      req.user = currentUser;
      next();
    } else {
      res.status(401).json({ success: false, message: 'Authentication required' });
    }
  },
  requireRole: (roles) => (req, res, next) => {
    if (currentUser && roles.some(role => currentUser.roles.includes(role))) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
  }
}));

vi.stubGlobal('io', {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn()
});

describe('Integration: Project → Task → Assignment Workflow', () => {
  let manager;
  let staff1;
  let staff2;

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
    manager = await User.create({
      username: `manager-${Date.now()}@example.com`,
      roles: ['manager'],
      department: 'it',
      hashed_password: 'testpassword123'
    });

    staff1 = await User.create({
      username: `staff1-${Date.now()}@example.com`,
      roles: ['staff'],
      department: 'it',
      hashed_password: 'testpassword123'
    });

    staff2 = await User.create({
      username: `staff2-${Date.now()}@example.com`,
      roles: ['staff'],
      department: 'systems',
      hashed_password: 'testpassword123'
    });

    currentUser = manager;
  });

  describe('Happy Path: Complete End-to-End Workflow', () => {
    it('should create project, create task, and assign task successfully', async () => {
      const projectData = {
        name: 'Integration Test Project',
        description: 'Testing the full workflow',
        priority: 5
      };

      const projectRes = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(projectRes.body.success).toBe(true);
      expect(projectRes.body.data).toHaveProperty('_id');
      expect(projectRes.body.data.name).toBe(projectData.name);
      expect(projectRes.body.data.owner).toBe(manager._id.toString());

      const projectInDb = await Project.findById(projectRes.body.data._id);
      expect(projectInDb).toBeDefined();
      expect(projectInDb.name).toBe(projectData.name);

      const taskData = {
        title: 'Integration Test Task',
        description: 'Testing task creation',
        project: projectRes.body.data._id,
        priority: 3
      };

      const taskRes = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(taskRes.body.success).toBe(true);
      expect(taskRes.body.data).toHaveProperty('_id');
      expect(taskRes.body.data.title).toBe(taskData.title);
      expect(taskRes.body.data.project).toBe(projectRes.body.data._id);
      expect(taskRes.body.data.assignee).toContain(manager._id.toString());

      const taskInDb = await Task.findById(taskRes.body.data._id);
      expect(taskInDb).toBeDefined();
      expect(taskInDb.title).toBe(taskData.title);
      expect(taskInDb.project.toString()).toEqual(projectRes.body.data._id);

      currentUser = manager;
      const assignRes = await request(app)
        .post(`/api/tasks/${taskRes.body.data._id}/assign`)
        .send({ assignee: staff1.username })
        .expect(200);

      expect(assignRes.body.success).toBe(true);
      expect(assignRes.body.data).toBeDefined();

      const assignedTask = await Task.findById(taskRes.body.data._id);
      expect(assignedTask.owner).toEqual(staff1._id);
    });
  });

  describe('Project Creation', () => {
    it('should create a project with valid data and return 201', async () => {
      const projectData = {
        name: 'Valid Project',
        description: 'A valid test project',
        priority: 7
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBe(projectData.description);
      expect(response.body.data.priority).toBe(projectData.priority);
      expect(response.body.data.owner).toBe(manager._id.toString());

      const projectInDb = await Project.findById(response.body.data._id);
      expect(projectInDb).toBeDefined();
      expect(projectInDb.name).toBe(projectData.name);
      expect(projectInDb.description).toBe(projectData.description);
      expect(projectInDb.owner).toEqual(manager._id);
    });

    it('should reject project creation with missing name and return 400', async () => {
      const projectData = {
        description: 'Project without name',
        priority: 5
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/name|required/i);

      const count = await Project.countDocuments();
      expect(count).toBe(0);
    });

    it('should reject project creation with past due date and return 400', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const projectData = {
        name: 'Past Due Project',
        dueDate: pastDate
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/past|due date/i);

      const count = await Project.countDocuments();
      expect(count).toBe(0);
    });

    it('should reject project creation with invalid priority and return 400', async () => {
      const projectData = {
        name: 'Invalid Priority Project',
        priority: 15
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/priority|1.*10/i);

      const count = await Project.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe('Task Creation Under Project', () => {
    let testProject;

    beforeEach(async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project for Tasks' })
        .expect(201);
      testProject = projectRes.body.data;
    });

    it('should create task under existing project and return 201', async () => {
      const taskData = {
        title: 'Valid Task',
        description: 'A valid task under project',
        project: testProject._id,
        priority: 4
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.project).toBe(testProject._id);
      expect(response.body.data.assignee).toContain(manager._id.toString());

      const taskInDb = await Task.findById(response.body.data._id);
      expect(taskInDb).toBeDefined();
      expect(taskInDb.title).toBe(taskData.title);
      expect(taskInDb.project.toString()).toEqual(testProject._id.toString());
      expect(taskInDb.assignee.map(id => id.toString())).toContain(manager._id.toString());
    });

    it('should reject task creation for non-existent project and return 400', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const taskData = {
        title: 'Task for Fake Project',
        project: fakeProjectId
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/project|does not exist/i);

      const count = await Task.countDocuments();
      expect(count).toBe(0);
    });

    it('should reject task creation with missing title and return 400', async () => {
      const taskData = {
        description: 'Task without title',
        project: testProject._id
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/title|required/i);

      const count = await Task.countDocuments();
      expect(count).toBe(0);
    });

    it('should auto-add task creator to assignee list on creation', async () => {
      const taskData = {
        title: 'Task Creator Assignment',
        project: testProject._id,
        priority: 2
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.data.assignee).toContain(manager._id.toString());

      const taskInDb = await Task.findById(response.body.data._id);
      expect(taskInDb.assignee.map(id => id.toString())).toContain(manager._id.toString());
    });
  });

  describe('Task Assignment', () => {
    let testProject;
    let testTask;

    beforeEach(async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project for Assignment' })
        .expect(201);
      testProject = projectRes.body.data;

      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task for Assignment',
          project: testProject._id
        })
        .expect(201);
      testTask = taskRes.body.data;
    });

    it('should assign task to existing user with manager role and return 200', async () => {
      const response = await request(app)
        .post(`/api/tasks/${testTask._id}/assign`)
        .send({ assignee: staff1.username })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.owner).toBeDefined();

      const assignedTask = await Task.findById(testTask._id);
      expect(assignedTask.owner).toEqual(staff1._id);
    });

    it('should reject assignment by non-manager user and return 403', async () => {
      currentUser = staff1;

      const response = await request(app)
        .post(`/api/tasks/${testTask._id}/assign`)
        .send({ assignee: staff2.username })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/permission|insufficient|Insufficient/i);

      const task = await Task.findById(testTask._id);
      expect(task.owner).toEqual(manager._id);
    });

    it('should reject assignment to non-existent task and return 400 or 404', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/tasks/${fakeTaskId}/assign`)
        .send({ assignee: staff1.username })
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });

      expect(response.body.success).toBe(false);
    });

    it('should reject assignment without assignee field and return 422', async () => {
      const response = await request(app)
        .post(`/api/tasks/${testTask._id}/assign`)
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/owner|assignee/i);

      const task = await Task.findById(testTask._id);
      expect(task.owner).toEqual(manager._id);
    });
  });

  describe('Data Consistency Verification', () => {
    let testProject;
    let testTask;

    beforeEach(async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .send({
          name: 'Project for Consistency Testing',
          priority: 5
        })
        .expect(201);
      testProject = projectRes.body.data;

      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task for Consistency Testing',
          project: testProject._id,
          priority: 3
        })
        .expect(201);
      testTask = taskRes.body.data;
    });

    it('should verify assignee is automatically added to project members', async () => {
      const projectInDb = await Project.findById(testProject._id).lean();
      expect(projectInDb.members).toBeDefined();
      expect(projectInDb.members.map(id => id.toString())).toContain(manager._id.toString());
    });

    it('should verify task creator is first assignee in task', async () => {
      const taskInDb = await Task.findById(testTask._id).lean();
      expect(taskInDb.assignee).toBeDefined();
      expect(taskInDb.assignee.length).toBeGreaterThan(0);
      expect(taskInDb.assignee[0].toString()).toEqual(manager._id.toString());
    });

    it('should verify complete workflow state after assignment', async () => {
      await request(app)
        .post(`/api/tasks/${testTask._id}/assign`)
        .send({ assignee: staff1.username })
        .expect(200);

      const projectInDb = await Project.findById(testProject._id).lean();
      const taskInDb = await Task.findById(testTask._id).lean();

      expect(projectInDb.members.map(id => id.toString())).toContain(manager._id.toString());
      expect(taskInDb.project.toString()).toEqual(testProject._id.toString());
      expect(taskInDb.owner.toString()).toEqual(staff1._id.toString());
      expect(taskInDb.assignee.map(id => id.toString())).toContain(manager._id.toString());
    });

    it('should verify multiple tasks linked to single project', async () => {
      const task2Res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Second Task for Project',
          project: testProject._id
        })
        .expect(201);

      const task3Res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Third Task for Project',
          project: testProject._id
        })
        .expect(201);

      const tasksInDb = await Task.find({ project: testProject._id }).lean();
      expect(tasksInDb.length).toBe(3);
      expect(tasksInDb.map(t => t._id.toString())).toContain(testTask._id.toString());
      expect(tasksInDb.map(t => t._id.toString())).toContain(task2Res.body.data._id);
      expect(tasksInDb.map(t => t._id.toString())).toContain(task3Res.body.data._id);
    });

    it('should verify user assignment list consistency', async () => {
      const task2Res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 2',
          project: testProject._id
        })
        .expect(201);

      await request(app)
        .post(`/api/tasks/${testTask._id}/assign`)
        .send({ assignee: staff1.username })
        .expect(200);

      const staff1OwnedTasks = await Task.find({ owner: staff1._id }).lean();
      expect(staff1OwnedTasks.length).toBeGreaterThan(0);
      expect(staff1OwnedTasks.some(t => t._id.equals(testTask._id))).toBe(true);

      const managerAssignedTasks = await Task.find({ assignee: manager._id }).lean();
      expect(managerAssignedTasks.length).toBeGreaterThan(0);
    });
  });
});

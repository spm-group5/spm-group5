import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import Project from '../../models/project.model.js';
import Task from '../../models/task.model.js';
import Subtask from '../../models/subtask.model.js';
import User from '../../models/user.model.js';
import { createAndAuthenticateUser } from './authHelpers.js';

vi.stubGlobal('io', {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn()
});

describe('Integration: Project → Task → Subtask → Comment Workflow', () => {
  let agent;
  let testUser;

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
    testUser = await createAndAuthenticateUser(agent, {
      username: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
      roles: ['staff'],
      department: 'it',
      hashed_password: 'password123'
    });
  });

  describe('Happy Path: Complete End-to-End Workflow', () => {
    it('should create project, task, subtask, and comment successfully', async () => {
      // Create project
      const projectRes = await agent
        .post('/api/projects')
        .send({
          name: 'Integration Test Project',
          description: 'Testing complete workflow',
          priority: 5
        })
        .expect(201);

      expect(projectRes.body.success).toBe(true);
      expect(projectRes.body.data).toHaveProperty('_id');
      expect(projectRes.body.data.name).toBe('Integration Test Project');
      expect(projectRes.body.data.owner).toBe(testUser._id.toString());

      const projectInDb = await Project.findById(projectRes.body.data._id);
      expect(projectInDb).toBeDefined();
      expect(projectInDb.name).toBe('Integration Test Project');

      // Create task
      const taskRes = await agent
        .post('/api/tasks')
        .send({
          title: 'Integration Test Task',
          description: 'Testing task creation under project',
          project: projectRes.body.data._id,
          priority: 3
        })
        .expect(201);

      expect(taskRes.body.success).toBe(true);
      expect(taskRes.body.data).toHaveProperty('_id');
      expect(taskRes.body.data.title).toBe('Integration Test Task');
      expect(taskRes.body.data.project).toBe(projectRes.body.data._id);
      expect(taskRes.body.data.assignee).toContain(testUser._id.toString());

      const taskInDb = await Task.findById(taskRes.body.data._id);
      expect(taskInDb).toBeDefined();
      expect(taskInDb.title).toBe('Integration Test Task');
      expect(taskInDb.project.toString()).toEqual(projectRes.body.data._id);

      // Create subtask
      const subtaskRes = await agent
        .post('/api/subtasks')
        .send({
          title: 'Integration Test Subtask',
          description: 'Testing subtask creation',
          parentTaskId: taskRes.body.data._id,
          projectId: projectRes.body.data._id,
          priority: 2
        })
        .expect(201);

      expect(subtaskRes.body.success).toBe(true);
      expect(subtaskRes.body.data).toHaveProperty('_id');
      expect(subtaskRes.body.data.title).toBe('Integration Test Subtask');
      expect(subtaskRes.body.data.parentTaskId).toBe(taskRes.body.data._id);
      expect(subtaskRes.body.data.projectId).toBe(projectRes.body.data._id);

      const subtaskInDb = await Subtask.findById(subtaskRes.body.data._id);
      expect(subtaskInDb).toBeDefined();
      expect(subtaskInDb.title).toBe('Integration Test Subtask');
      expect(subtaskInDb.parentTaskId.toString()).toEqual(taskRes.body.data._id);

      // Add comment to subtask
      const commentRes = await agent
        .post(`/api/subtasks/${subtaskRes.body.data._id}/comments`)
        .send({ text: 'Integration test comment' })
        .expect(200);

      expect(commentRes.body.success).toBe(true);
      expect(commentRes.body.data.comments).toHaveLength(1);
      expect(commentRes.body.data.comments[0].text).toBe('Integration test comment');
      expect(commentRes.body.data.comments[0].author).toBe(testUser._id.toString());

      const subtaskWithCommentInDb = await Subtask.findById(subtaskRes.body.data._id);
      expect(subtaskWithCommentInDb.comments).toHaveLength(1);
      expect(subtaskWithCommentInDb.comments[0].text).toBe('Integration test comment');
    });
  });

  describe('Project Creation', () => {
    it('should create project with valid data and return 201', async () => {
      const projectData = {
        name: 'Valid Test Project',
        description: 'A valid test project',
        priority: 7
      };

      const response = await agent
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBe(projectData.description);
      expect(response.body.data.priority).toBe(projectData.priority);
      expect(response.body.data.owner).toBe(testUser._id.toString());

      const projectInDb = await Project.findById(response.body.data._id);
      expect(projectInDb).toBeDefined();
      expect(projectInDb.name).toBe(projectData.name);
    });

    it('should reject project creation with missing name and return 400', async () => {
      const projectData = {
        description: 'Project without name',
        priority: 5
      };

      const response = await agent
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/name|required/i);

      const count = await Project.countDocuments();
      expect(count).toBe(0);
    });

    it('should reject project creation with invalid priority and return 400', async () => {
      const projectData = {
        name: 'Invalid Priority Project',
        priority: 15
      };

      const response = await agent
        .post('/api/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/priority|1.*10/i);

      const count = await Project.countDocuments();
      expect(count).toBe(0);
    });

    it('should verify project persisted to database with correct owner', async () => {
      const projectData = {
        name: 'Database Persistence Test',
        priority: 3
      };

      const response = await agent
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      const projectInDb = await Project.findById(response.body.data._id);
      expect(projectInDb).toBeDefined();
      expect(projectInDb.owner).toEqual(testUser._id);
      expect(projectInDb.name).toBe(projectData.name);
    });
  });

  describe('Task Creation Under Project', () => {
    let testProject;

    beforeEach(async () => {
      const projectRes = await agent
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

      const response = await agent
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.project).toBe(testProject._id);
      expect(response.body.data.assignee).toContain(testUser._id.toString());

      const taskInDb = await Task.findById(response.body.data._id);
      expect(taskInDb).toBeDefined();
      expect(taskInDb.title).toBe(taskData.title);
      expect(taskInDb.project.toString()).toEqual(testProject._id.toString());
    });

    it('should reject task creation for non-existent project and return 400', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const taskData = {
        title: 'Task for Fake Project',
        project: fakeProjectId
      };

      const response = await agent
        .post('/api/tasks')
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/project|does not exist|not found/i);

      const count = await Task.countDocuments();
      expect(count).toBe(0);
    });

    it('should reject task creation with missing title and return 400', async () => {
      const taskData = {
        description: 'Task without title',
        project: testProject._id
      };

      const response = await agent
        .post('/api/tasks')
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/title|required/i);

      const count = await Task.countDocuments();
      expect(count).toBe(0);
    });

    it('should verify task linked to project and persisted to database', async () => {
      const taskData = {
        title: 'Database Linking Test',
        project: testProject._id
      };

      const response = await agent
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      const taskInDb = await Task.findById(response.body.data._id);
      expect(taskInDb).toBeDefined();
      expect(taskInDb.project.toString()).toEqual(testProject._id.toString());
      expect(taskInDb.assignee.map(id => id.toString())).toContain(testUser._id.toString());
    });
  });

  describe('Subtask Creation Under Task', () => {
    let testProject;
    let testTask;

    beforeEach(async () => {
      const projectRes = await agent
        .post('/api/projects')
        .send({ name: 'Test Project for Subtasks' })
        .expect(201);
      testProject = projectRes.body.data;

      const taskRes = await agent
        .post('/api/tasks')
        .send({
          title: 'Test Task for Subtasks',
          project: testProject._id
        })
        .expect(201);
      testTask = taskRes.body.data;
    });

    it('should create subtask under existing task and return 201', async () => {
      const subtaskData = {
        title: 'Valid Subtask',
        description: 'A valid subtask under task',
        parentTaskId: testTask._id,
        projectId: testProject._id,
        priority: 2
      };

      const response = await agent
        .post('/api/subtasks')
        .send(subtaskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(subtaskData.title);
      expect(response.body.data.parentTaskId).toBe(testTask._id);
      expect(response.body.data.projectId).toBe(testProject._id);

      const subtaskInDb = await Subtask.findById(response.body.data._id);
      expect(subtaskInDb).toBeDefined();
      expect(subtaskInDb.parentTaskId.toString()).toEqual(testTask._id);
    });

    it('should reject subtask creation for non-existent task and return 400', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId();
      const subtaskData = {
        title: 'Subtask for Fake Task',
        parentTaskId: fakeTaskId,
        projectId: testProject._id
      };

      const response = await agent
        .post('/api/subtasks')
        .send(subtaskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/task|not found|does not exist/i);

      const count = await Subtask.countDocuments();
      expect(count).toBe(0);
    });

    it('should reject subtask creation with missing title and return 400', async () => {
      const subtaskData = {
        description: 'Subtask without title',
        parentTaskId: testTask._id,
        projectId: testProject._id
      };

      const response = await agent
        .post('/api/subtasks')
        .send(subtaskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/title|required/i);

      const count = await Subtask.countDocuments();
      expect(count).toBe(0);
    });

    it('should verify subtask linked to task and persisted to database', async () => {
      const subtaskData = {
        title: 'Database Linking Test',
        parentTaskId: testTask._id,
        projectId: testProject._id
      };

      const response = await agent
        .post('/api/subtasks')
        .send(subtaskData)
        .expect(201);

      const subtaskInDb = await Subtask.findById(response.body.data._id);
      expect(subtaskInDb).toBeDefined();
      expect(subtaskInDb.parentTaskId.toString()).toEqual(testTask._id);
      expect(subtaskInDb.projectId.toString()).toEqual(testProject._id);
    });
  });

  describe('Comment Creation Under Subtask', () => {
    let testProject;
    let testTask;
    let testSubtask;

    beforeEach(async () => {
      const projectRes = await agent
        .post('/api/projects')
        .send({ name: 'Test Project for Comments' })
        .expect(201);
      testProject = projectRes.body.data;

      const taskRes = await agent
        .post('/api/tasks')
        .send({
          title: 'Test Task for Comments',
          project: testProject._id
        })
        .expect(201);
      testTask = taskRes.body.data;

      const subtaskRes = await agent
        .post('/api/subtasks')
        .send({
          title: 'Test Subtask for Comments',
          parentTaskId: testTask._id,
          projectId: testProject._id
        })
        .expect(201);
      testSubtask = subtaskRes.body.data;
    });

    it('should create comment under existing subtask and return 200', async () => {
      const commentData = { text: 'Valid comment' };

      const response = await agent
        .post(`/api/subtasks/${testSubtask._id}/comments`)
        .send(commentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toHaveLength(1);
      expect(response.body.data.comments[0].text).toBe(commentData.text);
      expect(response.body.data.comments[0].author).toBe(testUser._id.toString());

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.comments).toHaveLength(1);
      expect(subtaskInDb.comments[0].text).toBe(commentData.text);
    });

    it('should reject comment creation for non-existent subtask and return 404', async () => {
      const fakeSubtaskId = new mongoose.Types.ObjectId();
      const commentData = { text: 'Comment for fake subtask' };

      const response = await agent
        .post(`/api/subtasks/${fakeSubtaskId}/comments`)
        .send(commentData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/subtask|not found/i);

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.comments).toHaveLength(0);
    });

    it('should reject comment creation with missing text and return 400', async () => {
      const commentData = {};

      const response = await agent
        .post(`/api/subtasks/${testSubtask._id}/comments`)
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/text|required|comment/i);

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.comments).toHaveLength(0);
    });

    it('should verify comment embedded in subtask document', async () => {
      const commentData = { text: 'Comment persistence test' };

      const response = await agent
        .post(`/api/subtasks/${testSubtask._id}/comments`)
        .send(commentData)
        .expect(200);

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.comments).toHaveLength(1);
      expect(subtaskInDb.comments[0].text).toBe(commentData.text);
      expect(subtaskInDb.comments[0].author).toEqual(testUser._id);
    });
  });

  describe('Data Consistency and Relationships', () => {
    let testProject;
    let testTask;
    let testSubtask;

    beforeEach(async () => {
      const projectRes = await agent
        .post('/api/projects')
        .send({
          name: 'Project for Consistency Testing',
          priority: 5
        })
        .expect(201);
      testProject = projectRes.body.data;

      const taskRes = await agent
        .post('/api/tasks')
        .send({
          title: 'Task for Consistency Testing',
          project: testProject._id
        })
        .expect(201);
      testTask = taskRes.body.data;

      const subtaskRes = await agent
        .post('/api/subtasks')
        .send({
          title: 'Subtask for Consistency Testing',
          parentTaskId: testTask._id,
          projectId: testProject._id
        })
        .expect(201);
      testSubtask = subtaskRes.body.data;
    });

    it('should verify complete hierarchy: project → task → subtask', async () => {
      const projectInDb = await Project.findById(testProject._id);
      expect(projectInDb).toBeDefined();

      const taskInDb = await Task.findById(testTask._id);
      expect(taskInDb).toBeDefined();
      expect(taskInDb.project.toString()).toEqual(testProject._id.toString());

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb).toBeDefined();
      expect(subtaskInDb.parentTaskId.toString()).toEqual(testTask._id);
      expect(subtaskInDb.projectId.toString()).toEqual(testProject._id);
    });

    it('should verify multiple subtasks linked to single task', async () => {
      const subtask2Res = await agent
        .post('/api/subtasks')
        .send({
          title: 'Second Subtask',
          parentTaskId: testTask._id,
          projectId: testProject._id
        })
        .expect(201);

      const subtask3Res = await agent
        .post('/api/subtasks')
        .send({
          title: 'Third Subtask',
          parentTaskId: testTask._id,
          projectId: testProject._id
        })
        .expect(201);

      const subtasksInDb = await Subtask.find({ parentTaskId: testTask._id });
      expect(subtasksInDb).toHaveLength(3);
      expect(subtasksInDb.map(st => st._id.toString())).toContain(testSubtask._id);
      expect(subtasksInDb.map(st => st._id.toString())).toContain(subtask2Res.body.data._id);
      expect(subtasksInDb.map(st => st._id.toString())).toContain(subtask3Res.body.data._id);
    });

    it('should verify multiple comments linked to single subtask', async () => {
      const comment1Res = await agent
        .post(`/api/subtasks/${testSubtask._id}/comments`)
        .send({ text: 'First comment' })
        .expect(200);

      const comment2Res = await agent
        .post(`/api/subtasks/${testSubtask._id}/comments`)
        .send({ text: 'Second comment' })
        .expect(200);

      const subtaskInDb = await Subtask.findById(testSubtask._id);
      expect(subtaskInDb.comments).toHaveLength(2);
      expect(subtaskInDb.comments[0].text).toBe('First comment');
      expect(subtaskInDb.comments[1].text).toBe('Second comment');
    });

    it('should verify project contains task and subtask relationships', async () => {
      const projectTasks = await Task.find({ project: testProject._id });
      expect(projectTasks.length).toBeGreaterThan(0);
      expect(projectTasks.map(t => t._id.toString())).toContain(testTask._id);

      const projectSubtasks = await Subtask.find({ projectId: testProject._id });
      expect(projectSubtasks.length).toBeGreaterThan(0);
      expect(projectSubtasks.map(st => st._id.toString())).toContain(testSubtask._id);
    });

    it('should verify task creator is in assignee list', async () => {
      const taskInDb = await Task.findById(testTask._id);
      expect(taskInDb.assignee).toBeDefined();
      expect(taskInDb.assignee.length).toBeGreaterThan(0);
      expect(taskInDb.assignee.map(id => id.toString())).toContain(testUser._id.toString());
    });
  });
});

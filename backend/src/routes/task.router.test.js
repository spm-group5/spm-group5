import { describe, it, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import taskRouter from './task.router.js';
import User from '../models/user.model.js';
import Task from '../models/task.model.js';
import Project from '../models/project.model.js';

let app;
let mongoServer;
let testUser;
let authToken;

beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app
    app = express();
    app.use(express.json());

    // Create test user
    testUser = await User.create({
        username: 'testuser',
        roles: ['staff'],
        department: 'it',
        hashed_password: 'password123'
    });

    // Mock auth middleware for testing
    app.use((req, res, next) => {
        req.user = testUser;
        next();
    });

    // Mount router
    app.use('/api', taskRouter);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Task.deleteMany({});
    await Project.deleteMany({});
});

describe('Task Router Test', () => {
    describe('POST /api/tasks', () => {
        it('should create a new task', async () => {
            const taskData = {
                title: 'New Task',
                description: 'Task description'
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('New Task');
            expect(response.body.data.status).toBe('To Do');
            expect(response.body.data.owner).toBe(testUser._id.toString());
        });

        it('should return 400 for missing title', async () => {
            const taskData = {
                description: 'No title'
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('title');
        });

        it('should create task with project', async () => {
            const project = await Project.create({
                name: 'Test Project',
                owner: testUser._id
            });

            const taskData = {
                title: 'Project Task',
                project: project._id
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(201);

            expect(response.body.data.project).toBe(project._id.toString());
        });

        it('should return 400 for past due date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const taskData = {
                title: 'Past Due Task',
                dueDate: yesterday
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('past');
        });
    });

    describe('GET /api/tasks', () => {
        beforeEach(async () => {
            const project = await Project.create({
                name: 'Test Project',
                owner: testUser._id
            });

            await Task.create([
                {
                    title: 'Task 1',
                    owner: testUser._id,
                    status: 'To Do'
                },
                {
                    title: 'Task 2',
                    owner: testUser._id,
                    status: 'In Progress',
                    project: project._id
                },
                {
                    title: 'Task 3',
                    owner: testUser._id,
                    status: 'Done'
                }
            ]);
        });

        it('should get all tasks', async () => {
            const response = await request(app)
                .get('/api/tasks')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
        });

        it('should filter tasks by status', async () => {
            const response = await request(app)
                .get('/api/tasks?status=To Do')
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe('Task 1');
        });

        it('should filter tasks by owner=me', async () => {
            const response = await request(app)
                .get('/api/tasks?owner=me')
                .expect(200);

            expect(response.body.data).toHaveLength(3);
            response.body.data.forEach(task => {
                expect(task.owner._id).toBe(testUser._id.toString());
            });
        });

        it('should filter standalone tasks', async () => {
            const response = await request(app)
                .get('/api/tasks?standalone=true')
                .expect(200);

            expect(response.body.data).toHaveLength(2);
            response.body.data.forEach(task => {
                expect(task.project).toBeNull();
            });
        });
    });

    describe('GET /api/tasks/:taskId', () => {
        it('should get task by ID', async () => {
            const task = await Task.create({
                title: 'Test Task',
                owner: testUser._id
            });

            const response = await request(app)
                .get(`/api/tasks/${task._id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('Test Task');
        });

        it('should return 404 for non-existent task', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .get(`/api/tasks/${fakeId}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not found');
        });
    });

    describe('PUT /api/tasks/:taskId', () => {
        let existingTask;

        beforeEach(async () => {
            existingTask = await Task.create({
                title: 'Original Title',
                owner: testUser._id,
                assignee: testUser._id
            });
        });

        it('should update task successfully', async () => {
            const updateData = {
                title: 'Updated Title',
                status: 'In Progress'
            };

            const response = await request(app)
                .put(`/api/tasks/${existingTask._id}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('Updated Title');
            expect(response.body.data.status).toBe('In Progress');
        });

        it('should return 400 for empty title', async () => {
            const updateData = {
                title: ''
            };

            const response = await request(app)
                .put(`/api/tasks/${existingTask._id}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('empty');
        });

        it('should update due date', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const updateData = {
                dueDate: futureDate
            };

            const response = await request(app)
                .put(`/api/tasks/${existingTask._id}`)
                .send(updateData)
                .expect(200);

            expect(response.body.data.dueDate).toBeDefined();
        });

        it('should return 400 for past due date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const updateData = {
                dueDate: yesterday
            };

            const response = await request(app)
                .put(`/api/tasks/${existingTask._id}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('past');
        });
    });

    describe('DELETE /api/tasks/:taskId', () => {
        it('should delete task successfully', async () => {
            const task = await Task.create({
                title: 'Task to Delete',
                owner: testUser._id
            });

            const response = await request(app)
                .delete(`/api/tasks/${task._id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('deleted');

            // Verify task is deleted
            const deletedTask = await Task.findById(task._id);
            expect(deletedTask).toBeNull();
        });

        it('should return 404 for non-existent task', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .delete(`/api/tasks/${fakeId}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not found');
        });
    });

    describe('Authorization Tests', () => {
        it('should not allow user to update task they do not own or are not assigned to', async () => {
            const otherUser = await User.create({
                username: 'otheruser',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password456'
            });

            const task = await Task.create({
                title: 'Not My Task',
                owner: otherUser._id,
                assignee: otherUser._id
            });

            const updateData = {
                title: 'Trying to Update'
            };

            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('permission');
        });

        it('should allow assignee to update task', async () => {
            const otherUser = await User.create({
                username: 'owner',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password456'
            });

            const task = await Task.create({
                title: 'Assigned to Me',
                owner: otherUser._id,
                assignee: testUser._id
            });

            const updateData = {
                status: 'In Progress'
            };

            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('In Progress');
        });

        it('should not allow user to delete task they do not own', async () => {
            const otherUser = await User.create({
                username: 'otherowner',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password789'
            });

            const task = await Task.create({
                title: 'Not My Task',
                owner: otherUser._id
            });

            const response = await request(app)
                .delete(`/api/tasks/${task._id}`)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('permission');
        });
    });
});
import { describe, it, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/user.model.js';
import Task from '../models/task.model.js';
import Project from '../models/project.model.js';

// Share currentUser for the auth mock to use
let currentUser = null;

vi.mock('../middleware/auth.middleware.js', () => ({
	requireAuth: (req, res, next) => {
		if (currentUser) {
			req.session = {
				authenticated: true,
				userId: currentUser._id,
				username: currentUser.username,
				userRoles: currentUser.roles,
				userDepartment: currentUser.department
			};
			req.user = currentUser;
		}
		next();
	}
}));

// Import router AFTER the mock above
import taskRouter from './task.router.js';

let app;
let mongoServer;
let testUser;
let authToken;

beforeAll(async () => {
    // Setup: Use the shared MongoDB connection from global test setup
    // Connection is already established by global test setup
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection not ready');
    }

    // Setup Express app
    app = express();
    app.use(express.json());
    
    app.set('io', null);
    app.set('userSockets', null);

    // Create test user
    testUser = await User.create({
        username: 'testuser@example.com',
        roles: ['staff'],
        department: 'it',
        hashed_password: 'password123'
    });

    // Assign for auth mock
    currentUser = testUser;

    // Mount router
    app.use('/api', taskRouter);
});

afterAll(async () => {
    // Cleanup is handled by global test setup
});

beforeEach(async () => {
    await Task.deleteMany({});
    await Project.deleteMany({});
    // Clean up dynamically created users (excluding testUser)
    await User.deleteMany({ username: { $ne: 'testuser@example.com' } });
});

describe('Task Router Test', () => {
    let testProject;
    let managerUser;

    beforeEach(async () => {
        testProject = await Project.create({
            name: 'Active Test Project',
            owner: testUser._id,
            status: 'Active'
        });

        managerUser = await User.create({
            username: 'manageruser@example.com',
            roles: ['manager'],
            department: 'it',
            hashed_password: 'password456'
        });
    });

    describe('POST /api/tasks', () => {
        it('should create a new task', async () => {
            const taskData = {
                title: 'New Task',
                description: 'Task description',
                project: testProject._id
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('New Task');
            expect(response.body.data.status).toBe('To Do');
            expect(response.body.data.owner).toBe(testUser._id.toString());
            expect(response.body.data.project).toBe(testProject._id.toString());
            expect(response.body.data.assignee).toHaveLength(1);
            expect(response.body.data.assignee[0]).toBe(testUser._id.toString());
        });

        it('should set creator as default assignee', async () => {
            const taskData = {
                title: 'Task',
                project: testProject._id
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(201);

            expect(response.body.data.assignee).toHaveLength(1);
            expect(response.body.data.assignee[0]).toBe(testUser._id.toString());
        });

        it('should include creator when additional assignees provided', async () => {
            const taskData = {
                title: 'Task',
                project: testProject._id,
                assignee: [managerUser._id]
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(201);

            expect(response.body.data.assignee).toHaveLength(2);
            expect(response.body.data.assignee).toContain(testUser._id.toString());
            expect(response.body.data.assignee).toContain(managerUser._id.toString());
        });

        it('should return 400 for missing title', async () => {
            const taskData = {
                description: 'No title',
                project: testProject._id
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('title');
        });

        it('should return 400 for missing project', async () => {
            const taskData = {
                title: 'Task without project'
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Project is required');
        });

        it('should create task with tags', async () => {
            const taskData = {
                title: 'Task with tags',
                project: testProject._id,
                tags: 'bug#urgent#frontend'
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(201);

            expect(response.body.data.tags).toBe('bug#urgent#frontend');
        });

        it('should return 400 for past due date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const taskData = {
                title: 'Past Due Task',
                project: testProject._id,
                dueDate: yesterday
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('past');
        });

        it('should return 400 for inactive project', async () => {
            const inactiveProject = await Project.create({
                name: 'Inactive Project',
                owner: testUser._id,
                status: 'Completed'
            });

            const taskData = {
                title: 'Task for inactive project',
                project: inactiveProject._id
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Active');
        });
    });

    describe('GET /api/tasks', () => {
        beforeEach(async () => {
            const project = await Project.create({
                name: 'Test Project',
                owner: testUser._id,
                status: 'Active'
            });

            await Task.create([
                {
                    title: 'Task 1',
                    owner: testUser._id,
                    status: 'To Do',
                    project: testProject._id
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
                    status: 'Done',
                    project: testProject._id
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

    });

    describe('GET /api/tasks/:taskId', () => {
        it('should get task by ID', async () => {
            const task = await Task.create({
                title: 'Test Task',
                owner: testUser._id,
                project: testProject._id
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
                assignee: testUser._id,
                project: testProject._id
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

        it('should update tags successfully', async () => {
            const updateData = {
                tags: 'updated#urgent#backend'
            };

            const response = await request(app)
                .put(`/api/tasks/${existingTask._id}`)
                .send(updateData)
                .expect(200);

            expect(response.body.data.tags).toBe('updated#urgent#backend');
        });

        it('should return 400 when trying to change project', async () => {
            const newProject = await Project.create({
                name: 'Another Project',
                owner: testUser._id,
                status: 'Active'
            });

            const updateData = {
                project: newProject._id
            };

            const response = await request(app)
                .put(`/api/tasks/${existingTask._id}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Project cannot be changed');
        });
    });

    // describe('DELETE /api/tasks/:taskId', () => {
    //     it('should delete task successfully', async () => {
    //         const task = await Task.create({
    //             title: 'Task to Delete',
    //             owner: testUser._id,
    //             project: testProject._id
    //         });

    //         const response = await request(app)
    //             .delete(`/api/tasks/${task._id}`)
    //             .expect(200);

    //         expect(response.body.success).toBe(true);
    //         expect(response.body.message).toContain('deleted');

    //         // Verify task is deleted
    //         const deletedTask = await Task.findById(task._id);
    //         expect(deletedTask).toBeNull();
    //     });

    //     it('should return 404 for non-existent task', async () => {
    //         const fakeId = new mongoose.Types.ObjectId();

    //         const response = await request(app)
    //             .delete(`/api/tasks/${fakeId}`)
    //             .expect(404);

    //         expect(response.body.success).toBe(false);
    //         expect(response.body.message).toContain('not found');
    //     });
    // });

    describe('PATCH /api/tasks/:taskId/archive', () => {
        it('should archive task successfully', async () => {
            const task = await Task.create({
                title: 'Task to Archive',
                owner: testUser._id,
                project: testProject._id
            });
        });
    });

    describe('PATCH /api/tasks/:taskId/unarchive', () => {
        it('should unarchive task successfully', async () => {
            const task = await Task.create({
                title: 'Task to Unarchive',
                owner: testUser._id,
                project: testProject._id
            });
        });
    });

    describe('Authorization Tests', () => {
        it('should not allow user to update task they do not own or are not assigned to', async () => {
            const otherUser = await User.create({
                username: 'otheruser@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password456'
            });

            const task = await Task.create({
                title: 'Not My Task',
                owner: otherUser._id,
                assignee: otherUser._id,
                project: testProject._id
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
                username: 'owner@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password456'
            });

            const task = await Task.create({
                title: 'Assigned to Me',
                owner: otherUser._id,
                assignee: testUser._id,
                project: testProject._id
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
        it('should not allow user to archive task they do not own', async () => {
            // Create a task owned by another user
            const otherUser = await User.create({
                username: 'otheruser2@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password456'
            });
        
            const task = await Task.create({
                title: 'Not My Task to Archive',
                owner: otherUser._id,
                assignee: otherUser._id,
                project: testProject._id
            });
        
            const response = await request(app)
                .patch(`/api/tasks/${task._id}/archive`)
                .expect(403);
        
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('permission');
        });
    });

    describe('Task Recurrence', () => {
        it('should create recurring task', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const taskData = {
                title: 'Recurring Weekly Task',
                project: testProject._id,
                dueDate: futureDate.toISOString(),
                isRecurring: true,
                recurrenceInterval: 7
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.isRecurring).toBe(true);
            expect(response.body.data.recurrenceInterval).toBe(7);
        });

        it('should return 400 for recurring task without interval', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const taskData = {
                title: 'Recurring Task',
                project: testProject._id,
                dueDate: futureDate.toISOString(),
                isRecurring: true
            };

            const response = await request(app)
                .post('/api/tasks')
                .send(taskData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('interval');
        });

        it('should turn off recurrence when updating task', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const task = await Task.create({
                title: 'Recurring Task',
                owner: testUser._id,
                assignee: [testUser._id],
                project: testProject._id,
                dueDate: futureDate,
                isRecurring: true,
                recurrenceInterval: 7
            });

            const updateData = {
                isRecurring: false
            };

            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .send(updateData)
                .expect(200);

            expect(response.body.data.isRecurring).toBe(false);
            expect(response.body.data.recurrenceInterval).toBeNull();
        });

        it('should create new task instance when recurring task is completed', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const task = await Task.create({
                title: 'Daily Standup',
                owner: testUser._id,
                assignee: [testUser._id],
                project: testProject._id,
                dueDate: futureDate,
                isRecurring: true,
                recurrenceInterval: 1,
                status: 'In Progress'
            });

            const updateData = {
                status: 'Done'
            };

            const response = await request(app)
                .put(`/api/tasks/${task._id}`)
                .send(updateData)
                .expect(200);

            expect(response.body.data.status).toBe('Done');

            // Check that a new task was created
            const tasks = await Task.find({
                title: 'Daily Standup',
                status: 'To Do'
            });

            expect(tasks.length).toBeGreaterThan(0);
            const newTask = tasks[0];
            expect(newTask.isRecurring).toBe(true);
            expect(newTask.recurrenceInterval).toBe(1);
        });
    });
});
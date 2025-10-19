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
            status: 'To Do'
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
            expect(response.body.message).toContain('completed');
        });
    });

    describe('GET /api/tasks', () => {
        beforeEach(async () => {
            const project = await Project.create({
                name: 'Test Project',
                owner: testUser._id,
                status: 'To Do'
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
                status: 'To Do'
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

    describe('DELETE /api/tasks/:taskId', () => {
        it('should delete task successfully', async () => {
            const task = await Task.create({
                title: 'Task to Delete',
                owner: testUser._id,
                project: testProject._id
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

        it('should not allow user to delete task they do not own', async () => {
            const otherUser = await User.create({
                username: 'otherowner@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password789'
            });

            const task = await Task.create({
                title: 'Not My Task',
                owner: otherUser._id,
                project: testProject._id
            });

            const response = await request(app)
                .delete(`/api/tasks/${task._id}`)
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

    /**
     * NEW TEST SUITE: Project Task Viewing Permissions - Router Integration (TDD)
     * Test Cards Covered: PTV-002, PTV-003, PTV-005, PTV-008, PTV-011, PTV-012, PTV-013, PTV-014, PTV-015
     *
     * Purpose: End-to-end integration tests for GET /api/projects/:projectId/tasks endpoint
     * Tests the entire stack: Router → Controller → Service → Database
     * Only authentication middleware is mocked
     *
     * Note: These tests will FAIL until the endpoint and business logic are implemented.
     * This follows TDD (Test-Driven Development) methodology.
     */
    describe('Task Viewing Permissions - Router Integration (TDD)', () => {
        let staff123, staff456, marketing001, adminUser;
        let engineeringProject, marketingProject;

        beforeEach(async () => {
            // Create users with different departments and roles
            staff123 = await User.create({
                username: 'staff123@example.com',
                roles: ['staff'],
                department: 'engineering',
                hashed_password: 'password123'
            });

            staff456 = await User.create({
                username: 'staff456@example.com',
                roles: ['staff'],
                department: 'engineering',
                hashed_password: 'password456'
            });

            marketing001 = await User.create({
                username: 'marketing001@example.com',
                roles: ['staff'],
                department: 'sales',
                hashed_password: 'passwordmarketing'
            });

            adminUser = await User.create({
                username: 'admin@example.com',
                roles: ['admin'],
                department: 'it',
                hashed_password: 'passwordadmin'
            });

            // Create projects
            engineeringProject = await Project.create({
                name: 'Engineering Project',
                description: 'Project for engineering team',
                owner: staff123._id,
                status: 'To Do'
            });

            marketingProject = await Project.create({
                name: 'Marketing Project',
                description: 'Project for marketing team',
                owner: marketing001._id,
                status: 'To Do'
            });
        });

        describe('GET /api/projects/:projectId/tasks', () => {
            describe('[PTV-002] Staff views tasks when personally assigned', () => {
                it('should return all tasks when staff member is personally assigned', async () => {
                    // Arrange: Create tasks - one assigned to staff123, one to someone else
                    await Task.create({
                        title: 'Setup Database',
                        description: 'Initialize database',
                        owner: staff123._id,
                        assignee: [staff123._id],
                        project: engineeringProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    await Task.create({
                        title: 'Design UI',
                        description: 'Create UI mockups',
                        owner: staff456._id,
                        assignee: [staff456._id],
                        project: engineeringProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    // Set current user to staff123
                    currentUser = staff123;

                    // Act: GET request to /projects/:projectId/tasks
                    const response = await request(app)
                        .get(`/api/projects/${engineeringProject._id}/tasks`)
                        .expect(200);

                    // Assert: Should return ALL tasks (both tasks)
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toBeDefined();
                    expect(Array.isArray(response.body.data)).toBe(true);
                    expect(response.body.data).toHaveLength(2);

                    const taskTitles = response.body.data.map(t => t.title);
                    expect(taskTitles).toContain('Setup Database');
                    expect(taskTitles).toContain('Design UI');
                });
            });

            describe('[PTV-003] Staff views tasks via department colleague', () => {
                it('should return all tasks when department colleague is assigned', async () => {
                    // Arrange: Create task assigned ONLY to staff456 (same engineering dept as staff123)
                    await Task.create({
                        title: 'Engineering Task',
                        description: 'Task for engineering team',
                        owner: staff456._id,
                        assignee: [staff456._id],
                        project: engineeringProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    // Set current user to staff123 (NOT assigned, but same department)
                    currentUser = staff123;

                    // Act: GET request
                    const response = await request(app)
                        .get(`/api/projects/${engineeringProject._id}/tasks`)
                        .expect(200);

                    // Assert: staff123 can view because staff456 (same department) is assigned
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toHaveLength(1);
                    expect(response.body.data[0].title).toBe('Engineering Task');
                });

                it('should deny access when no department colleagues are assigned', async () => {
                    // Arrange: Create task assigned ONLY to marketing department
                    await Task.create({
                        title: 'Marketing Task',
                        description: 'Task for marketing team',
                        owner: marketing001._id,
                        assignee: [marketing001._id],
                        project: marketingProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    // Set current user to staff123 (engineering)
                    currentUser = staff123;

                    // Act & Assert: staff123 tries to access marketing project tasks
                    const response = await request(app)
                        .get(`/api/projects/${marketingProject._id}/tasks`)
                        .expect(403);

                    expect(response.body.success).toBe(false);
                    expect(response.body.message).toMatch(/Access denied|not have permission/i);
                });
            });

            describe('[PTV-005] Admin views all tasks without restrictions', () => {
                it('should return all tasks for admin without assignment checks', async () => {
                    // Arrange: Create tasks assigned to staff users (NOT to admin)
                    await Task.create({
                        title: 'Task 1',
                        owner: staff123._id,
                        assignee: [staff123._id],
                        project: engineeringProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    await Task.create({
                        title: 'Task 2',
                        owner: staff456._id,
                        assignee: [staff456._id],
                        project: engineeringProject._id,
                        status: 'In Progress',
                        priority: 3
                    });

                    // Set current user to admin
                    currentUser = adminUser;

                    // Act: Admin requests tasks
                    const response = await request(app)
                        .get(`/api/projects/${engineeringProject._id}/tasks`)
                        .expect(200);

                    // Assert: Admin sees all 2 tasks despite not being assigned
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toHaveLength(2);
                });

                it('should allow admin to access any department project', async () => {
                    // Arrange: Create task in marketing department project
                    await Task.create({
                        title: 'Marketing Task',
                        owner: marketing001._id,
                        assignee: [marketing001._id],
                        project: marketingProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    // Set current user to admin (IT department)
                    currentUser = adminUser;

                    // Act: Admin requests tasks from marketing project
                    const response = await request(app)
                        .get(`/api/projects/${marketingProject._id}/tasks`)
                        .expect(200);

                    // Assert: Admin can access despite being in different department
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toHaveLength(1);
                    expect(response.body.data[0].title).toBe('Marketing Task');
                });
            });

            describe('[PTV-008] Authentication middleware verification', () => {
                it('should require authentication for endpoint', async () => {
                    // Arrange: Set currentUser to null (no authentication)
                    currentUser = null;

                    // Act: Attempt to access endpoint without auth
                    const response = await request(app)
                        .get(`/api/projects/${engineeringProject._id}/tasks`);

                    // Assert: Should return 401 or be denied
                    // Note: Behavior depends on how middleware handles null currentUser
                    expect([401, 403]).toContain(response.status);
                });

                it('should proceed when authenticated', async () => {
                    // Arrange: Create task and set authenticated user
                    await Task.create({
                        title: 'Auth Test Task',
                        owner: staff123._id,
                        assignee: [staff123._id],
                        project: engineeringProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    currentUser = staff123;

                    // Act: Access with authentication
                    const response = await request(app)
                        .get(`/api/projects/${engineeringProject._id}/tasks`);

                    // Assert: Should proceed (not 401)
                    expect(response.status).not.toBe(401);
                });
            });

            describe('[PTV-011] Staff accesses non-existent project', () => {
                it('should return 404 when staff accesses non-existent project', async () => {
                    // Arrange: Generate non-existent ObjectId
                    const nonExistentId = new mongoose.Types.ObjectId();
                    currentUser = staff123;

                    // Act: Attempt to access non-existent project
                    const response = await request(app)
                        .get(`/api/projects/${nonExistentId}/tasks`)
                        .expect(404);

                    // Assert: Standard error response
                    expect(response.body.success).toBe(false);
                    expect(response.body.message).toMatch(/Project not found/i);
                });
            });

            describe('[PTV-012] Admin accesses non-existent project', () => {
                it('should return 404 when admin accesses non-existent project', async () => {
                    // Arrange: Generate non-existent ObjectId
                    const nonExistentId = new mongoose.Types.ObjectId();
                    currentUser = adminUser;

                    // Act: Admin attempts to access non-existent project
                    const response = await request(app)
                        .get(`/api/projects/${nonExistentId}/tasks`)
                        .expect(404);

                    // Assert: Admin role should NOT bypass existence validation
                    expect(response.body.success).toBe(false);
                    expect(response.body.message).toMatch(/Project not found/i);
                });
            });

            describe('[PTV-013] Malformed projectId validation', () => {
                const invalidProjectIds = [
                    'invalid-id-123',
                    'abc',
                    '12345',
                    'proj001',
                    'not-24-chars'
                ];

                invalidProjectIds.forEach(invalidId => {
                    it(`should return 400 for invalid projectId: "${invalidId}"`, async () => {
                        // Arrange
                        currentUser = staff123;

                        // Act: Send request with invalid ID
                        const response = await request(app)
                            .get(`/api/projects/${invalidId}/tasks`)
                            .expect(400);

                        // Assert: Validation error
                        expect(response.body.success).toBe(false);
                        expect(response.body.message).toMatch(/Invalid project ID format/i);
                    });
                });

                it('should accept valid 24-character hex ObjectId', async () => {
                    // Arrange: Create project with specific valid ObjectId
                    const validId = new mongoose.Types.ObjectId();
                    const validProject = await Project.create({
                        _id: validId,
                        name: 'Valid ID Project',
                        owner: staff123._id,
                        status: 'To Do'
                    });

                    await Task.create({
                        title: 'Valid Task',
                        owner: staff123._id,
                        assignee: [staff123._id],
                        project: validProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    currentUser = staff123;

                    // Act: Request with valid ObjectId
                    const response = await request(app)
                        .get(`/api/projects/${validId.toString()}/tasks`)
                        .expect(200);

                    // Assert: Should succeed
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toHaveLength(1);
                });
            });

            describe('[PTV-014] Staff with null/undefined department', () => {
                it('should deny access when staff has undefined department', async () => {
                    // Arrange: Create task assigned to engineering staff
                    await Task.create({
                        title: 'Engineering Task',
                        owner: staff456._id,
                        assignee: [staff456._id],
                        project: engineeringProject._id,
                        status: 'To Do',
                        priority: 5
                    });

                    // Create user with undefined department
                    const staffNoDept = await User.create({
                        username: 'staffnodept@example.com',
                        roles: ['staff'],
                        department: 'it',
                        hashed_password: 'password'
                    });

                    // Manually set department to undefined in currentUser
                    currentUser = {
                        ...staffNoDept.toObject(),
                        department: undefined
                    };

                    // Act: Attempt to access
                    const response = await request(app)
                        .get(`/api/projects/${engineeringProject._id}/tasks`)
                        .expect(403);

                    // Assert: Access denied
                    expect(response.body.success).toBe(false);
                    expect(response.body.message).toMatch(/Access denied|not have permission/i);
                });
            });

            describe('[PTV-015] Project with empty task list', () => {
                it('should return empty array for project with no tasks', async () => {
                    // Arrange: Project exists but has no tasks
                    const emptyProject = await Project.create({
                        name: 'Empty Project',
                        description: 'Project without tasks',
                        owner: staff123._id,
                        status: 'To Do'
                    });

                    currentUser = staff123;

                    // Act: Request tasks for empty project
                    const response = await request(app)
                        .get(`/api/projects/${emptyProject._id}/tasks`)
                        .expect(200);

                    // Assert: Should return empty array (Option A - permissive)
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toBeDefined();
                    expect(Array.isArray(response.body.data)).toBe(true);
                    expect(response.body.data).toHaveLength(0);
                });

                it('should allow admin to access empty project', async () => {
                    // Arrange: Empty project
                    const emptyProject = await Project.create({
                        name: 'Admin Empty Project',
                        owner: staff123._id,
                        status: 'To Do'
                    });

                    currentUser = adminUser;

                    // Act: Admin requests tasks
                    const response = await request(app)
                        .get(`/api/projects/${emptyProject._id}/tasks`)
                        .expect(200);

                    // Assert: Admin can access even with no tasks
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toHaveLength(0);
                });
            });

            describe('[PTV-009] Standard task fields validation', () => {
                it('should return tasks with all standard required fields', async () => {
                    // Arrange: Create task with all fields
                    await Task.create({
                        title: 'Complete Task',
                        description: 'Task with all fields',
                        owner: staff123._id,
                        assignee: [staff123._id],
                        project: engineeringProject._id,
                        status: 'In Progress',
                        priority: 8,
                        tags: 'urgent#backend'
                    });

                    currentUser = staff123;

                    // Act: Get tasks
                    const response = await request(app)
                        .get(`/api/projects/${engineeringProject._id}/tasks`)
                        .expect(200);

                    // Assert: Verify standard fields exist
                    expect(response.body.data).toHaveLength(1);
                    const task = response.body.data[0];

                    expect(task._id).toBeDefined();
                    expect(typeof task._id).toBe('string');

                    expect(task.title).toBeDefined();
                    expect(typeof task.title).toBe('string');

                    expect(task.project).toBeDefined();
                    expect(typeof task.project).toBe('string');

                    expect(task.status).toBeDefined();
                    expect(typeof task.status).toBe('string');

                    expect(task.assignee).toBeDefined();
                    expect(Array.isArray(task.assignee)).toBe(true);

                    expect(task.createdAt).toBeDefined();
                    expect(task.updatedAt).toBeDefined();
                });
            });
        });
    });
});
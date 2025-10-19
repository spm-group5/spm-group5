import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';

let mongoServer;
let currentUser = null;

//This Route Testing covers ALL CRUD operations for Projects; auth is mocked for simplicity; Real database operations; Edge Cases such as missing fields, unauthorized access, non-existent resources

// Mock ONLY the authentication middleware
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
        if (currentUser && roles.some(role => currentUser.roles.includes(role))) {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }
    }
}));

beforeAll(async () => {
    // Setup: Use the shared MongoDB connection from global test setup
    // Connection is already established by global test setup
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection not ready');
    }
});

afterAll(async () => {
    // Cleanup is handled by global test setup
});

describe('Project Router Test', () => {
    let testUser, otherUser;

    beforeAll(async () => {
        // Create test users
        testUser = await User.create({
            username: 'projectuser@example.com',
            roles: ['staff'],
            department: 'it',
            hashed_password: 'hashedpassword123'
        });

        otherUser = await User.create({
            username: 'otheruser@example.com',
            roles: ['staff'],
            department: 'hr',
            hashed_password: 'hashedpassword456'
        });
    });

    beforeEach(async () => {
        // Clean up projects before each test
        await Project.deleteMany({});
        // Set default authenticated user
        currentUser = testUser;
    });

    describe('POST /api/projects - Create Project', () => {
        it('should create a new project successfully', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const projectData = {
                name: 'New Project',
                description: 'Project description',
                dueDate: futureDate
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Project created successfully');
            expect(response.body.data.name).toBe('New Project');
            expect(response.body.data.description).toBe('Project description');
            expect(response.body.data.status).toBe('To Do');
            expect(response.body.data.owner.toString()).toBe(testUser._id.toString());
        });

        it('should fail to create project without name', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const projectData = {
                description: 'Project without name',
                dueDate: futureDate
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Project name is required');
        });

        it('should create project with only name and dueDate (description optional)', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const projectData = {
                name: 'Simple Project',
                dueDate: futureDate
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Simple Project');
            expect(response.body.data.description).toBe('');
        });

        it('should fail without authentication', async () => {
            currentUser = null; // No authenticated user

            const futureDate = new Date(Date.now() + 86400000);
            const projectData = {
                name: 'Unauthenticated Project',
                dueDate: futureDate
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Authentication required');
        });
    });

    describe('GET /api/projects - Get All Projects', () => {
        beforeEach(async () => {
            const futureDate = new Date(Date.now() + 86400000);
            // Create test projects
            await Project.create({
                name: 'User Project 1',
                description: 'First project',
                owner: testUser._id,
                dueDate: futureDate
            });

            await Project.create({
                name: 'User Project 2',
                description: 'Second project',
                owner: testUser._id,
                dueDate: futureDate
            });

            await Project.create({
                name: 'Other User Project',
                description: 'Project by other user',
                owner: otherUser._id,
                dueDate: futureDate
            });
        });

        it('should get all projects for authenticated user', async () => {
            const response = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3); // All projects should be returned
            const projectNames = response.body.data.map(p => p.name);
            expect(projectNames).toContain('User Project 1');
            expect(projectNames).toContain('User Project 2');
            expect(projectNames).toContain('Other User Project');
        });

        it('should return all projects even when user has no owned projects', async () => {
            await Project.deleteMany({ owner: testUser._id });

            const response = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1); // The other user's project
            expect(response.body.data[0].name).toBe('Other User Project');
        });

        it('should fail without authentication', async () => {
            currentUser = null;

            const response = await request(app)
                .get('/api/projects')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Authentication required');
        });
    });

    describe('GET /api/projects/:projectId - Get Project by ID', () => {
        let testProject;

        beforeEach(async () => {
            const futureDate = new Date(Date.now() + 86400000);
            testProject = await Project.create({
                name: 'Test Project',
                description: 'Project for testing',
                owner: testUser._id,
                dueDate: futureDate
            });
        });

        it('should get project by ID successfully', async () => {
            const response = await request(app)
                .get(`/api/projects/${testProject._id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Test Project');
            expect(response.body.data._id).toBe(testProject._id.toString());
        });

        it('should return 404 for non-existent project', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .get(`/api/projects/${nonExistentId}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Project not found');
        });

        it('should return 500 for invalid project ID format', async () => {
            const response = await request(app)
                .get('/api/projects/invalid-id')
                .expect(500);

            expect(response.body.success).toBe(false);
        });

        it('should fail without authentication', async () => {
            currentUser = null;

            const response = await request(app)
                .get(`/api/projects/${testProject._id}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/projects/:projectId - Update Project', () => {
        let testProject, otherUserProject;

        beforeEach(async () => {
            const futureDate = new Date(Date.now() + 86400000);
            testProject = await Project.create({
                name: 'Original Project',
                description: 'Original description',
                owner: testUser._id,
                dueDate: futureDate
            });

            otherUserProject = await Project.create({
                name: 'Other User Project',
                description: 'Other user description',
                owner: otherUser._id,
                dueDate: futureDate
            });
        });

        it('should update project successfully when user is owner', async () => {
            const updateData = {
                name: 'Updated Project',
                description: 'Updated description'
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Updated Project');
            expect(response.body.data.description).toBe('Updated description');
        });

        it('should fail to update when user is not owner', async () => {
            const updateData = {
                name: 'Unauthorized Update'
            };

            const response = await request(app)
                .put(`/api/projects/${otherUserProject._id}`)
                .send(updateData)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Only project owner can update');
        });

        it('should return 400 for non-existent project', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const updateData = { name: 'Updated Name' };

            const response = await request(app)
                .put(`/api/projects/${nonExistentId}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should fail without authentication', async () => {
            currentUser = null;
            const updateData = { name: 'Updated Name' };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .send(updateData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/projects/:projectId - Delete Project', () => {
        let testProject, otherUserProject;

        beforeEach(async () => {
            const futureDate = new Date(Date.now() + 86400000);
            testProject = await Project.create({
                name: 'Project to Delete',
                description: 'This will be deleted',
                owner: testUser._id,
                dueDate: futureDate
            });

            otherUserProject = await Project.create({
                name: 'Other User Project',
                description: 'Other user project',
                owner: otherUser._id,
                dueDate: futureDate
            });
        });

        it('should delete project successfully when user is owner', async () => {
            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Project deleted successfully');

            // Verify project is actually deleted
            const deletedProject = await Project.findById(testProject._id);
            expect(deletedProject).toBeNull();
        });

        it('should fail to delete when user is not owner', async () => {
            const response = await request(app)
                .delete(`/api/projects/${otherUserProject._id}`)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Only project owner can delete');

            // Verify project still exists
            const existingProject = await Project.findById(otherUserProject._id);
            expect(existingProject).toBeTruthy();
        });

        it('should return 404 for non-existent project', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .delete(`/api/projects/${nonExistentId}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should fail without authentication', async () => {
            currentUser = null;

            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Route Protection', () => {
        it('should require authentication for all project routes', async () => {
            currentUser = null;

            // Test all endpoints without authentication
            await request(app).post('/api/projects').expect(401);
            await request(app).get('/api/projects').expect(401);
            await request(app).get('/api/projects/someId').expect(401);
            await request(app).put('/api/projects/someId').expect(401);
            await request(app).delete('/api/projects/someId').expect(401);
        });
    });

    /**
     * NEW TEST SUITE: Project Task Viewing Permissions - Router Integration (TDD)
     * Test Cards Covered: PTV-001, PTV-004, PTV-008, PTV-010
     *
     * Purpose: End-to-end integration tests for GET /api/projects endpoint with canViewTasks metadata
     * Tests the entire stack: Router → Controller → Service → Database
     * Only authentication middleware is mocked
     *
     * Note: These tests will FAIL until getProjectsWithAccessMetadata is implemented.
     * This follows TDD (Test-Driven Development) methodology.
     */
    describe('Project Task Viewing Permissions - Router Integration (TDD)', () => {
        let staff123, staff456, marketing001, adminUser;
        const Task = (async () => (await import('../models/task.model.js')).default)();

        beforeEach(async () => {
            // Clean up
            await Project.deleteMany({});
            await User.deleteMany({ username: { $ne: 'projectuser@example.com', $ne: 'otheruser@example.com' } });

            // Import Task model and clean
            const TaskModel = await Task;
            await TaskModel.deleteMany({});

            // Create test users
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
        });

        describe('GET /api/projects (with canViewTasks metadata)', () => {
            describe('[PTV-001] Staff member views all projects', () => {
                it('should return all projects for authenticated staff member', async () => {
                    const futureDate = new Date(Date.now() + 86400000);
                    // Arrange: Create 3 projects
                    await Project.insertMany([
                        {
                            name: 'Project Alpha',
                            description: 'First project',
                            owner: staff123._id,
                            members: [staff123._id],
                            status: 'To Do',
                            dueDate: futureDate
                        },
                        {
                            name: 'Project Beta',
                            description: 'Second project',
                            owner: staff456._id,
                            members: [staff456._id],
                            status: 'In Progress',
                            dueDate: futureDate
                        },
                        {
                            name: 'Project Gamma',
                            description: 'Third project',
                            owner: marketing001._id,
                            members: [marketing001._id],
                            status: 'To Do',
                            dueDate: futureDate
                        }
                    ]);

                    // Set current user to staff123
                    currentUser = staff123;

                    // Act: GET request to /projects
                    const response = await request(app)
                        .get('/api/projects')
                        .expect(200);

                    // Assert: Verify response structure and data
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toBeDefined();
                    expect(Array.isArray(response.body.data)).toBe(true);
                    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

                    // Verify each project has required properties
                    response.body.data.forEach(project => {
                        expect(project._id).toBeDefined();
                        expect(project.name).toBeDefined();
                        expect(typeof project._id).toBe('string');
                        expect(typeof project.name).toBe('string');
                    });

                    // Verify Content-Type header
                    expect(response.headers['content-type']).toMatch(/application\/json/);
                });
            });

            describe('[PTV-004] Admin views all projects', () => {
                it('should return all projects for authenticated admin', async () => {
                    const futureDate = new Date(Date.now() + 86400000);
                    // Arrange: Create 3 projects
                    await Project.insertMany([
                        {
                            name: 'Admin Project 1',
                            description: 'Admin accessible project 1',
                            owner: staff123._id,
                            members: [staff123._id],
                            status: 'To Do',
                            dueDate: futureDate
                        },
                        {
                            name: 'Admin Project 2',
                            description: 'Admin accessible project 2',
                            owner: staff456._id,
                            members: [staff456._id],
                            status: 'In Progress',
                            dueDate: futureDate
                        },
                        {
                            name: 'Admin Project 3',
                            description: 'Admin accessible project 3',
                            owner: marketing001._id,
                            members: [marketing001._id],
                            status: 'To Do',
                            dueDate: futureDate
                        }
                    ]);

                    // Set current user to admin
                    currentUser = adminUser;

                    // Act: GET request to /projects/all (or /projects if unified)
                    const response = await request(app)
                        .get('/api/projects/all')
                        .expect(200);

                    // Assert: Admin sees all projects without restrictions
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toBeDefined();
                    expect(Array.isArray(response.body.data)).toBe(true);
                    expect(response.body.data.length).toBeGreaterThanOrEqual(3);

                    // Verify all project names are returned
                    const projectNames = response.body.data.map(p => p.name);
                    expect(projectNames).toContain('Admin Project 1');
                    expect(projectNames).toContain('Admin Project 2');
                    expect(projectNames).toContain('Admin Project 3');
                });
            });

            describe('[PTV-008] Authentication middleware verification', () => {
                it('should require authentication for /projects endpoint', async () => {
                    // Arrange: Set currentUser to null (no authentication)
                    currentUser = null;

                    // Act: Attempt to access without auth
                    const response = await request(app)
                        .get('/api/projects')
                        .expect(401);

                    // Assert: Authentication required
                    expect(response.body.success).toBe(false);
                    expect(response.body.message).toBeDefined();
                });

                it('should proceed when authenticated', async () => {
                    const futureDate = new Date(Date.now() + 86400000);
                    // Arrange: Create project and authenticate
                    await Project.create({
                        name: 'Auth Test Project',
                        description: 'Test auth',
                        owner: staff123._id,
                        members: [staff123._id],
                        status: 'To Do',
                        dueDate: futureDate
                    });

                    currentUser = staff123;

                    // Act: Access with authentication
                    const response = await request(app)
                        .get('/api/projects');

                    // Assert: Should proceed (not 401)
                    expect(response.status).not.toBe(401);
                    expect(response.status).toBe(200);
                });
            });

            describe('[PTV-010] Backend returns project access metadata with canViewTasks flag', () => {
                it('should add canViewTasks: true for projects where user is directly assigned to tasks', async () => {
                    const futureDate = new Date(Date.now() + 86400000);
                    // Arrange: Create project and task assigned to staff123
                    const project = await Project.create({
                        name: 'Project Beta',
                        description: 'Direct assignment project',
                        owner: staff123._id,
                        members: [staff123._id],
                        status: 'To Do',
                        dueDate: futureDate
                    });

                    const TaskModel = await Task;
                    await TaskModel.create({
                        title: 'Direct Assignment Task',
                        description: 'Task assigned to staff123',
                        owner: staff123._id,
                        assignee: [staff123._id],
                        project: project._id,
                        status: 'To Do',
                        priority: 5
                    });

                    currentUser = staff123;

                    // Act: GET projects
                    const response = await request(app)
                        .get('/api/projects')
                        .expect(200);

                    // Assert: canViewTasks should be true
                    expect(response.body.data).toBeDefined();
                    const projectBeta = response.body.data.find(p => p.name === 'Project Beta');
                    expect(projectBeta).toBeDefined();
                    expect(projectBeta).toHaveProperty('canViewTasks');
                    expect(projectBeta.canViewTasks).toBe(true);
                });

                it('should add canViewTasks: true for projects where department colleague is assigned', async () => {
                    const futureDate = new Date(Date.now() + 86400000);
                    // Arrange: Create project with task assigned to staff456
                    const project = await Project.create({
                        name: 'Project Gamma',
                        description: 'Department colleague project',
                        owner: staff456._id,
                        members: [staff123._id, staff456._id], // staff123 is member
                        status: 'In Progress',
                        dueDate: futureDate
                    });

                    const TaskModel = await Task;
                    await TaskModel.create({
                        title: 'Colleague Task',
                        description: 'Task assigned to staff456',
                        owner: staff456._id,
                        assignee: [staff456._id],
                        project: project._id,
                        status: 'To Do',
                        priority: 5
                    });

                    currentUser = staff123;

                    // Act: GET projects
                    const response = await request(app)
                        .get('/api/projects')
                        .expect(200);

                    // Assert: canViewTasks should be true due to department colleague
                    const projectGamma = response.body.data.find(p => p.name === 'Project Gamma');
                    expect(projectGamma).toBeDefined();
                    expect(projectGamma.canViewTasks).toBe(true);
                });

                it('should add canViewTasks: false for projects with no tasks', async () => {
                    const futureDate = new Date(Date.now() + 86400000);
                    // Arrange: Create project without any tasks
                    await Project.create({
                        name: 'Project Delta',
                        description: 'Empty project',
                        owner: staff123._id,
                        members: [staff123._id],
                        status: 'To Do',
                        dueDate: futureDate
                    });

                    currentUser = staff123;

                    // Act: GET projects
                    const response = await request(app)
                        .get('/api/projects')
                        .expect(200);

                    // Assert: Project Delta should have canViewTasks: false
                    const projectDelta = response.body.data.find(p => p.name === 'Project Delta');
                    expect(projectDelta).toBeDefined();
                    expect(projectDelta.canViewTasks).toBe(false);
                });

                it('should add canViewTasks: true for ALL projects when user is admin', async () => {
                    const futureDate = new Date(Date.now() + 86400000);
                    // Arrange: Create projects with tasks assigned to staff
                    const project1 = await Project.create({
                        name: 'Staff Project 1',
                        owner: staff123._id,
                        members: [staff123._id],
                        status: 'To Do',
                        dueDate: futureDate
                    });

                    const project2 = await Project.create({
                        name: 'Staff Project 2',
                        owner: marketing001._id,
                        members: [marketing001._id],
                        status: 'In Progress',
                        dueDate: futureDate
                    });

                    const TaskModel = await Task;
                    await TaskModel.create({
                        title: 'Task 1',
                        owner: staff123._id,
                        assignee: [staff123._id],
                        project: project1._id,
                        status: 'To Do',
                        priority: 5
                    });

                    await TaskModel.create({
                        title: 'Task 2',
                        owner: marketing001._id,
                        assignee: [marketing001._id],
                        project: project2._id,
                        status: 'To Do',
                        priority: 5
                    });

                    currentUser = adminUser;

                    // Act: GET projects as admin
                    const response = await request(app)
                        .get('/api/projects/all')
                        .expect(200);

                    // Assert: All projects should have canViewTasks: true for admin
                    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
                    response.body.data.forEach(project => {
                        expect(project).toHaveProperty('canViewTasks');
                        expect(project.canViewTasks).toBe(true);
                    });
                });

                it('should handle complex scenario with multiple projects and access levels', async () => {
                    const futureDate = new Date(Date.now() + 86400000);
                    // Arrange: Create 4 projects as described in PTV-010
                    const projectAlpha = await Project.create({
                        name: 'Project Alpha',
                        description: 'Marketing only',
                        owner: marketing001._id,
                        members: [marketing001._id],
                        status: 'To Do',
                        dueDate: futureDate
                    });

                    const projectBeta = await Project.create({
                        name: 'Project Beta',
                        description: 'Directly assigned to staff123',
                        owner: staff123._id,
                        members: [staff123._id],
                        status: 'In Progress',
                        dueDate: futureDate
                    });

                    const projectGamma = await Project.create({
                        name: 'Project Gamma',
                        description: 'Assigned to engineering colleague',
                        owner: staff456._id,
                        members: [staff123._id, staff456._id],
                        status: 'To Do',
                        dueDate: futureDate
                    });

                    const projectDelta = await Project.create({
                        name: 'Project Delta',
                        description: 'No tasks',
                        owner: staff123._id,
                        members: [staff123._id],
                        status: 'Blocked',
                        dueDate: futureDate
                    });

                    // Create tasks
                    const TaskModel = await Task;
                    await TaskModel.create({
                        title: 'Marketing Task',
                        owner: marketing001._id,
                        assignee: [marketing001._id],
                        project: projectAlpha._id,
                        status: 'To Do',
                        priority: 5
                    });

                    await TaskModel.create({
                        title: 'Direct Task',
                        owner: staff123._id,
                        assignee: [staff123._id],
                        project: projectBeta._id,
                        status: 'To Do',
                        priority: 5
                    });

                    await TaskModel.create({
                        title: 'Colleague Task',
                        owner: staff456._id,
                        assignee: [staff456._id],
                        project: projectGamma._id,
                        status: 'To Do',
                        priority: 5
                    });

                    currentUser = staff123;

                    // Act: GET projects for staff123
                    const response = await request(app)
                        .get('/api/projects')
                        .expect(200);

                    // Assert: Verify canViewTasks for each project
                    expect(response.body.data.length).toBeGreaterThanOrEqual(3);

                    const beta = response.body.data.find(p => p.name === 'Project Beta');
                    const gamma = response.body.data.find(p => p.name === 'Project Gamma');
                    const delta = response.body.data.find(p => p.name === 'Project Delta');

                    // Project Beta: directly assigned
                    expect(beta).toBeDefined();
                    expect(beta.canViewTasks).toBe(true);

                    // Project Gamma: department colleague
                    expect(gamma).toBeDefined();
                    expect(gamma.canViewTasks).toBe(true);

                    // Project Delta: no tasks
                    expect(delta).toBeDefined();
                    expect(delta.canViewTasks).toBe(false);
                });
            });
        });
    });
});
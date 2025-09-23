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
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Project Router Test', () => {
    let testUser, otherUser;

    beforeAll(async () => {
        // Create test users
        testUser = await User.create({
            username: 'projectuser',
            roles: ['staff'],
            department: 'it',
            hashed_password: 'hashedpassword123'
        });

        otherUser = await User.create({
            username: 'otheruser',
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
            const projectData = {
                name: 'New Project',
                description: 'Project description'
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Project created successfully');
            expect(response.body.data.name).toBe('New Project');
            expect(response.body.data.description).toBe('Project description');
            expect(response.body.data.owner.toString()).toBe(testUser._id.toString());
        });

        it('should fail to create project without name', async () => {
            const projectData = {
                description: 'Project without name'
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Project name is required');
        });

        it('should create project with only name (description optional)', async () => {
            const projectData = {
                name: 'Simple Project'
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

            const projectData = {
                name: 'Unauthenticated Project'
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
            // Create test projects
            await Project.create({
                name: 'User Project 1',
                description: 'First project',
                owner: testUser._id
            });

            await Project.create({
                name: 'User Project 2',
                description: 'Second project',
                owner: testUser._id
            });

            await Project.create({
                name: 'Other User Project',
                description: 'Project by other user',
                owner: otherUser._id
            });
        });

        it('should get all projects for authenticated user', async () => {
            const response = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2); // Only user's projects
            expect(response.body.data[0].name).toMatch(/User Project/);
            expect(response.body.data[1].name).toMatch(/User Project/);
        });

        it('should return empty array when user has no projects', async () => {
            await Project.deleteMany({ owner: testUser._id });

            const response = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
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
            testProject = await Project.create({
                name: 'Test Project',
                description: 'Project for testing',
                owner: testUser._id
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
            testProject = await Project.create({
                name: 'Original Project',
                description: 'Original description',
                owner: testUser._id
            });

            otherUserProject = await Project.create({
                name: 'Other User Project',
                description: 'Other user description',
                owner: otherUser._id
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
            testProject = await Project.create({
                name: 'Project to Delete',
                description: 'This will be deleted',
                owner: testUser._id
            });

            otherUserProject = await Project.create({
                name: 'Other User Project',
                description: 'Other user project',
                owner: otherUser._id
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
});
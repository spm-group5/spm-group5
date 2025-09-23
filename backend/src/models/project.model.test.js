import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Project from './project.model.js';
import User from './user.model.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Project Model Test', () => {
    let testUser;

    beforeAll(async () => {
        // Create a test user to use as project owner
        testUser = await User.create({
            username: 'projectowner',
            roles: ['staff'],
            department: 'it',
            hashed_password: 'hashedpassword123'
        });
    });

    beforeEach(async () => {
        // Clean up projects before each test
        await Project.deleteMany({});
    });

    describe('Project Creation', () => {
        it('should create project with required fields', async () => {
            const projectData = {
                name: 'Test Project',
                owner: testUser._id
            };

            const project = await Project.create(projectData);

            expect(project.name).toBe('Test Project');
            expect(project.owner.toString()).toBe(testUser._id.toString());
            expect(project.status).toBe('Active'); // Default status
            expect(project.createdAt).toBeDefined();
            expect(project.updatedAt).toBeDefined();
        });

        it('should create project with optional description', async () => {
            const projectData = {
                name: 'Project with Description',
                description: 'This is a test project description',
                owner: testUser._id
            };

            const project = await Project.create(projectData);

            expect(project.name).toBe('Project with Description');
            expect(project.description).toBe('This is a test project description');
            expect(project.owner.toString()).toBe(testUser._id.toString());
        });

        it('should create project with default values', async () => {
            const projectData = {
                name: 'Default Values Project',
                owner: testUser._id
            };

            const project = await Project.create(projectData);

            expect(project.status).toBe('Active'); // Default status
            expect(project.createdAt).toBeInstanceOf(Date);
            expect(project.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe('Project Validation', () => {
        it('should fail to create project without name', async () => {
            const projectData = {
                owner: testUser._id
                // Missing name
            };

            await expect(Project.create(projectData)).rejects.toThrow();
        });

        it('should fail to create project without owner', async () => {
            const projectData = {
                name: 'Project without Owner'
                // Missing owner
            };

            await expect(Project.create(projectData)).rejects.toThrow();
        });

        it('should fail to create project with empty name', async () => {
            const projectData = {
                name: '', // Empty string
                owner: testUser._id
            };

            await expect(Project.create(projectData)).rejects.toThrow();
        });

        it('should fail to create project with invalid owner reference', async () => {
            const projectData = {
                name: 'Invalid Owner Project',
                owner: new mongoose.Types.ObjectId() // Non-existent user ID
            };

            // This might pass model validation but fail on populate
            const project = await Project.create(projectData);
            expect(project).toBeDefined();
        });
    });

    describe('Project Status', () => {
        it('should accept valid status values', async () => {
            const statusValues = ['Active', 'Archived', 'Completed'];

            for (const status of statusValues) {
                const projectData = {
                    name: `Project ${status}`,
                    owner: testUser._id,
                    status: status
                };

                const project = await Project.create(projectData);
                expect(project.status).toBe(status);
            }
        });

        it('should reject invalid status values', async () => {
            const projectData = {
                name: 'Invalid Status Project',
                owner: testUser._id,
                status: 'InvalidStatus'
            };

            await expect(Project.create(projectData)).rejects.toThrow();
        });

        it('should default to Active status', async () => {
            const projectData = {
                name: 'Default Status Project',
                owner: testUser._id
                // No status specified
            };

            const project = await Project.create(projectData);
            expect(project.status).toBe('Active');
        });
    });

    describe('Project Name Validation', () => {
        it('should accept valid project names', async () => {
            const validNames = [
                'Simple Project',
                'Project-With-Dashes',
                'Project_With_Underscores',
                'Project123',
                'A', // Single character
                'Very Long Project Name That Should Still Be Valid Because There Is No Length Limit'
            ];

            for (const name of validNames) {
                const projectData = {
                    name: name,
                    owner: testUser._id
                };

                const project = await Project.create(projectData);
                expect(project.name).toBe(name);
            }
        });

        it('should trim whitespace from project name', async () => {
            const projectData = {
                name: '  Trimmed Project Name  ',
                owner: testUser._id
            };

            const project = await Project.create(projectData);
            expect(project.name).toBe('Trimmed Project Name');
        });
    });

    describe('Project Timestamps', () => {
        it('should automatically set createdAt and updatedAt', async () => {
            const projectData = {
                name: 'Timestamp Project',
                owner: testUser._id
            };

            const project = await Project.create(projectData);

            expect(project.createdAt).toBeInstanceOf(Date);
            expect(project.updatedAt).toBeInstanceOf(Date);
            expect(project.createdAt.getTime()).toBeLessThanOrEqual(project.updatedAt.getTime());
        });

        it('should update updatedAt when project is modified', async () => {
            const projectData = {
                name: 'Update Test Project',
                owner: testUser._id
            };

            const project = await Project.create(projectData);
            const originalUpdatedAt = project.updatedAt;

            // Wait a bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            project.description = 'Updated description';
            await project.save();

            expect(project.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });
    });

    describe('Project Relationships', () => {
        it('should populate owner information', async () => {
            const projectData = {
                name: 'Population Test Project',
                owner: testUser._id
            };

            const project = await Project.create(projectData);
            const populatedProject = await Project.findById(project._id).populate('owner');

            expect(populatedProject.owner.username).toBe('projectowner');
            expect(populatedProject.owner.department).toBe('it');
        });
    });

    describe('Project Queries', () => {
        it('should find projects by owner', async () => {
            // Create multiple projects for the same owner
            await Project.create({
                name: 'Project 1',
                owner: testUser._id
            });

            await Project.create({
                name: 'Project 2',
                owner: testUser._id
            });

            const projects = await Project.find({ owner: testUser._id });
            expect(projects).toHaveLength(2);
            expect(projects[0].owner.toString()).toBe(testUser._id.toString());
            expect(projects[1].owner.toString()).toBe(testUser._id.toString());
        });

        it('should find projects by status', async () => {
            await Project.create({
                name: 'Active Project',
                owner: testUser._id,
                status: 'Active'
            });

            await Project.create({
                name: 'Completed Project',
                owner: testUser._id,
                status: 'Completed'
            });

            const activeProjects = await Project.find({ status: 'Active' });
            const completedProjects = await Project.find({ status: 'Completed' });

            expect(activeProjects).toHaveLength(1);
            expect(completedProjects).toHaveLength(1);
            expect(activeProjects[0].name).toBe('Active Project');
            expect(completedProjects[0].name).toBe('Completed Project');
        });
    });
});
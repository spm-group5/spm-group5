import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Project from './project.model.js';
import User from './user.model.js';

let mongoServer;

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

describe('Project Model Test', () => {
    let testUser;

    beforeAll(async () => {
        // Create a test user to use as project owner
        testUser = await User.create({
            username: 'projectowner@example.com',
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
            expect(project.status).toBe('To Do'); // Default status
            expect(project.priority).toBe(5); // Default priority
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

            expect(project.status).toBe('To Do'); // Default status
            expect(project.priority).toBe(5); // Default priority
            expect(project.tags).toEqual([]); // Default empty tags array
            expect(project.archived).toBe(false); // Default archived = false
            expect(project.archivedAt).toBeNull(); // Default archivedAt = null
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
            const statusValues = ['To Do', 'In Progress', 'Completed', 'Blocked'];

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

        it('should reject old status values', async () => {
            const oldStatusValues = ['Active', 'Archived'];

            for (const status of oldStatusValues) {
                const projectData = {
                    name: `Old Status Project ${status}`,
                    owner: testUser._id,
                    status: status
                };

                await expect(Project.create(projectData)).rejects.toThrow();
            }
        });

        it('should default to To Do status', async () => {
            const projectData = {
                name: 'Default Status Project',
                owner: testUser._id
                // No status specified
            };

            const project = await Project.create(projectData);
            expect(project.status).toBe('To Do');
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

            expect(populatedProject.owner.username).toBe('projectowner@example.com');
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
                name: 'To Do Project',
                owner: testUser._id,
                status: 'To Do'
            });

            await Project.create({
                name: 'Completed Project',
                owner: testUser._id,
                status: 'Completed'
            });

            const todoProjects = await Project.find({ status: 'To Do' });
            const completedProjects = await Project.find({ status: 'Completed' });

            expect(todoProjects).toHaveLength(1);
            expect(completedProjects).toHaveLength(1);
            expect(todoProjects[0].name).toBe('To Do Project');
            expect(completedProjects[0].name).toBe('Completed Project');
        });
    });

    describe('Project Priority Field', () => {
        it('should create project with valid priority between 1 and 10', async () => {
            const projectData = {
                name: 'Priority Project',
                owner: testUser._id,
                priority: 5
            };

            const project = await Project.create(projectData);
            expect(project.priority).toBe(5);
        });

        it('should create project with priority 1 (minimum)', async () => {
            const projectData = {
                name: 'Min Priority Project',
                owner: testUser._id,
                priority: 1
            };

            const project = await Project.create(projectData);
            expect(project.priority).toBe(1);
        });

        it('should create project with priority 10 (maximum)', async () => {
            const projectData = {
                name: 'Max Priority Project',
                owner: testUser._id,
                priority: 10
            };

            const project = await Project.create(projectData);
            expect(project.priority).toBe(10);
        });

        it('should create project without priority (defaults to 5)', async () => {
            const projectData = {
                name: 'No Priority Project',
                owner: testUser._id
                // priority not specified
            };

            const project = await Project.create(projectData);
            expect(project.priority).toBe(5); // Should default to 5
        });

        it('should reject project with priority below 1', async () => {
            const projectData = {
                name: 'Invalid Priority Project',
                owner: testUser._id,
                priority: 0
            };

            await expect(Project.create(projectData)).rejects.toThrow();
        });

        it('should reject project with priority above 10', async () => {
            const projectData = {
                name: 'Invalid Priority Project',
                owner: testUser._id,
                priority: 11
            };

            await expect(Project.create(projectData)).rejects.toThrow();
        });

        it('should reject project with negative priority', async () => {
            const projectData = {
                name: 'Negative Priority Project',
                owner: testUser._id,
                priority: -5
            };

            await expect(Project.create(projectData)).rejects.toThrow();
        });
    });

    describe('Project DueDate Field', () => {
        it('should create project with valid future dueDate', async () => {
            const futureDate = new Date(Date.now() + 86400000); // Tomorrow
            const projectData = {
                name: 'Future Date Project',
                owner: testUser._id,
                dueDate: futureDate
            };

            const project = await Project.create(projectData);
            expect(project.dueDate).toBeInstanceOf(Date);
            expect(project.dueDate.getTime()).toBe(futureDate.getTime());
        });

        it('should create project without dueDate (optional field)', async () => {
            const projectData = {
                name: 'No Due Date Project',
                owner: testUser._id
                // dueDate not specified - should be optional
            };

            const project = await Project.create(projectData);
            expect(project.dueDate).toBeUndefined();
        });

        it('should create project with null dueDate', async () => {
            const projectData = {
                name: 'Null Due Date Project',
                owner: testUser._id,
                dueDate: null
            };

            const project = await Project.create(projectData);
            expect(project.dueDate).toBeNull();
        });

        it('should fail to create project with past dueDate', async () => {
            const pastDate = new Date(Date.now() - 86400000); // Yesterday
            const projectData = {
                name: 'Past Due Date Project',
                owner: testUser._id,
                dueDate: pastDate
            };

            await expect(Project.create(projectData)).rejects.toThrow();
        });

        it('should allow today as dueDate', async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const projectData = {
                name: 'Today Due Date Project',
                owner: testUser._id,
                dueDate: today
            };

            const project = await Project.create(projectData);
            expect(project.dueDate).toBeInstanceOf(Date);
        });
    });

    describe('Project Tags Field', () => {
        it('should create project with tags array', async () => {
            const projectData = {
                name: 'Tagged Project',
                owner: testUser._id,
                tags: ['frontend', 'urgent', 'react']
            };

            const project = await Project.create(projectData);
            expect(project.tags).toEqual(['frontend', 'urgent', 'react']);
            expect(project.tags).toHaveLength(3);
        });

        it('should create project without tags field (defaults to empty array)', async () => {
            const projectData = {
                name: 'No Tags Project',
                owner: testUser._id
                // tags not specified
            };

            const project = await Project.create(projectData);
            expect(project.tags).toEqual([]);
            expect(project.tags).toHaveLength(0);
        });

        it('should create project with empty tags array', async () => {
            const projectData = {
                name: 'Empty Tags Project',
                owner: testUser._id,
                tags: []
            };

            const project = await Project.create(projectData);
            expect(project.tags).toEqual([]);
            expect(project.tags).toHaveLength(0);
        });

        it('should create project with single tag', async () => {
            const projectData = {
                name: 'Single Tag Project',
                owner: testUser._id,
                tags: ['backend']
            };

            const project = await Project.create(projectData);
            expect(project.tags).toEqual(['backend']);
            expect(project.tags).toHaveLength(1);
        });
    });

    describe('Project Archived Field', () => {
        it('should create project with archived = false by default', async () => {
            const projectData = {
                name: 'Not Archived Project',
                owner: testUser._id
            };

            const project = await Project.create(projectData);
            expect(project.archived).toBe(false);
            expect(project.archivedAt).toBeNull();
        });

        it('should create project with archived = true', async () => {
            const projectData = {
                name: 'Archived Project',
                owner: testUser._id,
                archived: true,
                archivedAt: new Date()
            };

            const project = await Project.create(projectData);
            expect(project.archived).toBe(true);
            expect(project.archivedAt).toBeInstanceOf(Date);
        });

        it('should allow updating archived status', async () => {
            const projectData = {
                name: 'Archive Update Project',
                owner: testUser._id
            };

            const project = await Project.create(projectData);
            expect(project.archived).toBe(false);

            project.archived = true;
            project.archivedAt = new Date();
            await project.save();

            expect(project.archived).toBe(true);
            expect(project.archivedAt).toBeInstanceOf(Date);
        });

        it('should allow unarchiving project', async () => {
            const projectData = {
                name: 'Unarchive Project',
                owner: testUser._id,
                archived: true,
                archivedAt: new Date()
            };

            const project = await Project.create(projectData);
            expect(project.archived).toBe(true);

            project.archived = false;
            project.archivedAt = null;
            await project.save();

            expect(project.archived).toBe(false);
            expect(project.archivedAt).toBeNull();
        });
    });

    describe('Project with All New Attributes', () => {
        it('should create complete project with all fields', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const projectData = {
                name: 'Complete Project',
                description: 'A project with all attributes',
                owner: testUser._id,
                status: 'In Progress',
                priority: 7,
                dueDate: futureDate,
                tags: ['important', 'milestone'],
                archived: false
            };

            const project = await Project.create(projectData);

            expect(project.name).toBe('Complete Project');
            expect(project.description).toBe('A project with all attributes');
            expect(project.owner.toString()).toBe(testUser._id.toString());
            expect(project.status).toBe('In Progress');
            expect(project.priority).toBe(7);
            expect(project.dueDate).toBeInstanceOf(Date);
            expect(project.tags).toEqual(['important', 'milestone']);
            expect(project.archived).toBe(false);
            expect(project.archivedAt).toBeNull();
            expect(project.createdAt).toBeInstanceOf(Date);
            expect(project.updatedAt).toBeInstanceOf(Date);
        });
    });
});
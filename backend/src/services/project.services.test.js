import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import projectService from './project.services.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';

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

describe('Project Service Test', () => {
    let testUser;
    let otherUser;

    beforeEach(async () => {
        await Project.deleteMany({});
        await User.deleteMany({});

        testUser = await User.create({
            username: 'projectowner@example.com',
            roles: ['staff'],
            department: 'it',
            hashed_password: 'password123'
        });

        otherUser = await User.create({
            username: 'otheruser@example.com',
            roles: ['staff'],
            department: 'hr',
            hashed_password: 'password456'
        });
    });

    describe('createProject', () => {
        // Create project with name defaults to status "To Do" and owner=creator
        it('should create a project with valid data and default status "To Do"', async () => {
            const projectData = {
                name: 'New Project',
                description: 'Project description'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.name).toBe('New Project');
            expect(project.description).toBe('Project description');
            expect(project.status).toBe('To Do'); // Default status
            expect(project.priority).toBe(5); // Default priority
            expect(project.owner.toString()).toBe(testUser._id.toString());
            expect(project.members).toContain(testUser._id);
        });

        // Create project with only required fields (just name)
        it('should create project with only required field (name)', async () => {
            const projectData = {
                name: 'Simple Project'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.name).toBe('Simple Project');
            expect(project.description).toBe('');
            expect(project.status).toBe('To Do');
            expect(project.priority).toBe(5); // Default priority
            expect(project.owner.toString()).toBe(testUser._id.toString());
            expect(project.tags).toEqual([]); // Default empty array
            expect(project.archived).toBe(false); // Default archived
        });

        // Empty name shows error
        it('should throw error for empty project name', async () => {
            const projectData = {
                name: ''
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Project name is required');
        });

        // Missing name throws error
        it('should throw error for missing project name', async () => {
            const projectData = {
                description: 'Project without name'
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Project name is required');
        });

        // Whitespace-only name throws error
        it('should throw error for whitespace-only project name', async () => {
            const projectData = {
                name: '   '
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Project name is required');
        });

        it('should trim whitespace from project name', async () => {
            const projectData = {
                name: '  Trimmed Project  '
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.name).toBe('Trimmed Project');
        });

        // Valid priority (1-10) succeeds
        it('should create project with valid priority 1', async () => {
            const projectData = {
                name: 'Priority Project',
                priority: 1
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.priority).toBe(1);
        });

        it('should create project with valid priority 10', async () => {
            const projectData = {
                name: 'Priority Project',
                priority: 10
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.priority).toBe(10);
        });

        it('should create project with valid priority 5', async () => {
            const projectData = {
                name: 'Priority Project',
                priority: 5
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.priority).toBe(5);
        });

        // Priority defaults to 5 when not specified
        it('should create project with default priority 5 when not specified', async () => {
            const projectData = {
                name: 'Default Priority Project'
                // priority not specified
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.priority).toBe(5);
        });

        // Invalid priority throws error
        it('should throw error for priority below 1', async () => {
            const projectData = {
                name: 'Invalid Priority Project',
                priority: 0
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Priority must be a number between 1 and 10');
        });

        it('should throw error for priority above 10', async () => {
            const projectData = {
                name: 'Invalid Priority Project',
                priority: 11
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Priority must be a number between 1 and 10');
        });

        it('should throw error for negative priority', async () => {
            const projectData = {
                name: 'Invalid Priority Project',
                priority: -5
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Priority must be a number between 1 and 10');
        });

        it('should throw error for priority as string', async () => {
            const projectData = {
                name: 'Invalid Priority Project',
                priority: 'high'
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Priority must be a number between 1 and 10');
        });

        // Valid future dueDate succeeds
        it('should create project with valid future dueDate', async () => {
            const futureDate = new Date(Date.now() + 86400000); // Tomorrow
            const projectData = {
                name: 'Future Project',
                dueDate: futureDate
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.dueDate).toBeInstanceOf(Date);
        });

        // DueDate is optional - create project without dueDate succeeds
        it('should create project without dueDate (optional field)', async () => {
            const projectData = {
                name: 'No DueDate Project'
                // dueDate not specified
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.name).toBe('No DueDate Project');
            expect(project.dueDate).toBeUndefined();
        });

        it('should create project with null dueDate', async () => {
            const projectData = {
                name: 'Null DueDate Project',
                dueDate: null
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.name).toBe('Null DueDate Project');
            expect(project.dueDate).toBeNull();
        });

        // Past dueDate throws error
        it('should throw error when dueDate is in the past', async () => {
            const yesterday = new Date(Date.now() - 86400000);
            const projectData = {
                name: 'Past DueDate Project',
                dueDate: yesterday
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Due date cannot be in the past');
        });

        // Today's date should succeed (boundary test)
        it('should accept dueDate set to today', async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const projectData = {
                name: 'Today DueDate Project',
                dueDate: today
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.dueDate).toBeInstanceOf(Date);
        });

        // Valid status values succeed
        it('should create project with status "To Do"', async () => {
            const projectData = {
                name: 'To Do Project',
                status: 'To Do'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.status).toBe('To Do');
        });

        it('should create project with status "In Progress"', async () => {
            const projectData = {
                name: 'In Progress Project',
                status: 'In Progress'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.status).toBe('In Progress');
        });

        it('should create project with status "Completed"', async () => {
            const projectData = {
                name: 'Completed Project',
                status: 'Completed'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.status).toBe('Completed');
        });

        it('should create project with status "Blocked"', async () => {
            const projectData = {
                name: 'Blocked Project',
                status: 'Blocked'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.status).toBe('Blocked');
        });

        // Invalid status throws error
        it('should throw error for invalid status value', async () => {
            const projectData = {
                name: 'Invalid Status Project',
                status: 'InvalidStatus'
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Status must be one of: To Do, In Progress, Completed, Blocked');
        });

        it('should throw error for old status value "Active"', async () => {
            const projectData = {
                name: 'Old Status Project',
                status: 'Active'
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Status must be one of: To Do, In Progress, Completed, Blocked');
        });

        it('should throw error for old status value "Archived"', async () => {
            const projectData = {
                name: 'Old Status Project',
                status: 'Archived'
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Status must be one of: To Do, In Progress, Completed, Blocked');
        });

        // Tags array succeeds
        it('should create project with tags array', async () => {
            const projectData = {
                name: 'Tagged Project',
                tags: ['frontend', 'urgent']
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.tags).toEqual(['frontend', 'urgent']);
        });

        // Tags parsed from # separated string
        it('should parse tags from # separated string', async () => {
            const projectData = {
                name: 'Tagged Project',
                tags: 'frontend#urgent#react'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.tags).toEqual(['frontend', 'urgent', 'react']);
        });

        // Project without tags field succeeds (defaults to empty array)
        it('should create project without tags field (defaults to empty array)', async () => {
            const projectData = {
                name: 'No Tags Project'
                // tags not specified
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.tags).toEqual([]);
        });

        // Empty tags array accepted
        it('should accept empty tags array', async () => {
            const projectData = {
                name: 'Empty Tags Project',
                tags: []
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.tags).toEqual([]);
        });

        // Response contains all required fields
        it('should return complete project object with all fields', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const projectData = {
                name: 'Complete Project',
                description: 'Full description',
                dueDate: futureDate,
                priority: 7,
                status: 'In Progress',
                tags: ['important', 'milestone']
            };

            const project = await projectService.createProject(projectData, testUser._id);

            // Verify all fields are present
            expect(project._id).toBeDefined();
            expect(project.name).toBe('Complete Project');
            expect(project.description).toBe('Full description');
            expect(project.status).toBe('In Progress');
            expect(project.priority).toBe(7);
            expect(project.dueDate).toBeInstanceOf(Date);
            expect(project.tags).toEqual(['important', 'milestone']);
            expect(project.archived).toBe(false); // Default archived
            expect(project.archivedAt).toBeNull(); // Default archivedAt
            expect(project.owner).toBeDefined();
            expect(project.members).toBeDefined();
            expect(project.createdAt).toBeInstanceOf(Date);
            expect(project.updatedAt).toBeInstanceOf(Date);
        });

        it('should create project with custom members', async () => {
            const projectData = {
                name: 'Team Project',
                members: [testUser._id, otherUser._id]
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.members).toHaveLength(2);
            expect(project.members).toContain(testUser._id);
            expect(project.members).toContain(otherUser._id);
        });
    });

    describe('getProjects', () => {
        beforeEach(async () => {
            const futureDate = new Date(Date.now() + 86400000);
            // Create projects for different scenarios
            await Project.create([
                {
                    name: 'User1 Owner Project',
                    owner: testUser._id,
                    members: [testUser._id],
                    dueDate: futureDate
                },
                {
                    name: 'User1 Member Project',
                    owner: otherUser._id,
                    members: [otherUser._id, testUser._id],
                    dueDate: futureDate
                },
                {
                    name: 'Other User Project',
                    owner: otherUser._id,
                    members: [otherUser._id],
                    dueDate: futureDate
                }
            ]);
        });

        it('should get all projects where user is owner or member', async () => {
            const projects = await projectService.getProjects(testUser._id);

            expect(projects).toHaveLength(2);
            expect(projects.find(p => p.name === 'User1 Owner Project')).toBeDefined();
            expect(projects.find(p => p.name === 'User1 Member Project')).toBeDefined();
            expect(projects.find(p => p.name === 'Other User Project')).toBeUndefined();
        });

        it('should return empty array when user has no projects', async () => {
            const newUser = await User.create({
                username: 'newuser@example.com',
                roles: ['staff'],
                department: 'finance',
                hashed_password: 'password789'
            });

            const projects = await projectService.getProjects(newUser._id);

            expect(projects).toHaveLength(0);
        });

        it('should populate owner and members information', async () => {
            const projects = await projectService.getProjects(testUser._id);

            expect(projects[0].owner.username).toBeDefined();
            expect(projects[0].members[0].username).toBeDefined();
        });

        it('should sort projects by creation date (newest first)', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            // Wait a bit to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));

            await Project.create({
                name: 'Newest Project',
                owner: testUser._id,
                members: [testUser._id],
                dueDate: futureDate
            });

            const projects = await projectService.getProjects(testUser._id);

            expect(projects[0].name).toBe('Newest Project');
        });
    });

    describe('getProjectById', () => {
        let testProject;

        beforeEach(async () => {
            const futureDate = new Date(Date.now() + 86400000);
            testProject = await Project.create({
                name: 'Test Project',
                description: 'Test description',
                owner: testUser._id,
                members: [testUser._id],
                dueDate: futureDate
            });
        });

        it('should get project by ID successfully', async () => {
            const project = await projectService.getProjectById(testProject._id);

            expect(project.name).toBe('Test Project');
            expect(project.description).toBe('Test description');
            expect(project._id.toString()).toBe(testProject._id.toString());
        });

        it('should populate owner and members information', async () => {
            const project = await projectService.getProjectById(testProject._id);

            expect(project.owner.username).toBe('projectowner@example.com');
            expect(project.members[0].username).toBe('projectowner@example.com');
        });

        it('should throw error for non-existent project', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(projectService.getProjectById(fakeId))
                .rejects.toThrow('Project not found');
        });

        it('should throw error for invalid ObjectId format', async () => {
            await expect(projectService.getProjectById('invalid-id'))
                .rejects.toThrow();
        });
    });

    describe('updateProject', () => {
        let testProject;

        beforeEach(async () => {
            const futureDate = new Date(Date.now() + 86400000);
            testProject = await Project.create({
                name: 'Original Project',
                description: 'Original description',
                owner: testUser._id,
                members: [testUser._id],
                dueDate: futureDate
            });
        });

        it('should update project name successfully', async () => {
            const updateData = {
                name: 'Updated Project Name'
            };

            const updatedProject = await projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            );

            expect(updatedProject.name).toBe('Updated Project Name');
            expect(updatedProject.description).toBe('Original description'); // Unchanged
        });

        it('should update project description successfully', async () => {
            const updateData = {
                description: 'Updated description'
            };

            const updatedProject = await projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            );

            expect(updatedProject.description).toBe('Updated description');
            expect(updatedProject.name).toBe('Original Project'); // Unchanged
        });

        it('should update project status successfully', async () => {
            const updateData = {
                status: 'Completed'
            };

            const updatedProject = await projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            );

            expect(updatedProject.status).toBe('Completed');
        });

        it('should update project members successfully', async () => {
            const updateData = {
                members: [testUser._id, otherUser._id]
            };

            const updatedProject = await projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            );

            expect(updatedProject.members).toHaveLength(2);
            expect(updatedProject.members).toContain(testUser._id);
            expect(updatedProject.members).toContain(otherUser._id);
        });

        it('should update multiple fields simultaneously', async () => {
            const updateData = {
                name: 'Completely Updated Project',
                description: 'Completely updated description',
                status: 'Archived'
            };

            const updatedProject = await projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            );

            expect(updatedProject.name).toBe('Completely Updated Project');
            expect(updatedProject.description).toBe('Completely updated description');
            expect(updatedProject.status).toBe('Archived');
        });

        it('should throw error for empty project name', async () => {
            const updateData = {
                name: ''
            };

            await expect(projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            )).rejects.toThrow('Project name cannot be empty');
        });

        it('should throw error for whitespace-only project name', async () => {
            const updateData = {
                name: '   '
            };

            await expect(projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            )).rejects.toThrow('Project name cannot be empty');
        });

        it('should throw error for unauthorized update', async () => {
            const updateData = {
                name: 'Unauthorized Update'
            };

            await expect(projectService.updateProject(
                testProject._id,
                updateData,
                otherUser._id
            )).rejects.toThrow('Only project owner can update the project');
        });

        it('should throw error for non-existent project', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const updateData = {
                name: 'Update Non-existent'
            };

            await expect(projectService.updateProject(
                fakeId,
                updateData,
                testUser._id
            )).rejects.toThrow('Project not found');
        });

        it('should trim whitespace from updated project name', async () => {
            const updateData = {
                name: '  Trimmed Updated Name  '
            };

            const updatedProject = await projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            );

            expect(updatedProject.name).toBe('Trimmed Updated Name');
        });

        it('should update updatedAt timestamp', async () => {
            const originalUpdatedAt = testProject.updatedAt;
            
            // Wait a bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            const updateData = {
                name: 'Updated for Timestamp Test'
            };

            const updatedProject = await projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            );

            expect(updatedProject.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });
    });

    describe('deleteProject', () => {
        let testProject;

        beforeEach(async () => {
            const futureDate = new Date(Date.now() + 86400000);
            testProject = await Project.create({
                name: 'Project to Delete',
                description: 'This will be deleted',
                owner: testUser._id,
                members: [testUser._id],
                dueDate: futureDate
            });
        });

        it('should delete project successfully by owner', async () => {
            await projectService.deleteProject(testProject._id, testUser._id);

            const deletedProject = await Project.findById(testProject._id);
            expect(deletedProject).toBeNull();
        });

        it('should return deleted project data', async () => {
            const deletedProject = await projectService.deleteProject(testProject._id, testUser._id);

            expect(deletedProject.name).toBe('Project to Delete');
            expect(deletedProject._id.toString()).toBe(testProject._id.toString());
        });

        it('should throw error for unauthorized deletion', async () => {
            await expect(projectService.deleteProject(
                testProject._id,
                otherUser._id
            )).rejects.toThrow('Only project owner can delete the project');

            // Verify project still exists
            const existingProject = await Project.findById(testProject._id);
            expect(existingProject).toBeTruthy();
        });

        it('should throw error for non-existent project', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(projectService.deleteProject(
                fakeId,
                testUser._id
            )).rejects.toThrow('Project not found');
        });

        it('should throw error for invalid ObjectId format', async () => {
            await expect(projectService.deleteProject(
                'invalid-id',
                testUser._id
            )).rejects.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('should handle null values in project data', async () => {
            const projectData = {
                name: 'Null Test Project',
                description: null,
                members: null
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.name).toBe('Null Test Project');
            expect(project.description).toBe('');
            expect(project.members).toContain(testUser._id);
        });

        it('should handle undefined values in update data', async () => {
            const testProject = await Project.create({
                name: 'Original Project',
                description: 'Original description',
                owner: testUser._id
            });

            const updateData = {
                name: 'Updated Project',
                description: undefined,
                status: undefined
            };

            const updatedProject = await projectService.updateProject(
                testProject._id,
                updateData,
                testUser._id
            );

            expect(updatedProject.name).toBe('Updated Project');
            expect(updatedProject.description).toBe('Original description'); // Unchanged
            expect(updatedProject.status).toBe('Active'); // Unchanged
        });

        it('should handle concurrent updates properly', async () => {
            const testProject = await Project.create({
                name: 'Concurrent Test Project',
                owner: testUser._id
            });

            const updateData1 = { description: 'First update' };
            const updateData2 = { status: 'Completed' };

            // Simulate concurrent updates
            const [result1, result2] = await Promise.all([
                projectService.updateProject(testProject._id, updateData1, testUser._id),
                projectService.updateProject(testProject._id, updateData2, testUser._id)
            ]);

            // Both updates should succeed
            expect(result1.description).toBe('First update');
            expect(result2.status).toBe('Completed');
        });
    });

    /**
     * NEW TEST SUITE: Project Task Viewing Permissions - Service Layer (TDD)
     * Test Card Covered: PTV-010
     *
     * Purpose: Test canViewTasks metadata calculation logic
     * This tests the business logic that determines which projects a user can view tasks for
     *
     * Note: These tests will FAIL until getProjectsWithAccessMetadata() is implemented.
     * This follows TDD (Test-Driven Development) methodology.
     */
    describe('Project Task Viewing Permissions - Service Layer (TDD)', () => {
        let staff123, staff456, marketing001, adminUser;
        const Task = (async () => (await import('../models/task.model.js')).default)();

        beforeEach(async () => {
            // Clean up all collections
            await Project.deleteMany({});
            await User.deleteMany({});

            // Import Task model dynamically
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

        describe('[PTV-010] Backend returns project access metadata with canViewTasks flag', () => {
            it('should add canViewTasks: true for projects where user is directly assigned to tasks', async () => {
                // Arrange: Create project and task assigned to staff123
                const project = await Project.create({
                    name: 'Project Beta',
                    description: 'Direct assignment project',
                    owner: staff123._id,
                    members: [staff123._id],
                    status: 'Active'
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

                // Act: Get projects with access metadata for staff123
                const projects = await projectService.getProjectsWithAccessMetadata(
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: canViewTasks should be true
                expect(projects).toBeDefined();
                expect(Array.isArray(projects)).toBe(true);
                const projectBeta = projects.find(p => p.name === 'Project Beta');
                expect(projectBeta).toBeDefined();
                expect(projectBeta).toHaveProperty('canViewTasks');
                expect(projectBeta.canViewTasks).toBe(true);
            });

            it('should add canViewTasks: true for projects where department colleague is assigned', async () => {
                // Arrange: Create project with task assigned to staff456 (same dept as staff123)
                // staff123 must be a member to see the project
                const project = await Project.create({
                    name: 'Project Gamma',
                    description: 'Department colleague project',
                    owner: staff456._id,
                    members: [staff123._id, staff456._id],
                    status: 'Active'
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

                // Act: Get projects for staff123 (NOT assigned, but same department)
                const projects = await projectService.getProjectsWithAccessMetadata(
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: canViewTasks should be true due to department colleague
                const projectGamma = projects.find(p => p.name === 'Project Gamma');
                expect(projectGamma).toBeDefined();
                expect(projectGamma.canViewTasks).toBe(true);
            });

            it('should add canViewTasks: false for projects with no accessible tasks', async () => {
                // Arrange: Create project with task in different department
                const marketingProject = await Project.create({
                    name: 'Project Alpha',
                    description: 'Marketing only project',
                    owner: marketing001._id,
                    members: [marketing001._id],
                    status: 'Active'
                });

                const TaskModel = await Task;
                await TaskModel.create({
                    title: 'Marketing Task',
                    description: 'Task for marketing',
                    owner: marketing001._id,
                    assignee: [marketing001._id],
                    project: marketingProject._id,
                    status: 'To Do',
                    priority: 5
                });

                // Act: Get projects for staff123 (engineering, no access)
                const projects = await projectService.getProjectsWithAccessMetadata(
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: Project Alpha should be in the list with canViewTasks: false
                const projectAlpha = projects.find(p => p.name === 'Project Alpha');
                expect(projectAlpha).toBeDefined(); // User can see all projects
                expect(projectAlpha.canViewTasks).toBe(false); // But cannot see tasks
            });

            it('should add canViewTasks: false for projects with no tasks', async () => {
                // Arrange: Create project without any tasks
                await Project.create({
                    name: 'Project Delta',
                    description: 'Empty project',
                    owner: staff123._id,
                    members: [staff123._id],
                    status: 'Active'
                });

                // Act: Get projects for staff123
                const projects = await projectService.getProjectsWithAccessMetadata(
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: Project Delta should have canViewTasks: false (no tasks exist)
                const projectDelta = projects.find(p => p.name === 'Project Delta');
                expect(projectDelta).toBeDefined();
                expect(projectDelta.canViewTasks).toBe(false);
            });

            it('should add canViewTasks: true for ALL projects when user is admin', async () => {
                // Arrange: Create multiple projects with tasks assigned to staff (not admin)
                const project1 = await Project.create({
                    name: 'Staff Project 1',
                    owner: staff123._id,
                    members: [staff123._id],
                    status: 'Active'
                });

                const project2 = await Project.create({
                    name: 'Staff Project 2',
                    owner: marketing001._id,
                    members: [marketing001._id],
                    status: 'Active'
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

                // Act: Get projects for admin (not assigned to any task)
                const projects = await projectService.getProjectsWithAccessMetadata(
                    adminUser._id,
                    'admin',
                    'it'
                );

                // Assert: All projects should have canViewTasks: true for admin
                expect(projects.length).toBeGreaterThanOrEqual(2);
                projects.forEach(project => {
                    expect(project).toHaveProperty('canViewTasks');
                    expect(project.canViewTasks).toBe(true);
                });
            });

            it('should handle complex scenario with multiple projects and access levels', async () => {
                // Arrange: Create 4 projects as described in PTV-010
                const projectAlpha = await Project.create({
                    name: 'Project Alpha',
                    description: 'Marketing only',
                    owner: marketing001._id,
                    members: [marketing001._id],
                    status: 'Active'
                });

                const projectBeta = await Project.create({
                    name: 'Project Beta',
                    description: 'Directly assigned to staff123',
                    owner: staff123._id,
                    members: [staff123._id],
                    status: 'Active'
                });

                const projectGamma = await Project.create({
                    name: 'Project Gamma',
                    description: 'Assigned to engineering colleague',
                    owner: staff456._id,
                    members: [staff123._id, staff456._id],
                    status: 'Active'
                });

                const projectDelta = await Project.create({
                    name: 'Project Delta',
                    description: 'No tasks',
                    owner: staff123._id,
                    members: [staff123._id],
                    status: 'Active'
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

                // Act: Get projects for staff123
                const projects = await projectService.getProjectsWithAccessMetadata(
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: Verify canViewTasks for each project
                expect(projects.length).toBeGreaterThanOrEqual(3);

                const beta = projects.find(p => p.name === 'Project Beta');
                const gamma = projects.find(p => p.name === 'Project Gamma');
                const delta = projects.find(p => p.name === 'Project Delta');

                // Project Beta: directly assigned
                expect(beta).toBeDefined();
                expect(beta.canViewTasks).toBe(true);

                // Project Gamma: department colleague
                expect(gamma).toBeDefined();
                expect(gamma.canViewTasks).toBe(true);

                // Project Delta: no tasks
                expect(delta).toBeDefined();
                expect(delta.canViewTasks).toBe(false);

                // Project Alpha might not be in results if staff123 isn't a member
            });
        });
    });
});
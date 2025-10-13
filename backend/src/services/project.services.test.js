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
        it('should create a project with valid data', async () => {
            const projectData = {
                name: 'New Project',
                description: 'Project description'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.name).toBe('New Project');
            expect(project.description).toBe('Project description');
            expect(project.status).toBe('Active');
            expect(project.owner.toString()).toBe(testUser._id.toString());
            expect(project.members).toContain(testUser._id);
        });

        it('should create project with only required fields', async () => {
            const projectData = {
                name: 'Simple Project'
            };

            const project = await projectService.createProject(projectData, testUser._id);

            expect(project.name).toBe('Simple Project');
            expect(project.description).toBe('');
            expect(project.status).toBe('Active');
            expect(project.owner.toString()).toBe(testUser._id.toString());
        });

        it('should throw error for empty project name', async () => {
            const projectData = {
                name: ''
            };

            await expect(projectService.createProject(projectData, testUser._id))
                .rejects.toThrow('Project name is required');
        });

        it('should throw error for missing project name', async () => {
            const projectData = {
                description: 'Project without name'
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
            // Create projects for different scenarios
            await Project.create([
                {
                    name: 'User1 Owner Project',
                    owner: testUser._id,
                    members: [testUser._id]
                },
                {
                    name: 'User1 Member Project',
                    owner: otherUser._id,
                    members: [otherUser._id, testUser._id]
                },
                {
                    name: 'Other User Project',
                    owner: otherUser._id,
                    members: [otherUser._id]
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
            // Wait a bit to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));

            await Project.create({
                name: 'Newest Project',
                owner: testUser._id,
                members: [testUser._id]
            });

            const projects = await projectService.getProjects(testUser._id);

            expect(projects[0].name).toBe('Newest Project');
        });
    });

    describe('getProjectById', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                name: 'Test Project',
                description: 'Test description',
                owner: testUser._id,
                members: [testUser._id]
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
            testProject = await Project.create({
                name: 'Original Project',
                description: 'Original description',
                owner: testUser._id,
                members: [testUser._id]
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
            testProject = await Project.create({
                name: 'Project to Delete',
                description: 'This will be deleted',
                owner: testUser._id,
                members: [testUser._id]
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
});
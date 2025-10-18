import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Task from './task.model.js';
import User from './user.model.js';
import Project from './project.model.js';

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

describe('Task Model Test', () => {
    let testUser;
    let testProject;

    beforeAll(async () => {
        testUser = await User.create({
            username: 'testuser@example.com',
            roles: ['staff'],
            department: 'it',
            hashed_password: 'password123'
        });

        testProject = await Project.create({
            name: 'Test Project',
            description: 'Test project description',
            owner: testUser._id
        });
    });

    it('should create a task with required fields', async () => {
        const taskData = {
            title: 'Test Task',
            owner: testUser._id,
            project: testProject._id
        };

        const task = await Task.create(taskData);

        expect(task.title).toBe('Test Task');
        expect(task.status).toBe('To Do');
        expect(task.owner.toString()).toBe(testUser._id.toString());
        expect(task.project.toString()).toBe(testProject._id.toString());
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();
    });

    it('should fail to create task without title', async () => {
        const taskData = {
            owner: testUser._id,
            project: testProject._id
        };

        await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should fail to create task without project', async () => {
        const taskData = {
            title: 'Test Task',
            owner: testUser._id
        };

        await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should create task with all optional fields', async () => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const taskData = {
            title: 'Complete Task',
            description: 'Task with all fields',
            owner: testUser._id,
            assignee: testUser._id,
            project: testProject._id,
            dueDate: dueDate,
            status: 'In Progress',
            tags: 'urgent#bug#frontend'
        };

        const task = await Task.create(taskData);

        expect(task.title).toBe('Complete Task');
        expect(task.description).toBe('Task with all fields');
        expect(task.status).toBe('In Progress');
        expect(task.project.toString()).toBe(testProject._id.toString());
        expect(task.dueDate).toBeDefined();
        expect(task.tags).toBe('urgent#bug#frontend');
    });

    it('should fail to create task with invalid status', async () => {
        const taskData = {
            title: 'Invalid Status Task',
            owner: testUser._id,
            project: testProject._id,
            status: 'Invalid'
        };

        await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should fail to create task with past due date', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const taskData = {
            title: 'Past Due Task',
            owner: testUser._id,
            project: testProject._id,
            dueDate: yesterday
        };

        await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should update updatedAt field on save', async () => {
        const task = await Task.create({
            title: 'Update Test',
            owner: testUser._id,
            project: testProject._id
        });

        const originalUpdatedAt = task.updatedAt;

        await new Promise(resolve => setTimeout(resolve, 10));

        task.title = 'Updated Title';
        await task.save();

        expect(task.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should create recurring task with valid interval', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const taskData = {
            title: 'Recurring Task',
            owner: testUser._id,
            project: testProject._id,
            dueDate: tomorrow,
            isRecurring: true,
            recurrenceInterval: 7
        };

        const task = await Task.create(taskData);

        expect(task.isRecurring).toBe(true);
        expect(task.recurrenceInterval).toBe(7);
    });

    it('should fail to create recurring task without interval', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const taskData = {
            title: 'Recurring Task',
            owner: testUser._id,
            project: testProject._id,
            dueDate: tomorrow,
            isRecurring: true
        };

        await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should fail to create recurring task with negative interval', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const taskData = {
            title: 'Recurring Task',
            owner: testUser._id,
            project: testProject._id,
            dueDate: tomorrow,
            isRecurring: true,
            recurrenceInterval: -5
        };

        await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should create non-recurring task without interval', async () => {
        const taskData = {
            title: 'Non-Recurring Task',
            owner: testUser._id,
            project: testProject._id,
            isRecurring: false
        };

        const task = await Task.create(taskData);

        expect(task.isRecurring).toBe(false);
        expect(task.recurrenceInterval).toBeNull();
    });

    /**
     * Project Task Viewing Permissions
     * Purpose: Verify task objects contain all standard required fields
     */
    describe('Task Viewing Permissions - Standard Fields (TDD)', () => {
        it('[PTV-009] should return tasks with all standard required fields', async () => {
            // Arrange: Create a task with all fields populated
            const assigneeUser = await User.create({
                username: 'assignee@example.com',
                roles: ['staff'],
                department: 'engineering',
                hashed_password: 'password456'
            });

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);

            const taskData = {
                title: 'Standard Fields Task',
                description: 'Test task for field validation',
                priority: 5,
                status: 'To Do',
                owner: testUser._id,
                assignee: [assigneeUser._id],
                project: testProject._id,
                tags: 'test#validation',
                dueDate: dueDate
            };

            // Act: Create task in database
            const task = await Task.create(taskData);

            // Assert: Verify all standard required fields exist and have correct types
            // _id field
            expect(task._id).toBeDefined();
            expect(task._id).toBeInstanceOf(mongoose.Types.ObjectId);

            // title field (note: model uses 'title', not 'name')
            expect(task.title).toBeDefined();
            expect(typeof task.title).toBe('string');
            expect(task.title).toBe('Standard Fields Task');

            // projectId field (stored as 'project' in model)
            expect(task.project).toBeDefined();
            expect(task.project).toBeInstanceOf(mongoose.Types.ObjectId);
            expect(task.project.toString()).toBe(testProject._id.toString());

            // status field
            expect(task.status).toBeDefined();
            expect(typeof task.status).toBe('string');
            expect(task.status).toBe('To Do');

            // assignee field (array of ObjectIds)
            expect(task.assignee).toBeDefined();
            expect(Array.isArray(task.assignee)).toBe(true);
            expect(task.assignee).toHaveLength(1);
            expect(task.assignee[0]).toBeInstanceOf(mongoose.Types.ObjectId);

            // createdAt field (timestamp)
            expect(task.createdAt).toBeDefined();
            expect(task.createdAt).toBeInstanceOf(Date);
            // Verify ISO date string format
            const createdAtISO = task.createdAt.toISOString();
            expect(createdAtISO).toMatch(/^\d{4}-\d{2}-\d{2}T/);

            // updatedAt field (timestamp)
            expect(task.updatedAt).toBeDefined();
            expect(task.updatedAt).toBeInstanceOf(Date);
            // Verify ISO date string format
            const updatedAtISO = task.updatedAt.toISOString();
            expect(updatedAtISO).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('[PTV-009] should handle task with null assignee', async () => {
            // Arrange: Create task without assignee
            const taskData = {
                title: 'Unassigned Task',
                description: 'Task with no assignee',
                priority: 3,
                status: 'To Do',
                owner: testUser._id,
                project: testProject._id
            };

            // Act: Create task
            const task = await Task.create(taskData);

            // Assert: assignee should be empty array (model default)
            expect(task.assignee).toBeDefined();
            expect(Array.isArray(task.assignee)).toBe(true);
            expect(task.assignee).toHaveLength(0);

            // All other standard fields should still exist
            expect(task._id).toBeDefined();
            expect(task.title).toBeDefined();
            expect(task.project).toBeDefined();
            expect(task.status).toBeDefined();
            expect(task.createdAt).toBeDefined();
            expect(task.updatedAt).toBeDefined();
        });

        it('[PTV-009] should validate assignee field allows multiple assignees', async () => {
            // Arrange: Create multiple assignee users
            const assignee1 = await User.create({
                username: 'assignee1@example.com',
                roles: ['staff'],
                department: 'engineering',
                hashed_password: 'password1'
            });

            const assignee2 = await User.create({
                username: 'assignee2@example.com',
                roles: ['staff'],
                department: 'engineering',
                hashed_password: 'password2'
            });

            const taskData = {
                title: 'Multi-Assignee Task',
                owner: testUser._id,
                project: testProject._id,
                assignee: [assignee1._id, assignee2._id]
            };

            // Act: Create task with multiple assignees
            const task = await Task.create(taskData);

            // Assert: assignee array contains both users
            expect(task.assignee).toHaveLength(2);
            expect(task.assignee[0].toString()).toBe(assignee1._id.toString());
            expect(task.assignee[1].toString()).toBe(assignee2._id.toString());
        });
    });
});
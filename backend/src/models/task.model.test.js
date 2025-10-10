import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Task from './task.model.js';
import User from './user.model.js';
import Project from './project.model.js';

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
});
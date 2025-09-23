const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('vitest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const taskService = require('./task.services');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const Project = require('../models/project.model');

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

describe('Task Service Test', () => {
    let testUser;
    let testProject;

    beforeEach(async () => {
        await Task.deleteMany({});
        await User.deleteMany({});
        await Project.deleteMany({});

        testUser = await User.create({
            username: 'testuser',
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

    describe('createTask', () => {
        it('should create a task with valid data', async () => {
            const taskData = {
                title: 'New Task',
                description: 'Task description'
            };

            const task = await taskService.createTask(taskData, testUser._id);

            expect(task.title).toBe('New Task');
            expect(task.status).toBe('To Do');
            expect(task.owner.toString()).toBe(testUser._id.toString());
        });

        it('should throw error for empty title', async () => {
            const taskData = {
                title: ''
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Task title is required');
        });

        it('should throw error for past due date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const taskData = {
                title: 'Task',
                dueDate: yesterday
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Due date cannot be in the past');
        });

        it('should create task with project', async () => {
            const taskData = {
                title: 'Project Task',
                project: testProject._id
            };

            const task = await taskService.createTask(taskData, testUser._id);

            expect(task.project.toString()).toBe(testProject._id.toString());
        });

        it('should throw error for non-existent project', async () => {
            const taskData = {
                title: 'Task',
                project: new mongoose.Types.ObjectId()
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Selected project does not exist');
        });
    });

    describe('updateTask', () => {
        let existingTask;

        beforeEach(async () => {
            existingTask = await Task.create({
                title: 'Original Task',
                owner: testUser._id,
                assignee: testUser._id
            });
        });

        it('should update task title', async () => {
            const updateData = {
                title: 'Updated Title'
            };

            const updatedTask = await taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            );

            expect(updatedTask.title).toBe('Updated Title');
        });

        it('should throw error for empty title update', async () => {
            const updateData = {
                title: ''
            };

            await expect(taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            )).rejects.toThrow('Task title cannot be empty');
        });

        it('should throw error for unauthorized update', async () => {
            const otherUser = await User.create({
                username: 'otheruser',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password456'
            });

            const updateData = {
                title: 'Unauthorized Update'
            };

            await expect(taskService.updateTask(
                existingTask._id,
                updateData,
                otherUser._id.toString()
            )).rejects.toThrow('You do not have permission to modify this task');
        });

        it('should update due date', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const updateData = {
                dueDate: futureDate
            };

            const updatedTask = await taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            );

            expect(updatedTask.dueDate).toBeDefined();
        });

        it('should clear due date when null provided', async () => {
            existingTask.dueDate = new Date();
            await existingTask.save();

            const updateData = {
                dueDate: null
            };

            const updatedTask = await taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            );

            expect(updatedTask.dueDate).toBeNull();
        });
    });

    describe('getTasks', () => {
        beforeEach(async () => {
            await Task.create([
                {
                    title: 'Task 1',
                    owner: testUser._id,
                    status: 'To Do'
                },
                {
                    title: 'Task 2',
                    owner: testUser._id,
                    status: 'In Progress',
                    project: testProject._id
                },
                {
                    title: 'Task 3',
                    owner: testUser._id,
                    status: 'Done'
                }
            ]);
        });

        it('should get all tasks', async () => {
            const tasks = await taskService.getTasks();
            expect(tasks).toHaveLength(3);
        });

        it('should filter tasks by status', async () => {
            const tasks = await taskService.getTasks({ status: 'To Do' });
            expect(tasks).toHaveLength(1);
            expect(tasks[0].title).toBe('Task 1');
        });

        it('should filter standalone tasks', async () => {
            const tasks = await taskService.getTasks({ standalone: true });
            expect(tasks).toHaveLength(2);
        });

        it('should filter tasks by project', async () => {
            const tasks = await taskService.getTasks({ project: testProject._id });
            expect(tasks).toHaveLength(1);
            expect(tasks[0].title).toBe('Task 2');
        });
    });

    describe('deleteTask', () => {
        let taskToDelete;

        beforeEach(async () => {
            taskToDelete = await Task.create({
                title: 'Task to Delete',
                owner: testUser._id
            });
        });

        it('should delete task by owner', async () => {
            await taskService.deleteTask(taskToDelete._id, testUser._id.toString());

            const task = await Task.findById(taskToDelete._id);
            expect(task).toBeNull();
        });

        it('should throw error for unauthorized deletion', async () => {
            const otherUser = await User.create({
                username: 'otheruser',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password456'
            });

            await expect(taskService.deleteTask(
                taskToDelete._id,
                otherUser._id.toString()
            )).rejects.toThrow('You do not have permission to delete this task');
        });

        it('should throw error for non-existent task', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(taskService.deleteTask(
                fakeId,
                testUser._id.toString()
            )).rejects.toThrow('Task not found');
        });
    });
});
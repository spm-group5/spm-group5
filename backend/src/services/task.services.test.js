import { describe, it, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import taskService from './task.services.js';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';

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

describe('Task Service Test', () => {
    let testUser;
    let testProject;

    beforeEach(async () => {
        await Task.deleteMany({});
        await User.deleteMany({});
        await Project.deleteMany({});

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

    describe('createTask', () => {
        it('should create a task with valid data', async () => {
            const taskData = {
                title: 'New Task',
                description: 'Task description',
                project: testProject._id
            };

            const task = await taskService.createTask(taskData, testUser._id);

            expect(task.title).toBe('New Task');
            expect(task.status).toBe('To Do');
            expect(task.owner.toString()).toBe(testUser._id.toString());
            expect(task.project.toString()).toBe(testProject._id.toString());
            expect(task.assignee).toHaveLength(1);
            expect(task.assignee[0].toString()).toBe(testUser._id.toString());
        });

        it('should set creator as default assignee', async () => {
            const taskData = {
                title: 'Task',
                project: testProject._id
            };

            const task = await taskService.createTask(taskData, testUser._id);

            expect(task.assignee).toHaveLength(1);
            expect(task.assignee[0].toString()).toBe(testUser._id.toString());
        });

        it('should include creator when additional assignees are provided', async () => {
            const otherUser = await User.create({
                username: 'otheruser@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password456'
            });

            const taskData = {
                title: 'Task',
                project: testProject._id,
                assignee: [otherUser._id]
            };

            const task = await taskService.createTask(taskData, testUser._id);

            expect(task.assignee).toHaveLength(2);
            expect(task.assignee.map(a => a.toString())).toContain(testUser._id.toString());
            expect(task.assignee.map(a => a.toString())).toContain(otherUser._id.toString());
        });

        it('should throw error when more than 5 assignees', async () => {
            const users = await Promise.all([
                User.create({ username: 'user1@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' }),
                User.create({ username: 'user2@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' }),
                User.create({ username: 'user3@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' }),
                User.create({ username: 'user4@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' }),
                User.create({ username: 'user5@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' })
            ]);

            const taskData = {
                title: 'Task',
                project: testProject._id,
                assignee: users.map(u => u._id)
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('A task can have a maximum of 5 assignees');
        });

        it('should throw error for empty title', async () => {
            const taskData = {
                title: '',
                project: testProject._id
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Task title is required');
        });

        it('should throw error for missing project', async () => {
            const taskData = {
                title: 'Task without project'
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Project is required');
        });

        it('should throw error for past due date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const taskData = {
                title: 'Task',
                project: testProject._id,
                dueDate: yesterday
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Due date cannot be in the past');
        });

        it('should create task with tags', async () => {
            const taskData = {
                title: 'Task with tags',
                project: testProject._id,
                tags: 'bug#urgent#frontend'
            };

            const task = await taskService.createTask(taskData, testUser._id);

            expect(task.tags).toBe('bug#urgent#frontend');
        });

        it('should throw error for non-existent project', async () => {
            const taskData = {
                title: 'Task',
                project: new mongoose.Types.ObjectId()
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Selected project does not exist');
        });

        it('should throw error for inactive project', async () => {
            const inactiveProject = await Project.create({
                name: 'Inactive Project',
                owner: testUser._id,
                status: 'Completed'
            });

            const taskData = {
                title: 'Task',
                project: inactiveProject._id
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Project must be Active');
        });
    });

    describe('updateTask', () => {
        let existingTask;
        let managerUser;

        beforeEach(async () => {
            managerUser = await User.create({
                username: 'manager@example.com',
                roles: ['manager'],
                department: 'it',
                hashed_password: 'password123'
            });

            existingTask = await Task.create({
                title: 'Original Task',
                owner: testUser._id,
                assignee: [testUser._id],
                project: testProject._id
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
                username: 'otheruser@example.com',
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

        it('should update tags', async () => {
            const updateData = {
                tags: 'updated#urgent#backend'
            };

            const updatedTask = await taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            );

            expect(updatedTask.tags).toBe('updated#urgent#backend');
        });

        it('should throw error when trying to change project', async () => {
            const newProject = await Project.create({
                name: 'New Project',
                owner: testUser._id,
                status: 'Active'
            });

            const updateData = {
                project: newProject._id
            };

            await expect(taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            )).rejects.toThrow('Project cannot be changed after task creation');
        });

        it('should allow assignee to add new assignees', async () => {
            const newUser = await User.create({
                username: 'newuser@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password789'
            });

            const updateData = {
                assignee: [testUser._id, newUser._id]
            };

            const updatedTask = await taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            );

            expect(updatedTask.assignee).toHaveLength(2);
            expect(updatedTask.assignee.map(a => a._id?.toString ? a._id.toString() : a.toString())).toContain(newUser._id.toString());
        });

        it('should throw error when non-manager tries to remove assignee', async () => {
            const otherUser = await User.create({
                username: 'other@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'pass'
            });

            existingTask.assignee = [testUser._id, otherUser._id];
            await existingTask.save();

            const updateData = {
                assignee: [testUser._id] // Removing otherUser
            };

            await expect(taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            )).rejects.toThrow('Only managers can remove assignees from a task');
        });

        it('should allow manager to remove assignees', async () => {
            const otherUser = await User.create({
                username: 'other@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'pass'
            });

            existingTask.assignee = [testUser._id, otherUser._id, managerUser._id];
            await existingTask.save();

            const updateData = {
                assignee: [testUser._id] // Manager removing others
            };

            const updatedTask = await taskService.updateTask(
                existingTask._id,
                updateData,
                managerUser._id.toString()
            );

            expect(updatedTask.assignee).toHaveLength(1);
            expect(updatedTask.assignee[0]._id?.toString ? updatedTask.assignee[0]._id.toString() : updatedTask.assignee[0].toString()).toBe(testUser._id.toString());
        });

        it('should throw error when trying to have more than 5 assignees', async () => {
            const users = await Promise.all([
                User.create({ username: 'u1@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' }),
                User.create({ username: 'u2@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' }),
                User.create({ username: 'u3@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' }),
                User.create({ username: 'u4@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' }),
                User.create({ username: 'u5@example.com', roles: ['staff'], department: 'hr', hashed_password: 'pass' })
            ]);

            const updateData = {
                assignee: [testUser._id, ...users.map(u => u._id)]
            };

            await expect(taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            )).rejects.toThrow('A task can have a maximum of 5 assignees');
        });

        it('should throw error when trying to remove all assignees', async () => {
            const updateData = {
                assignee: []
            };

            await expect(taskService.updateTask(
                existingTask._id,
                updateData,
                testUser._id.toString()
            )).rejects.toThrow('At least one assignee is required');
        });
    });

    describe('Task Recurrence', () => {
        it('should create recurring task with valid interval and due date', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const taskData = {
                title: 'Recurring Task',
                project: testProject._id,
                dueDate: futureDate,
                isRecurring: true,
                recurrenceInterval: 7
            };

            const task = await taskService.createTask(taskData, testUser._id);

            expect(task.isRecurring).toBe(true);
            expect(task.recurrenceInterval).toBe(7);
        });

        it('should throw error for recurring task without interval', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const taskData = {
                title: 'Recurring Task',
                project: testProject._id,
                dueDate: futureDate,
                isRecurring: true
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Recurrence interval must be a positive number for recurring tasks');
        });

        it('should throw error for recurring task without due date', async () => {
            const taskData = {
                title: 'Recurring Task',
                project: testProject._id,
                isRecurring: true,
                recurrenceInterval: 7
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Due date is required for recurring tasks');
        });

        it('should turn off recurrence when updating', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const recurringTask = await Task.create({
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

            const updatedTask = await taskService.updateTask(
                recurringTask._id,
                updateData,
                testUser._id.toString()
            );

            expect(updatedTask.isRecurring).toBe(false);
            expect(updatedTask.recurrenceInterval).toBeNull();
        });

        it('should turn on recurrence when updating', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const task = await Task.create({
                title: 'Task',
                owner: testUser._id,
                assignee: [testUser._id],
                project: testProject._id,
                dueDate: futureDate
            });

            const updateData = {
                isRecurring: true,
                recurrenceInterval: 14
            };

            const updatedTask = await taskService.updateTask(
                task._id,
                updateData,
                testUser._id.toString()
            );

            expect(updatedTask.isRecurring).toBe(true);
            expect(updatedTask.recurrenceInterval).toBe(14);
        });

        it('should create new recurring task instance', async () => {
            const originalDueDate = new Date();
            originalDueDate.setDate(originalDueDate.getDate() + 7);

            const originalTask = await Task.create({
                title: 'Weekly Report',
                owner: testUser._id,
                assignee: [testUser._id],
                project: testProject._id,
                dueDate: originalDueDate,
                isRecurring: true,
                recurrenceInterval: 7,
                status: 'Done',
                description: 'Submit weekly report',
                priority: 8,
                tags: 'report#weekly'
            });

            const newTask = await taskService.createRecurringTask(originalTask);

            expect(newTask).toBeDefined();
            expect(newTask.title).toBe(originalTask.title);
            expect(newTask.description).toBe(originalTask.description);
            expect(newTask.priority).toBe(originalTask.priority);
            expect(newTask.tags).toBe(originalTask.tags);
            expect(newTask.isRecurring).toBe(true);
            expect(newTask.recurrenceInterval).toBe(7);
            expect(newTask.status).toBe('To Do');
            expect(newTask.assignee.map(a => a.toString())).toEqual(
                originalTask.assignee.map(a => a.toString())
            );

            // Check due date is 7 days after original
            const expectedDueDate = new Date(originalDueDate);
            expectedDueDate.setDate(expectedDueDate.getDate() + 7);
            expect(newTask.dueDate.toDateString()).toBe(expectedDueDate.toDateString());
        });

        it('should not create recurring task for non-recurring task', async () => {
            const task = await Task.create({
                title: 'One-time Task',
                owner: testUser._id,
                assignee: [testUser._id],
                project: testProject._id,
                status: 'Done'
            });

            const newTask = await taskService.createRecurringTask(task);

            expect(newTask).toBeNull();
        });
    });

    describe('getTasks', () => {
        let anotherProject;

        beforeEach(async () => {
            anotherProject = await Project.create({
                name: 'Another Project',
                owner: testUser._id,
                status: 'Active'
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
                    project: anotherProject._id
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
            const tasks = await taskService.getTasks();
            expect(tasks).toHaveLength(3);
        });

        it('should filter tasks by status', async () => {
            const tasks = await taskService.getTasks({ status: 'To Do' });
            expect(tasks).toHaveLength(1);
            expect(tasks[0].title).toBe('Task 1');
        });

        it('should filter tasks by project', async () => {
            const tasks = await taskService.getTasks({ project: testProject._id });
            expect(tasks).toHaveLength(2);
        });
    });

    describe('deleteTask', () => {
        let taskToDelete;

        beforeEach(async () => {
            taskToDelete = await Task.create({
                title: 'Task to Delete',
                owner: testUser._id,
                project: testProject._id
            });
        });

        it('should delete task by owner', async () => {
            await taskService.deleteTask(taskToDelete._id, testUser._id.toString());

            const task = await Task.findById(taskToDelete._id);
            expect(task).toBeNull();
        });

        it('should throw error for unauthorized deletion', async () => {
            const otherUser = await User.create({
                username: 'otheruser@example.com',
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

    describe('archiveTask', () => {
        it('should archive a task successfully by owner', async () => {
            const task = await Task.create({
                title: 'Task to Archive',
                description: 'Test description',
                status: 'To Do',
                priority: 5,
                owner: testUser._id,
                project: testProject._id,
                assignee: []
            });

            const archivedTask = await taskService.archiveTask(
                task._id.toString(),
                testUser._id.toString()
            );

            expect(archivedTask.archived).toBe(true);
            expect(archivedTask.archivedAt).toBeDefined();
            expect(archivedTask.archivedAt).toBeInstanceOf(Date);
        });

        it('should archive a task successfully by assignee', async () => {
            const assignee = await User.create({
                username: 'assignee@example.com',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            });

            const task = await Task.create({
                title: 'Task to Archive',
                description: 'Test description',
                status: 'To Do',
                priority: 5,
                owner: testUser._id,
                project: testProject._id,
                assignee: [assignee._id]
            });

            const archivedTask = await taskService.archiveTask(
                task._id.toString(),
                assignee._id.toString()
            );

            expect(archivedTask.archived).toBe(true);
            expect(archivedTask.archivedAt).toBeDefined();
        });

        it('should throw error when non-owner/non-assignee tries to archive', async () => {
            const otherUser = await User.create({
                username: 'otheruser@example.com',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            });

            const task = await Task.create({
                title: 'Task to Archive',
                description: 'Test description',
                status: 'To Do',
                priority: 5,
                owner: testUser._id,
                project: testProject._id,
                assignee: []
            });

            await expect(taskService.archiveTask(
                task._id.toString(),
                otherUser._id.toString()
            )).rejects.toThrow('You do not have permission to archive this task');
        });

        it('should throw error for non-existent task', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(taskService.archiveTask(
                fakeId.toString(),
                testUser._id.toString()
            )).rejects.toThrow('Task not found');
        });

        it('should return populated fields after archiving', async () => {
            const task = await Task.create({
                title: 'Task to Archive',
                description: 'Test description',
                status: 'To Do',
                priority: 5,
                owner: testUser._id,
                project: testProject._id,
                assignee: [testUser._id]
            });

            const archivedTask = await taskService.archiveTask(
                task._id.toString(),
                testUser._id.toString()
            );

            expect(archivedTask.owner).toBeDefined();
            expect(archivedTask.owner.username).toBe('testuser@example.com');
            expect(archivedTask.project).toBeDefined();
            expect(archivedTask.project.name).toBe('Test Project');
        });
    });

    describe('unarchiveTask', () => {
        it('should unarchive a task successfully by owner', async () => {
            const task = await Task.create({
                title: 'Archived Task',
                description: 'Test description',
                status: 'To Do',
                priority: 5,
                owner: testUser._id,
                project: testProject._id,
                assignee: [],
                archived: true,
                archivedAt: new Date()
            });

            const unarchivedTask = await taskService.unarchiveTask(
                task._id.toString(),
                testUser._id.toString()
            );

            expect(unarchivedTask.archived).toBe(false);
            expect(unarchivedTask.archivedAt).toBeNull();
        });

        it('should unarchive a task successfully by assignee', async () => {
            const assignee = await User.create({
                username: 'assignee@example.com',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            });

            const task = await Task.create({
                title: 'Archived Task',
                description: 'Test description',
                status: 'To Do',
                priority: 5,
                owner: testUser._id,
                project: testProject._id,
                assignee: [assignee._id],
                archived: true,
                archivedAt: new Date()
            });

            const unarchivedTask = await taskService.unarchiveTask(
                task._id.toString(),
                assignee._id.toString()
            );

            expect(unarchivedTask.archived).toBe(false);
            expect(unarchivedTask.archivedAt).toBeNull();
        });

        it('should throw error when non-owner/non-assignee tries to unarchive', async () => {
            const otherUser = await User.create({
                username: 'otheruser@example.com',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            });

            const task = await Task.create({
                title: 'Archived Task',
                description: 'Test description',
                status: 'To Do',
                priority: 5,
                owner: testUser._id,
                project: testProject._id,
                assignee: [],
                archived: true,
                archivedAt: new Date()
            });

            await expect(taskService.unarchiveTask(
                task._id.toString(),
                otherUser._id.toString()
            )).rejects.toThrow('You do not have permission to unarchive this task');
        });

        it('should throw error for non-existent task', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(taskService.unarchiveTask(
                fakeId.toString(),
                testUser._id.toString()
            )).rejects.toThrow('Task not found');
        });

        it('should return populated fields after unarchiving', async () => {
            const task = await Task.create({
                title: 'Archived Task',
                description: 'Test description',
                status: 'To Do',
                priority: 5,
                owner: testUser._id,
                project: testProject._id,
                assignee: [testUser._id],
                archived: true,
                archivedAt: new Date()
            });

            const unarchivedTask = await taskService.unarchiveTask(
                task._id.toString(),
                testUser._id.toString()
            );

            expect(unarchivedTask.owner).toBeDefined();
            expect(unarchivedTask.owner.username).toBe('testuser@example.com');
            expect(unarchivedTask.project).toBeDefined();
            expect(unarchivedTask.project.name).toBe('Test Project');
        });
    });
});
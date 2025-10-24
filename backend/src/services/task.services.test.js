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
            owner: testUser._id,
            status: 'In Progress' // Allowed status for task creation
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
                .rejects.toThrow('Maximum of 5 assignees allowed');
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

        // Test project status validation with new status enum values
        it('should allow task creation in "To Do" project', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const todoProject = await Project.create({
                name: 'To Do Project',
                owner: testUser._id,
                status: 'To Do',
                dueDate: futureDate
            });

            const taskData = {
                title: 'Task in To Do Project',
                project: todoProject._id
            };

            const task = await taskService.createTask(taskData, testUser._id);
            expect(task.title).toBe('Task in To Do Project');
            expect(task.project.toString()).toBe(todoProject._id.toString());
        });

        it('should allow task creation in "In Progress" project', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const inProgressProject = await Project.create({
                name: 'In Progress Project',
                owner: testUser._id,
                status: 'In Progress',
                dueDate: futureDate
            });

            const taskData = {
                title: 'Task in In Progress Project',
                project: inProgressProject._id
            };

            const task = await taskService.createTask(taskData, testUser._id);
            expect(task.title).toBe('Task in In Progress Project');
            expect(task.project.toString()).toBe(inProgressProject._id.toString());
        });

        it('should allow task creation in "Blocked" project', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const blockedProject = await Project.create({
                name: 'Blocked Project',
                owner: testUser._id,
                status: 'Blocked',
                dueDate: futureDate
            });

            const taskData = {
                title: 'Task in Blocked Project',
                project: blockedProject._id
            };

            const task = await taskService.createTask(taskData, testUser._id);
            expect(task.title).toBe('Task in Blocked Project');
            expect(task.project.toString()).toBe(blockedProject._id.toString());
        });

        it('should throw error for tasks in "Completed" project', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const completedProject = await Project.create({
                name: 'Completed Project',
                owner: testUser._id,
                status: 'Completed',
                dueDate: futureDate
            });

            const taskData = {
                title: 'Task in Completed Project',
                project: completedProject._id
            };

            await expect(taskService.createTask(taskData, testUser._id))
                .rejects.toThrow('Cannot assign tasks to completed projects');
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
                status: 'In Progress'
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

        it.skip('should allow assignee to add new assignees', async () => {
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
            )).rejects.toThrow('Only managers can remove assignees');
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
            )).rejects.toThrow('Maximum of 5 assignees allowed');
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
                status: 'Completed',
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
                status: 'Completed'
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
                status: 'In Progress'
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
                    status: 'Completed',
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

    /**
     * Purpose: Test authorization logic for viewing tasks by project
     * This tests the business logic layer that determines who can access tasks
     */
    describe('Task Viewing Permissions - Service Layer (TDD)', () => {
        let staff123, staff456, marketing001, adminUser;
        let engineeringProject, marketingProject;

        beforeEach(async () => {
            // Create users with different departments and roles
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

            // Create projects
            engineeringProject = await Project.create({
                name: 'Engineering Project',
                description: 'Project for engineering team',
                owner: staff123._id,
                status: 'In Progress'
            });

            marketingProject = await Project.create({
                name: 'Marketing Project',
                description: 'Project for marketing team',
                owner: marketing001._id,
                status: 'In Progress'
            });
        });

        describe('[PTV-002] Staff views tasks when personally assigned', () => {
            it('should return all tasks when staff member is personally assigned', async () => {
                // Arrange: Create tasks - one assigned to staff123, one to someone else
                const task1 = await Task.create({
                    title: 'Setup Database',
                    description: 'Initialize database',
                    owner: staff123._id,
                    assignee: [staff123._id],
                    project: engineeringProject._id,
                    status: 'To Do',
                    priority: 5
                });

                const task2 = await Task.create({
                    title: 'Design UI',
                    description: 'Create UI mockups',
                    owner: staff456._id,
                    assignee: [staff456._id],
                    project: engineeringProject._id,
                    status: 'To Do',
                    priority: 5
                });

                // Act: staff123 requests tasks for the project
                const tasks = await taskService.getTasksByProject(
                    engineeringProject._id,
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: Should return ALL tasks (both tasks) because staff123 is assigned to at least one
                expect(tasks).toBeDefined();
                expect(Array.isArray(tasks)).toBe(true);
                expect(tasks).toHaveLength(2);

                const taskTitles = tasks.map(t => t.title);
                expect(taskTitles).toContain('Setup Database');
                expect(taskTitles).toContain('Design UI');
            });

            it('should return empty array when no tasks exist in project', async () => {
                // Arrange: Project with no tasks
                const emptyProject = await Project.create({
                    name: 'Empty Project',
                    owner: staff123._id,
                    status: 'In Progress'
                });

                // Act: Request tasks for empty project
                const tasks = await taskService.getTasksByProject(
                    emptyProject._id,
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: Should return empty array or throw 403 (see PTV-015 - business decision needed)
                // For now, implementing Option A (permissive) - return empty array
                expect(Array.isArray(tasks)).toBe(true);
                expect(tasks).toHaveLength(0);
            });
        });

        describe('[PTV-003] Staff views tasks via department colleague', () => {
            it('should return all tasks when department colleague is assigned', async () => {
                // Arrange: Create task assigned ONLY to staff456 (same engineering department as staff123)
                const task = await Task.create({
                    title: 'Engineering Task',
                    description: 'Task for engineering team',
                    owner: staff456._id,
                    assignee: [staff456._id],
                    project: engineeringProject._id,
                    status: 'To Do',
                    priority: 5
                });

                // Act: staff123 (NOT assigned, but same department) requests tasks
                const tasks = await taskService.getTasksByProject(
                    engineeringProject._id,
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: staff123 can view because staff456 (same department) is assigned
                expect(tasks).toHaveLength(1);
                expect(tasks[0].title).toBe('Engineering Task');
                expect(tasks[0].assignee[0].department).toBe('engineering');
            });

            it('should deny access when no department colleagues are assigned', async () => {
                // Arrange: Create task assigned ONLY to marketing department
                await Task.create({
                    title: 'Marketing Task',
                    description: 'Task for marketing team',
                    owner: marketing001._id,
                    assignee: [marketing001._id],
                    project: marketingProject._id,
                    status: 'To Do',
                    priority: 5
                });

                // Act & Assert: staff123 (engineering) tries to access marketing project tasks
                await expect(
                    taskService.getTasksByProject(
                        marketingProject._id,
                        staff123._id,
                        'staff',
                        'engineering'
                    )
                ).rejects.toThrow(/Access denied|not have permission/i);
            });
        });

        describe('[PTV-005] Admin views all tasks without restrictions', () => {
            it('should return all tasks for admin without assignment checks', async () => {
                // Arrange: Create tasks assigned to staff users (NOT to admin)
                await Task.create({
                    title: 'Task 1',
                    owner: staff123._id,
                    assignee: [staff123._id],
                    project: engineeringProject._id,
                    status: 'To Do',
                    priority: 5
                });

                await Task.create({
                    title: 'Task 2',
                    owner: staff456._id,
                    assignee: [staff456._id],
                    project: engineeringProject._id,
                    status: 'In Progress',
                    priority: 3
                });

                // Act: Admin requests tasks (admin is NOT assigned to any task)
                const tasks = await taskService.getTasksByProject(
                    engineeringProject._id,
                    adminUser._id,
                    'admin',
                    'it'
                );

                // Assert: Admin sees all 2 tasks despite not being assigned
                expect(tasks).toHaveLength(2);
                expect(tasks[0].title).toBeDefined();
                expect(tasks[1].title).toBeDefined();
            });

            it('should allow admin to access any department project', async () => {
                // Arrange: Create task in marketing department project
                await Task.create({
                    title: 'Marketing Task',
                    owner: marketing001._id,
                    assignee: [marketing001._id],
                    project: marketingProject._id,
                    status: 'To Do',
                    priority: 5
                });

                // Act: Admin (IT department) requests tasks from marketing project
                const tasks = await taskService.getTasksByProject(
                    marketingProject._id,
                    adminUser._id,
                    'admin',
                    'it'
                );

                // Assert: Admin can access despite being in different department
                expect(tasks).toHaveLength(1);
                expect(tasks[0].title).toBe('Marketing Task');
            });
        });

        describe('[PTV-011] Staff accesses non-existent project', () => {
            it('should throw 404 error when staff accesses non-existent project', async () => {
                // Arrange: Create a valid ObjectId that doesn't exist in database
                const nonExistentId = new mongoose.Types.ObjectId();

                // Act & Assert: staff123 attempts to access non-existent project
                await expect(
                    taskService.getTasksByProject(
                        nonExistentId,
                        staff123._id,
                        'staff',
                        'engineering'
                    )
                ).rejects.toThrow(/Project not found/i);
            });
        });

        describe('[PTV-012] Admin accesses non-existent project', () => {
            it('should throw 404 error when admin accesses non-existent project', async () => {
                // Arrange: Generate non-existent ObjectId
                const nonExistentId = new mongoose.Types.ObjectId();

                // Act & Assert: Admin attempts to access non-existent project
                // Admin role should NOT bypass existence validation
                await expect(
                    taskService.getTasksByProject(
                        nonExistentId,
                        adminUser._id,
                        'admin',
                        'it'
                    )
                ).rejects.toThrow(/Project not found/i);
            });
        });

        describe('[PTV-014] Staff with null/undefined department', () => {
            it('should deny access when staff has null department', async () => {
                // Arrange: Create staff with null department
                const staffNoDept = await User.create({
                    username: 'staffnodept@example.com',
                    roles: ['staff'],
                    department: 'it', // Required by schema, but we'll pass null/undefined to service
                    hashed_password: 'password'
                });

                // Create task assigned to engineering staff
                await Task.create({
                    title: 'Engineering Task',
                    owner: staff456._id,
                    assignee: [staff456._id],
                    project: engineeringProject._id,
                    status: 'To Do',
                    priority: 5
                });

                // Act & Assert: Staff with null department tries to access
                await expect(
                    taskService.getTasksByProject(
                        engineeringProject._id,
                        staffNoDept._id,
                        'staff',
                        null // Pass null department
                    )
                ).rejects.toThrow(/Access denied|not have permission/i);
            });

            it('should deny access when staff has undefined department', async () => {
                // Arrange: Create staff
                const staffNoDept = await User.create({
                    username: 'staffnodept2@example.com',
                    roles: ['staff'],
                    department: 'it',
                    hashed_password: 'password'
                });

                // Create task
                await Task.create({
                    title: 'Task',
                    owner: staff456._id,
                    assignee: [staff456._id],
                    project: engineeringProject._id,
                    status: 'To Do',
                    priority: 5
                });

                // Act & Assert: Pass undefined department to service
                await expect(
                    taskService.getTasksByProject(
                        engineeringProject._id,
                        staffNoDept._id,
                        'staff',
                        undefined
                    )
                ).rejects.toThrow(/Access denied|not have permission/i);
            });
        });

        describe('[PTV-015] Project with empty task list', () => {
            it('should return empty array for project with no tasks (permissive approach)', async () => {
                // Arrange: Project exists but has no tasks
                const emptyProject = await Project.create({
                    name: 'Empty Project',
                    description: 'Project without tasks',
                    owner: staff123._id,
                    status: 'In Progress'
                });

                // Act: staff123 (project owner) requests tasks
                const tasks = await taskService.getTasksByProject(
                    emptyProject._id,
                    staff123._id,
                    'staff',
                    'engineering'
                );

                // Assert: Should return empty array (Option A - permissive)
                // Note: Team needs to decide between Option A vs Option B (restrictive 403)
                expect(Array.isArray(tasks)).toBe(true);
                expect(tasks).toHaveLength(0);
            });

            it('should allow admin to access empty project', async () => {
                // Arrange: Empty project
                const emptyProject = await Project.create({
                    name: 'Admin Empty Project',
                    owner: staff123._id,
                    status: 'In Progress'
                });

                // Act: Admin requests tasks
                const tasks = await taskService.getTasksByProject(
                    emptyProject._id,
                    adminUser._id,
                    'admin',
                    'it'
                );

                // Assert: Admin can access even with no tasks
                expect(Array.isArray(tasks)).toBe(true);
                expect(tasks).toHaveLength(0);
            });
        });
    });

    // TESTS: Task Assignment Feature Tests (TSK-018 through TSK-022)
    describe('Task Assignment Tests - TSK-020, TSK-021', () => {
        let manager, staff1, staff2, staff3;

        beforeEach(async () => {
            // Create test users for assignment tests
            manager = await User.create({
                username: 'manager@company.com',
                roles: ['manager'],
                department: 'it',
                hashed_password: 'password123'
            });

            staff1 = await User.create({
                username: 'staff1@company.com',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            });

            staff2 = await User.create({
                username: 'staff2@company.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password123'
            });

            staff3 = await User.create({
                username: 'staff3@company.com',
                roles: ['staff'],
                department: 'sales',
                hashed_password: 'password123'
            });
        });

        describe('TSK-020: Ownership Transfer', () => {
            it('should transfer ownership to new assignee', async () => {
                // Create task owned by manager
                const task = await Task.create({
                    title: 'T-612: API documentation',
                    description: 'Write comprehensive API docs',
                    priority: 5,
                    status: 'To Do',
                    owner: manager._id,
                    assignee: [manager._id],
                    project: testProject._id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });

                // Update to assign to staff2
                const updateData = {
                    owner: staff2._id,
                    assignee: [staff2._id, manager._id] // Manager remains participant
                };

                const updatedTask = await taskService.updateTask(
                    task._id,
                    updateData,
                    manager._id.toString()
                );

                // Handle populated owner (could be ObjectId or populated object)
                const ownerId = typeof updatedTask.owner === 'object' && updatedTask.owner._id
                    ? updatedTask.owner._id.toString()
                    : updatedTask.owner.toString();
                expect(ownerId).toBe(staff2._id.toString());

                // Handle populated assignees
                const assigneeIds = updatedTask.assignee.map(a =>
                    typeof a === 'object' && a._id ? a._id.toString() : a.toString()
                );
                expect(assigneeIds).toContain(staff2._id.toString());
                expect(assigneeIds).toContain(manager._id.toString());
            });

            it('should keep prior owner as participant (not owner)', async () => {
                const task = await Task.create({
                    title: 'Test Task',
                    description: 'Test description',
                    priority: 5,
                    status: 'To Do',
                    owner: manager._id,
                    assignee: [manager._id],
                    project: testProject._id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });

                const updateData = {
                    owner: staff1._id,
                    assignee: [staff1._id, manager._id]
                };

                const updatedTask = await taskService.updateTask(
                    task._id,
                    updateData,
                    manager._id.toString()
                );

                // Handle populated owner
                const ownerId = typeof updatedTask.owner === 'object' && updatedTask.owner._id
                    ? updatedTask.owner._id.toString()
                    : updatedTask.owner.toString();

                // Manager is no longer owner
                expect(ownerId).not.toBe(manager._id.toString());
                expect(ownerId).toBe(staff1._id.toString());

                // But manager is still a participant
                const assigneeIds = updatedTask.assignee.map(a =>
                    typeof a === 'object' && a._id ? a._id.toString() : a.toString()
                );
                expect(assigneeIds).toContain(manager._id.toString());
            });

            it('should keep task visible to prior owner after ownership transfer', async () => {
                const task = await Task.create({
                    title: 'Test Task',
                    description: 'Test description',
                    priority: 5,
                    status: 'To Do',
                    owner: manager._id,
                    assignee: [manager._id],
                    project: testProject._id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });

                // Transfer ownership
                await taskService.updateTask(
                    task._id,
                    {
                        owner: staff2._id,
                        assignee: [staff2._id, manager._id]
                    },
                    manager._id.toString()
                );

                // Query tasks where manager is assigned
                const managerTasks = await Task.find({
                    assignee: manager._id
                });

                expect(managerTasks).toHaveLength(1);
                expect(managerTasks[0]._id.toString()).toBe(task._id.toString());
            });

            it('should prevent ownership transfer on archived task', async () => {
                // Create and archive a task
                const task = await Task.create({
                    title: 'Archived Task',
                    description: 'This task is archived',
                    priority: 5,
                    status: 'To Do',
                    owner: manager._id,
                    assignee: [manager._id],
                    project: testProject._id,
                    archived: true,
                    archivedAt: new Date(),
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });

                // Attempt to transfer ownership should fail
                await expect(
                    taskService.assignOwner({
                        taskId: task._id,
                        assigneeInput: staff1._id,
                        actingUser: manager
                    })
                ).rejects.toThrow('This task is no longer active');
            });
        });

        describe('TSK-021: Validation - Must Always Have Owner', () => {
            it('should reject null owner', async () => {
                const taskData = {
                    title: 'Test Task',
                    description: 'Test description',
                    priority: 5,
                    status: 'To Do',
                    owner: null,
                    assignee: [staff1._id],
                    project: testProject._id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };

                await expect(taskService.createTask(taskData, manager._id))
                    .rejects
                    .toThrow(/owner/i);
            });

            it.skip('should reject empty assignee array if no owner set', async () => {
                const taskData = {
                    title: 'Test Task',
                    description: 'Test description',
                    priority: 5,
                    status: 'To Do',
                    assignee: [],
                    project: testProject._id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };

                await expect(taskService.createTask(taskData, manager._id))
                    .rejects
                    .toThrow();
            });

            it('should reject update that removes all assignees', async () => {
                const task = await Task.create({
                    title: 'Test Task',
                    description: 'Test description',
                    priority: 5,
                    status: 'To Do',
                    owner: manager._id,
                    assignee: [manager._id, staff1._id],
                    project: testProject._id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });

                const updateData = {
                    assignee: []
                };

                await expect(
                    taskService.updateTask(task._id, updateData, manager._id.toString())
                ).rejects.toThrow('At least one assignee is required');
            });
        });

        describe('Department-Agnostic Assignment', () => {
            it('should allow assigning users from different departments', async () => {
                // Verify users are from different departments
                expect(manager.department).toBe('it');
                expect(staff2.department).toBe('hr');
                expect(staff3.department).toBe('sales');

                const taskData = {
                    title: 'Cross-department Task',
                    description: 'Task with assignees from multiple departments',
                    priority: 5,
                    status: 'To Do',
                    owner: manager._id,
                    assignee: [manager._id, staff2._id, staff3._id],
                    project: testProject._id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };

                const task = await taskService.createTask(taskData, manager._id);

                expect(task.assignee).toHaveLength(3);
                const assigneeIds = task.assignee.map(a =>
                    typeof a === 'object' && a._id ? a._id.toString() : a.toString()
                );
                expect(assigneeIds).toContain(manager._id.toString());
                expect(assigneeIds).toContain(staff2._id.toString());
                expect(assigneeIds).toContain(staff3._id.toString());
            });

            it('should allow transferring ownership across departments', async () => {
                const task = await Task.create({
                    title: 'Test Task',
                    description: 'Test description',
                    priority: 5,
                    status: 'To Do',
                    owner: manager._id, // IT department
                    assignee: [manager._id],
                    project: testProject._id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });

                // Transfer to staff3 in sales department
                const updateData = {
                    owner: staff3._id,
                    assignee: [staff3._id, manager._id]
                };

                const updatedTask = await taskService.updateTask(
                    task._id,
                    updateData,
                    manager._id.toString()
                );

                // Handle populated owner
                const ownerId = typeof updatedTask.owner === 'object' && updatedTask.owner._id
                    ? updatedTask.owner._id.toString()
                    : updatedTask.owner.toString();
                expect(ownerId).toBe(staff3._id.toString());

                // Verify departments are different
                const newOwner = await User.findById(staff3._id);
                const oldOwner = await User.findById(manager._id);
                expect(newOwner.department).not.toBe(oldOwner.department);
            });
        });
    });
});
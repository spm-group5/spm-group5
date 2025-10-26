import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import Task from '../models/task.model.js';
import Subtask from '../models/subtask.model.js';
import taskService from './task.services.js';

// Mock the dependencies
vi.mock('../models/project.model.js', () => ({
  default: {
    findById: vi.fn()
  }
}));

vi.mock('../models/user.model.js', () => ({
  default: {
    findById: vi.fn()
  }
}));

describe('Task Service - Time Calculation', () => {
  let mockTaskId;
  let mockProjectId;
  let mockOwnerId;
  let mockUserId;

    beforeEach(async () => {
        await Task.deleteMany({});
    await Subtask.deleteMany({});

    mockTaskId = new mongoose.Types.ObjectId();
    mockProjectId = new mongoose.Types.ObjectId();
    mockOwnerId = new mongoose.Types.ObjectId();
    mockUserId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await Task.deleteMany({});
    await Subtask.deleteMany({});
  });

  describe('Time Validation - 15 Minute Increments', () => {
    it('should accept valid 15-minute increment time formats', async () => {
      const validTimes = [
        '15 minutes',
        '30 minutes', 
        '45 minutes',
        '1 hour',
        '1 hour 15 minutes',
        '1 hour 30 minutes',
        '1 hour 45 minutes',
        '2 hours',
        '2 hours 15 minutes',
        '2 hours 30 minutes',
        '2 hours 45 minutes',
        '3 hours'
      ];

      for (const time of validTimes) {
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
      }
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
            // Create a manager user who can assign additional users
            const managerUser = await User.create({
                username: 'manager@example.com',
                roles: ['manager'],
                department: 'it',
                hashed_password: 'password123'
            });

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

            const task = await taskService.createTask(taskData, managerUser._id);

            expect(task.assignee).toHaveLength(2);
            expect(task.assignee.map(a => a.toString())).toContain(managerUser._id.toString());
            expect(task.assignee.map(a => a.toString())).toContain(otherUser._id.toString());
        });

        it('should throw error when more than 5 assignees', async () => {
            // Create a manager user who can assign additional users
            const managerUser = await User.create({
                username: 'manager2@example.com',
                roles: ['manager'],
                department: 'it',
                hashed_password: 'password123'
            });

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

            // Manager creates task with 5 additional assignees + themselves = 6 total (exceeds limit)
            await expect(taskService.createTask(taskData, managerUser._id))
                .rejects.toThrow('Maximum of 5 assignees allowed');
        });

        it('should throw error for empty title', async () => {
            const taskData = {
          title: 'Test Task',
          project: mockProjectId,
          timeTaken: time
        };

        // Mock project exists
        const { default: Project } = await import('../models/project.model.js');
        Project.findById.mockResolvedValue({ status: 'Active' });

        const task = await taskService.createTask(taskData, mockUserId);
        expect(task.timeTaken).toBe(time);
      }
    });

    it('should reject invalid time formats', async () => {
      const invalidTimes = [
        '10 minutes', // Not 15-minute increment
        '20 minutes', // Not 15-minute increment
        '1 hour 5 minutes', // Not 15-minute increment
        '1 hour 10 minutes', // Not 15-minute increment
        '1 hour 20 minutes', // Not 15-minute increment
        '1 hour 25 minutes', // Not 15-minute increment
        '1 hour 35 minutes', // Not 15-minute increment
        '1 hour 40 minutes', // Not 15-minute increment
        '1 hour 50 minutes', // Not 15-minute increment
        '1 hour 55 minutes', // Not 15-minute increment
        '2 hours 5 minutes', // Not 15-minute increment
        'invalid format',
        '1.5 hours',
        '90 minutes' // Should be "1 hour 30 minutes"
      ];

      for (const time of invalidTimes) {
            const taskData = {
          title: 'Test Task',
          project: mockProjectId,
          timeTaken: time
        };

        // Mock project exists
        const { default: Project } = await import('../models/project.model.js');
        Project.findById.mockResolvedValue({ status: 'Active' });

        await expect(taskService.createTask(taskData, mockUserId)).rejects.toThrow();
      }
    });
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

  describe('Total Time Calculation', () => {
    it('should calculate total time as task time + subtask times', async () => {
      // Create a task with time
            const taskData = {
        title: 'Test Task',
        project: mockProjectId,
        timeTaken: '1 hour'
      };

      // Mock project exists
      const { default: Project } = await import('../models/project.model.js');
      Project.findById.mockResolvedValue({ status: 'Active' });

      const task = await taskService.createTask(taskData, mockUserId);

      // Create subtasks with time
      const subtask1 = new Subtask({
        title: 'Subtask 1',
        parentTaskId: task._id,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: '30 minutes'
      });
      await subtask1.save();

      const subtask2 = new Subtask({
        title: 'Subtask 2',
        parentTaskId: task._id,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: '45 minutes'
      });
      await subtask2.save();

      const subtask3 = new Subtask({
        title: 'Subtask 3',
        parentTaskId: task._id,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: '15 minutes'
      });
      await subtask3.save();

      // Test the calculation
      const totalTime = await taskService.calculateTotalTime(task._id);
      expect(totalTime).toBe('2 hours 30 minutes'); // 1 hour + 1 hour 30 minutes
    });

    it('should handle task with no time and subtasks with time', async () => {
            const taskData = {
        title: 'Test Task',
        project: mockProjectId,
        timeTaken: ''
      };

      // Mock project exists
      const { default: Project } = await import('../models/project.model.js');
      Project.findById.mockResolvedValue({ status: 'Active' });

      const task = await taskService.createTask(taskData, mockUserId);

      // Create subtasks with time
      const subtask1 = new Subtask({
        title: 'Subtask 1',
        parentTaskId: task._id,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: '1 hour'
      });
      await subtask1.save();

      const subtask2 = new Subtask({
        title: 'Subtask 2',
        parentTaskId: task._id,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: '30 minutes'
      });
      await subtask2.save();

      const totalTime = await taskService.calculateTotalTime(task._id);
      expect(totalTime).toBe('1 hour 30 minutes');
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
            )).rejects.toThrow('Only Manager or Admin can modify task assignees');
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

    it('should handle task with time and no subtasks', async () => {
            const taskData = {
        title: 'Test Task',
        project: mockProjectId,
        timeTaken: '2 hours'
      };

      // Mock project exists
      const { default: Project } = await import('../models/project.model.js');
      Project.findById.mockResolvedValue({ status: 'Active' });

      const task = await taskService.createTask(taskData, mockUserId);
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

      const totalTime = await taskService.calculateTotalTime(task._id);
      expect(totalTime).toBe('2 hours');
    });

    it('should handle task with no time and no subtasks', async () => {
            const taskData = {
        title: 'Test Task',
        project: mockProjectId,
        timeTaken: ''
      };
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

      // Mock project exists
      const { default: Project } = await import('../models/project.model.js');
      Project.findById.mockResolvedValue({ status: 'Active' });

      const task = await taskService.createTask(taskData, mockUserId);

      const totalTime = await taskService.calculateTotalTime(task._id);
      expect(totalTime).toBe('Not specified');
    });
  });

  describe('Time Format Conversion', () => {
    it('should convert minutes to hours and minutes format', () => {
      expect(taskService.formatTime(15)).toBe('15 minutes');
      expect(taskService.formatTime(30)).toBe('30 minutes');
      expect(taskService.formatTime(45)).toBe('45 minutes');
      expect(taskService.formatTime(60)).toBe('1 hour');
      expect(taskService.formatTime(75)).toBe('1 hour 15 minutes');
      expect(taskService.formatTime(90)).toBe('1 hour 30 minutes');
      expect(taskService.formatTime(105)).toBe('1 hour 45 minutes');
      expect(taskService.formatTime(120)).toBe('2 hours');
      expect(taskService.formatTime(135)).toBe('2 hours 15 minutes');
    });

    it('should parse time string to minutes', () => {
      expect(taskService.parseTimeToMinutes('15 minutes')).toBe(15);
      expect(taskService.parseTimeToMinutes('30 minutes')).toBe(30);
      expect(taskService.parseTimeToMinutes('45 minutes')).toBe(45);
      expect(taskService.parseTimeToMinutes('1 hour')).toBe(60);
      expect(taskService.parseTimeToMinutes('1 hour 15 minutes')).toBe(75);
      expect(taskService.parseTimeToMinutes('1 hour 30 minutes')).toBe(90);
      expect(taskService.parseTimeToMinutes('1 hour 45 minutes')).toBe(105);
      expect(taskService.parseTimeToMinutes('2 hours')).toBe(120);
      expect(taskService.parseTimeToMinutes('2 hours 15 minutes')).toBe(135);
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
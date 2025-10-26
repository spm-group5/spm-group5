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

vi.mock('../models/task.model.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    deleteMany: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../models/subtask.model.js', () => ({
  default: {
    find: vi.fn(),
    deleteMany: vi.fn().mockResolvedValue({})
  }
}));

describe('Task Service - Time Logging', () => {
    let testUser;
    let testProject;
  let mockUserId;
  let mockProjectId;

    beforeEach(async () => {
        await Task.deleteMany({});
    await Subtask.deleteMany({});

    mockUserId = new mongoose.Types.ObjectId();
    mockProjectId = new mongoose.Types.ObjectId();

    testUser = {
      _id: mockUserId,
            username: 'testuser@example.com',
            roles: ['staff'],
            department: 'it',
            hashed_password: 'password123'
    };

    testProject = {
      _id: mockProjectId,
            name: 'Test Project',
            description: 'Test project description',
      owner: testUser._id,
      status: 'In Progress'
    };
        });

  afterEach(async () => {
    await Task.deleteMany({});
    await Subtask.deleteMany({});
    });

    describe('createTask', () => {
        it('should create a task with valid data', async () => {
            const taskData = {
                title: 'New Task',
                description: 'Task description',
        project: mockProjectId,
        owner: mockUserId,
        timeTaken: '1 hour'
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Task.create.mockResolvedValue(mockTask);

      const result = await taskService.createTask(taskData, mockUserId);

      expect(Task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Task',
          timeTaken: '1 hour'
        })
      );
      expect(result).toEqual(mockTask);
    });

    it('should create task with valid time formats', async () => {
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
            const taskData = {
          title: 'Test Task',
          project: mockProjectId,
          timeTaken: time
        };

        const mockTask = {
          _id: new mongoose.Types.ObjectId(),
          ...taskData,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        Task.create.mockResolvedValue(mockTask);

        const result = await taskService.createTask(taskData, mockUserId);

        expect(Task.create).toHaveBeenCalledWith(
          expect.objectContaining({ timeTaken: time })
        );
        expect(result.timeTaken).toBe(time);
      }
    });

    it('should reject invalid time formats', async () => {
      const invalidTimes = [
        '10 minutes', // Not 15-minute increment
        '20 minutes', // Not 15-minute increment
        '25 minutes', // Not 15-minute increment
        '1 hour 10 minutes', // Not 15-minute increment
        '1 hour 20 minutes', // Not 15-minute increment
        '1 hour 25 minutes'  // Not 15-minute increment
      ];

      for (const time of invalidTimes) {
            const taskData = {
          title: 'Test Task',
          project: mockProjectId,
          timeTaken: time
        };

        await expect(taskService.createTask(taskData, mockUserId))
          .rejects
          .toThrow('Invalid time format');
      }
        });
    });

    describe('updateTask', () => {
    it('should update task with valid time format', async () => {
      const taskId = new mongoose.Types.ObjectId();
            const updateData = {
        title: 'Updated Task',
        timeTaken: '2 hours 30 minutes'
      };

      const mockUpdatedTask = {
        _id: taskId,
        ...updateData,
        updatedAt: new Date()
      };

      Task.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

      const result = await taskService.updateTask(taskId, updateData, mockUserId);

      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ timeTaken: '2 hours 30 minutes' }),
        { new: true }
      );
      expect(result).toEqual(mockUpdatedTask);
    });
  });

  describe('calculateTotalTime', () => {
    it('should calculate total time for task and subtasks', async () => {
      const taskId = new mongoose.Types.ObjectId();
      const mockTask = {
        _id: taskId,
        timeTaken: '1 hour 30 minutes'
      };

      const mockSubtasks = [
        { timeTaken: '45 minutes' },
        { timeTaken: '1 hour' },
        { timeTaken: '15 minutes' }
      ];

      Task.findById.mockResolvedValue(mockTask);
      Subtask.find.mockResolvedValue(mockSubtasks);

      const result = await taskService.calculateTotalTime(taskId);

      expect(result).toBe('3 hours 30 minutes');
    });

    it('should handle task with no time taken', async () => {
      const taskId = new mongoose.Types.ObjectId();
      const mockTask = {
        _id: taskId,
        timeTaken: null
      };

      const mockSubtasks = [
        { timeTaken: '1 hour' },
        { timeTaken: '30 minutes' }
      ];

      Task.findById.mockResolvedValue(mockTask);
      Subtask.find.mockResolvedValue(mockSubtasks);

      const result = await taskService.calculateTotalTime(taskId);

      expect(result).toBe('1 hour 30 minutes');
            });
        });

  describe('Time Format Utilities', () => {
    it('should parse time to minutes correctly', () => {
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

    it('should format minutes to time string correctly', () => {
      expect(taskService.formatTime(15)).toBe('15 minutes');
      expect(taskService.formatTime(30)).toBe('30 minutes');
      expect(taskService.formatTime(45)).toBe('45 minutes');
      expect(taskService.formatTime(60)).toBe('1 hour');
      expect(taskService.formatTime(75)).toBe('1 hour 15 minutes');
      expect(taskService.formatTime(90)).toBe('1 hour 30 minutes');
      expect(taskService.formatTime(105)).toBe('1 hour 45 minutes');
      expect(taskService.formatTime(120)).toBe('2 hours');
      expect(taskService.formatTime(135)).toBe('2 hours 15 minutes');
      expect(taskService.formatTime(0)).toBe('Not specified');
        });
    });
});
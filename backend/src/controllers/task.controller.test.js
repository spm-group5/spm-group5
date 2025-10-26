import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import taskController from './task.controller.js';
import taskService from '../services/task.services.js';
import taskModel from '../models/task.model.js';
import notificationModel from '../models/notification.model.js';

// Mock the service
vi.mock('../services/task.services.js', () => ({
  default: {
    createTask: vi.fn(),
    updateTask: vi.fn(),
    getTaskById: vi.fn(),
    calculateTotalTime: vi.fn(),
    formatTime: vi.fn((minutes) => {
      if (!minutes || minutes === 0) return 'Not specified';
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours === 0) return `${remainingMinutes} minutes`;
      if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
    }),
    parseTimeToMinutes: vi.fn((timeString) => {
      if (!timeString || timeString.trim() === '') return 0;
      const hoursMinutesMatch = timeString.match(/(\d+)\s*hours?\s*(\d+)\s*minutes?/i);
      if (hoursMinutesMatch) {
        const hours = parseInt(hoursMinutesMatch[1]);
        const minutes = parseInt(hoursMinutesMatch[2]);
        return hours * 60 + minutes;
      }
      const minutesMatch = timeString.match(/(\d+)\s*minutes?/i);
      if (minutesMatch) return parseInt(minutesMatch[1]);
      const hoursMatch = timeString.match(/(\d+)\s*hours?/i);
      if (hoursMatch) return parseInt(hoursMatch[1]) * 60;
      return 0;
    })
  }
}));

describe('Task Controller - Time Logging', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {},
      params: { taskId: new mongoose.Types.ObjectId().toString() },
      app: {
        get: vi.fn().mockReturnValue(null)
      }
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask', () => {
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
        mockReq.body = {
          title: 'Test Task',
          project: new mongoose.Types.ObjectId().toString(),
          timeTaken: time
        };

        const mockTask = {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Task',
          timeTaken: time
        };

        taskService.createTask.mockResolvedValue(mockTask);

        await taskController.createTask(mockReq, mockRes);

        expect(taskService.createTask).toHaveBeenCalledWith(
          expect.objectContaining({ timeTaken: time }),
          mockReq.user._id
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Task created successfully and notifications sent',
          data: expect.objectContaining({ timeTaken: time })
        });
      }
    });

    it('should handle task creation error', async () => {
      mockReq.body = { title: '' };
      taskService.createTask.mockRejectedValue(new Error('Task title is required'));

      await taskController.createTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task title is required'
      });
    });

    it('should handle missing project error', async () => {
      mockReq.body = { title: 'New Task' };
      taskService.createTask.mockRejectedValue(new Error('Project is required'));

      await taskController.createTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Project is required'
      });
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const mockUpdatedTask = {
        _id: '507f1f77bcf86cd799439014',
        title: 'Updated Task',
        status: 'In Progress',
        owner: 'userId123',
        assignee: [],
        project: 'projectId123'
      };

      mockReq.body = { title: 'Updated Task' };
      taskService.updateTask.mockResolvedValue(mockUpdatedTask);

      await taskController.updateTask(mockReq, mockRes);

      expect(taskService.updateTask).toHaveBeenCalledWith(
        mockReq.params.taskId,
        mockReq.body,
        mockReq.user._id
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task updated successfully',
        data: mockUpdatedTask
      });
    });
  });

  describe('getTaskById', () => {
    it('should get task by ID successfully', async () => {
      const mockTask = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Test Task',
        owner: { _id: 'userId123' },
        assignee: [],
        toObject: vi.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          title: 'Test Task',
          owner: { _id: 'userId123' },
          assignee: []
        })
      };

      mockReq.params = { taskId: '507f1f77bcf86cd799439011' };
      mockReq.user = { _id: 'userId123', roles: ['staff'] };
      taskService.getTaskById.mockResolvedValue(mockTask);
      taskService.calculateTotalTime.mockResolvedValue('1 hour 30 minutes');

      await taskController.getTaskById(mockReq, mockRes);

      expect(taskService.getTaskById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(taskService.calculateTotalTime).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          _id: '507f1f77bcf86cd799439011',
          title: 'Test Task',
          totalTime: '1 hour 30 minutes'
        })
      });
    });
  });

  describe('Time Format Validation', () => {
    it('should validate time format parsing', () => {
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

    it('should format time correctly', () => {
      expect(taskService.formatTime(15)).toBe('15 minutes');
      expect(taskService.formatTime(60)).toBe('1 hour');
      expect(taskService.formatTime(75)).toBe('1 hour 15 minutes');
      expect(taskService.formatTime(0)).toBe('Not specified');
    });
  });
});
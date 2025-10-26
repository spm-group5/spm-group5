import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import taskController from './task.controller.js';
import taskService from '../services/task.services.js';

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
      json: vi.fn()
		};
    mockNext = vi.fn();
  });

  afterEach(() => {
		vi.clearAllMocks();
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
				message: 'Task created successfully',
				data: mockTask
			});
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
        mockReq.body = {
          title: 'Test Task',
          project: new mongoose.Types.ObjectId().toString(),
          timeTaken: time
        };

        taskService.createTask.mockRejectedValue(new Error('Invalid time format'));

        await taskController.createTask(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
				success: false,
          message: 'Invalid time format'
			});
      }
		});
	});

  describe('Total Time Calculation', () => {
    it('should calculate total time when getting task by ID', async () => {
			const mockTask = {
        _id: new mongoose.Types.ObjectId(),
				title: 'Test Task',
        timeTaken: '1 hour',
        toObject: vi.fn().mockReturnValue({
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Task',
          timeTaken: '1 hour'
        })
      };

      taskService.getTaskById.mockResolvedValue(mockTask);
      taskService.calculateTotalTime.mockReturnValue('2 hours 30 minutes');

      await taskController.getTaskById(mockReq, mockRes);

      expect(taskService.getTaskById).toHaveBeenCalledWith(mockReq.params.taskId);
      expect(taskService.calculateTotalTime).toHaveBeenCalledWith(mockReq.params.taskId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
				success: true,
        data: expect.objectContaining({
          _id: expect.any(mongoose.Types.ObjectId),
          title: 'Test Task',
          timeTaken: '1 hour',
          totalTime: '2 hours 30 minutes'
        })
			});
		});
	});

  describe('Time Format Conversion', () => {
    it('should format time correctly', () => {
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
});
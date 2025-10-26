import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import subtaskController from './subtask.controller.js';
import subtaskService from '../services/subtask.services.js';

// Mock the service
vi.mock('../services/subtask.services.js', () => ({
  default: {
    createSubtask: vi.fn(),
    updateSubtask: vi.fn(),
    getSubtaskById: vi.fn(),
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
    }),
    isValidTimeFormat: vi.fn((timeString) => {
      if (!timeString || timeString.trim() === '') return true;
      
      // Check for "X minutes" format (must be 15, 30, or 45)
      const minutesMatch = timeString.match(/^(\d+)\s*minutes?$/i);
      if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1]);
        return minutes === 15 || minutes === 30 || minutes === 45;
      }
      
      // Check for "X hours" format
      const hoursMatch = timeString.match(/^(\d+)\s*hours?$/i);
      if (hoursMatch) {
        return true; // Any number of hours is valid
      }
      
      // Check for "X hours Y minutes" format (Y must be 15, 30, or 45)
      const hoursMinutesMatch = timeString.match(/^(\d+)\s*hours?\s*(\d+)\s*minutes?$/i);
      if (hoursMinutesMatch) {
        const minutes = parseInt(hoursMinutesMatch[2]);
        return minutes === 15 || minutes === 30 || minutes === 45;
      }
      
      return false;
    })
  }
}));

describe('Subtask Controller - Time Logging', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {},
      params: { subtaskId: new mongoose.Types.ObjectId().toString() }
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
          title: 'Test Subtask',
          parentTaskId: new mongoose.Types.ObjectId().toString(),
          projectId: new mongoose.Types.ObjectId().toString(),
          ownerId: new mongoose.Types.ObjectId().toString(),
          timeTaken: time
        };

        const mockSubtask = {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Subtask',
          timeTaken: time
        };

        subtaskService.createSubtask.mockResolvedValue(mockSubtask);

        await subtaskController.createSubtask(mockReq, mockRes);

        expect(subtaskService.createSubtask).toHaveBeenCalledWith(
          expect.objectContaining({ timeTaken: time })
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Subtask created successfully',
          data: mockSubtask
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
          title: 'Test Subtask',
          parentTaskId: new mongoose.Types.ObjectId().toString(),
          projectId: new mongoose.Types.ObjectId().toString(),
          ownerId: new mongoose.Types.ObjectId().toString(),
          timeTaken: time
        };

        subtaskService.createSubtask.mockRejectedValue(new Error('Invalid time format'));

        await subtaskController.createSubtask(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid time format'
        });
      }
    });

    it('should accept empty timeTaken field', async () => {
      mockReq.body = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId().toString(),
        projectId: new mongoose.Types.ObjectId().toString(),
        ownerId: new mongoose.Types.ObjectId().toString(),
        timeTaken: ''
      };

      const mockSubtask = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test Subtask',
        timeTaken: ''
      };

      subtaskService.createSubtask.mockResolvedValue(mockSubtask);

      await subtaskController.createSubtask(mockReq, mockRes);

      expect(subtaskService.createSubtask).toHaveBeenCalledWith(
        expect.objectContaining({ timeTaken: '' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should accept null timeTaken field', async () => {
      mockReq.body = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId().toString(),
        projectId: new mongoose.Types.ObjectId().toString(),
        ownerId: new mongoose.Types.ObjectId().toString(),
        timeTaken: null
      };

      const mockSubtask = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test Subtask',
        timeTaken: null
      };

      subtaskService.createSubtask.mockResolvedValue(mockSubtask);

      await subtaskController.createSubtask(mockReq, mockRes);

      expect(subtaskService.createSubtask).toHaveBeenCalledWith(
        expect.objectContaining({ timeTaken: null })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Time Format Conversion', () => {
    it('should format time correctly', () => {
      expect(subtaskService.formatTime(15)).toBe('15 minutes');
      expect(subtaskService.formatTime(30)).toBe('30 minutes');
      expect(subtaskService.formatTime(45)).toBe('45 minutes');
      expect(subtaskService.formatTime(60)).toBe('1 hour');
      expect(subtaskService.formatTime(75)).toBe('1 hour 15 minutes');
      expect(subtaskService.formatTime(90)).toBe('1 hour 30 minutes');
      expect(subtaskService.formatTime(105)).toBe('1 hour 45 minutes');
      expect(subtaskService.formatTime(120)).toBe('2 hours');
      expect(subtaskService.formatTime(135)).toBe('2 hours 15 minutes');
    });

    it('should parse time string to minutes', () => {
      expect(subtaskService.parseTimeToMinutes('15 minutes')).toBe(15);
      expect(subtaskService.parseTimeToMinutes('30 minutes')).toBe(30);
      expect(subtaskService.parseTimeToMinutes('45 minutes')).toBe(45);
      expect(subtaskService.parseTimeToMinutes('1 hour')).toBe(60);
      expect(subtaskService.parseTimeToMinutes('1 hour 15 minutes')).toBe(75);
      expect(subtaskService.parseTimeToMinutes('1 hour 30 minutes')).toBe(90);
      expect(subtaskService.parseTimeToMinutes('1 hour 45 minutes')).toBe(105);
      expect(subtaskService.parseTimeToMinutes('2 hours')).toBe(120);
      expect(subtaskService.parseTimeToMinutes('2 hours 15 minutes')).toBe(135);
    });

    it('should validate 15-minute increments', () => {
      expect(subtaskService.isValidTimeFormat('15 minutes')).toBe(true);
      expect(subtaskService.isValidTimeFormat('30 minutes')).toBe(true);
      expect(subtaskService.isValidTimeFormat('45 minutes')).toBe(true);
      expect(subtaskService.isValidTimeFormat('1 hour')).toBe(true);
      expect(subtaskService.isValidTimeFormat('1 hour 15 minutes')).toBe(true);
      expect(subtaskService.isValidTimeFormat('1 hour 30 minutes')).toBe(true);
      expect(subtaskService.isValidTimeFormat('1 hour 45 minutes')).toBe(true);
      expect(subtaskService.isValidTimeFormat('2 hours')).toBe(true);
      expect(subtaskService.isValidTimeFormat('2 hours 15 minutes')).toBe(true);

      expect(subtaskService.isValidTimeFormat('10 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('20 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1 hour 5 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1 hour 10 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1 hour 20 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1 hour 25 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1 hour 35 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1 hour 40 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1 hour 50 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1 hour 55 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('2 hours 5 minutes')).toBe(false);
      expect(subtaskService.isValidTimeFormat('invalid format')).toBe(false);
      expect(subtaskService.isValidTimeFormat('1.5 hours')).toBe(false);
      expect(subtaskService.isValidTimeFormat('90 minutes')).toBe(false);
    });
  });
});

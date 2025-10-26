import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import Subtask from '../models/subtask.model.js';
import subtaskService from './subtask.services.js';

// Mock the dependencies
vi.mock('../models/task.model.js', () => ({
  default: {
    findById: vi.fn()
  }
}));

vi.mock('../models/project.model.js', () => ({
  default: {
    findById: vi.fn()
  }
}));

describe('Subtask Service - Time Validation', () => {
  let mockTaskId;
  let mockProjectId;
  let mockOwnerId;

  beforeEach(async () => {
    await Subtask.deleteMany({});

    mockTaskId = new mongoose.Types.ObjectId();
    mockProjectId = new mongoose.Types.ObjectId();
    mockOwnerId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
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
        const subtaskData = {
          title: 'Test Subtask',
          parentTaskId: mockTaskId,
          projectId: mockProjectId,
          ownerId: mockOwnerId,
          timeTaken: time
        };

        // Mock parent task exists
        const { default: Task } = await import('../models/task.model.js');
        Task.findById.mockResolvedValue({ _id: mockTaskId });

        // Mock project exists
        const { default: Project } = await import('../models/project.model.js');
        Project.findById.mockResolvedValue({ _id: mockProjectId });

        const subtask = await subtaskService.createSubtask(subtaskData);
        expect(subtask.timeTaken).toBe(time);
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
        const subtaskData = {
          title: 'Test Subtask',
          parentTaskId: mockTaskId,
          projectId: mockProjectId,
          ownerId: mockOwnerId,
          timeTaken: time
        };

        // Mock parent task exists
        const { default: Task } = await import('../models/task.model.js');
        Task.findById.mockResolvedValue({ _id: mockTaskId });

        // Mock project exists
        const { default: Project } = await import('../models/project.model.js');
        Project.findById.mockResolvedValue({ _id: mockProjectId });

        await expect(subtaskService.createSubtask(subtaskData)).rejects.toThrow();
      }
    });

    it('should accept empty timeTaken field', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: ''
      };

      // Mock parent task exists
      const { default: Task } = await import('../models/task.model.js');
      Task.findById.mockResolvedValue({ _id: mockTaskId });

      // Mock project exists
      const { default: Project } = await import('../models/project.model.js');
      Project.findById.mockResolvedValue({ _id: mockProjectId });

      const subtask = await subtaskService.createSubtask(subtaskData);
      expect(subtask.timeTaken).toBe('');
    });

    it('should accept null timeTaken field', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: null
      };

      // Mock parent task exists
      const { default: Task } = await import('../models/task.model.js');
      Task.findById.mockResolvedValue({ _id: mockTaskId });

      // Mock project exists
      const { default: Project } = await import('../models/project.model.js');
      Project.findById.mockResolvedValue({ _id: mockProjectId });

      const subtask = await subtaskService.createSubtask(subtaskData);
      expect(subtask.timeTaken).toBe(null);
    });
  });

  describe('Time Format Conversion', () => {
    it('should convert minutes to hours and minutes format', () => {
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
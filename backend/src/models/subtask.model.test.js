import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Subtask from './subtask.model.js';

describe('Subtask Model', () => {
  beforeEach(async () => {
    await Subtask.deleteMany({});
  });

  afterEach(async () => {
    await Subtask.deleteMany({});
  });

  describe('Basic Subtask Creation', () => {
    it('should create a subtask with required fields', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.title).toBe('Test Subtask');
      expect(savedSubtask.status).toBe('To Do');
      expect(savedSubtask.priority).toBe(5);
    });

    it('should reject subtask without required fields', async () => {
      const subtaskData = {
        title: 'Test Subtask'
        // Missing required fields
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });
  });

  describe('Time Taken Field - 15 Minute Increment Validation', () => {
    it('should accept valid 15-minute increment values', async () => {
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
          parentTaskId: new mongoose.Types.ObjectId(),
          projectId: new mongoose.Types.ObjectId(),
          ownerId: new mongoose.Types.ObjectId(),
          timeTaken: time
        };

        const subtask = new Subtask(subtaskData);
        const savedSubtask = await subtask.save();
        expect(savedSubtask.timeTaken).toBe(time);
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
          parentTaskId: new mongoose.Types.ObjectId(),
          projectId: new mongoose.Types.ObjectId(),
          ownerId: new mongoose.Types.ObjectId(),
          timeTaken: time
        };

        const subtask = new Subtask(subtaskData);
        await expect(subtask.save()).rejects.toThrow();
      }
    });

    it('should accept empty timeTaken field', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        timeTaken: ''
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();
      expect(savedSubtask.timeTaken).toBe('');
    });

    it('should accept null timeTaken field', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        timeTaken: null
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();
      expect(savedSubtask.timeTaken).toBe(null);
    });
  });

  describe('Time Taken Field - Legacy Tests', () => {
    it('should save subtask without timeTaken', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.timeTaken).toBeUndefined();
    });

    it('should trim whitespace from timeTaken', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        timeTaken: '  1 hour  '
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.timeTaken).toBe('1 hour');
    });

    it('should reject timeTaken exceeding max length', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        timeTaken: 'a'.repeat(101)
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });
  });

  describe('Archived Field', () => {
    it('should default archived to false', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.archived).toBe(false);
      expect(savedSubtask.archivedAt).toBe(null);
    });

    it('should set archivedAt when archived is true', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        archived: true
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.archived).toBe(true);
      expect(savedSubtask.archivedAt).toBeInstanceOf(Date);
    });
  });
});
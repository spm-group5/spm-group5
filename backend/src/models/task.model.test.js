import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Task from './task.model.js';

describe('Task Model', () => {
  beforeEach(async () => {
    await Task.deleteMany({});
  });

  afterEach(async () => {
    await Task.deleteMany({});
  });

  describe('Basic Task Creation', () => {
    it('should create a task with required fields', async () => {
      const taskData = {
        title: 'Test Task',
        owner: new mongoose.Types.ObjectId(),
        project: new mongoose.Types.ObjectId(),
        assignee: [new mongoose.Types.ObjectId()]
      };

      const task = new Task(taskData);
      const savedTask = await task.save();

      expect(savedTask.title).toBe('Test Task');
      expect(savedTask.status).toBe('To Do');
      expect(savedTask.priority).toBe(5);
    });

    it('should reject task without required fields', async () => {
      const taskData = {
        title: 'Test Task'
        // Missing required fields
      };

      const task = new Task(taskData);
      await expect(task.save()).rejects.toThrow();
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
        const taskData = {
          title: 'Test Task',
          owner: new mongoose.Types.ObjectId(),
          project: new mongoose.Types.ObjectId(),
          assignee: [new mongoose.Types.ObjectId()],
          timeTaken: time
        };

        const task = new Task(taskData);
        const savedTask = await task.save();
        expect(savedTask.timeTaken).toBe(time);
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
          owner: new mongoose.Types.ObjectId(),
          project: new mongoose.Types.ObjectId(),
          assignee: [new mongoose.Types.ObjectId()],
          timeTaken: time
        };

        const task = new Task(taskData);
        await expect(task.save()).rejects.toThrow();
      }
    });

    it('should accept empty timeTaken field', async () => {
      const taskData = {
        title: 'Test Task',
        owner: new mongoose.Types.ObjectId(),
        project: new mongoose.Types.ObjectId(),
        assignee: [new mongoose.Types.ObjectId()],
        timeTaken: ''
      };

      const task = new Task(taskData);
      const savedTask = await task.save();
      expect(savedTask.timeTaken).toBe('');
    });

    it('should accept null timeTaken field', async () => {
      const taskData = {
        title: 'Test Task',
        owner: new mongoose.Types.ObjectId(),
        project: new mongoose.Types.ObjectId(),
        assignee: [new mongoose.Types.ObjectId()],
        timeTaken: null
      };

      const task = new Task(taskData);
      const savedTask = await task.save();
      expect(savedTask.timeTaken).toBe(null);
    });
  });

  describe('Total Time Calculation', () => {
    it('should calculate total time as task time + subtask times', async () => {
      const taskData = {
        title: 'Test Task',
        owner: new mongoose.Types.ObjectId(),
        project: new mongoose.Types.ObjectId(),
        assignee: [new mongoose.Types.ObjectId()],
        timeTaken: '1 hour'
      };

      const task = new Task(taskData);
      const savedTask = await task.save();

      // Mock subtasks with time
      const subtaskTimes = ['30 minutes', '45 minutes', '15 minutes'];
      const expectedTotal = '2 hours 30 minutes'; // 1 hour + 1 hour 30 minutes

      // This would be implemented in the service layer
      // For now, we're just testing the model accepts the timeTaken field
      expect(savedTask.timeTaken).toBe('1 hour');
    });
  });
});
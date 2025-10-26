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

      const totalTime = await taskService.calculateTotalTime(task._id);
      expect(totalTime).toBe('2 hours');
    });

    it('should handle task with no time and no subtasks', async () => {
            const taskData = {
        title: 'Test Task',
        project: mockProjectId,
        timeTaken: ''
      };

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
});
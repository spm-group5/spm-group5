import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Subtask from './subtask.model.js';

describe('Subtask Model', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await Subtask.deleteMany({});
  });

  afterEach(async () => {
    // Clear the database after each test
    await Subtask.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid subtask with all required fields', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        description: 'Test description',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        status: 'To Do',
        priority: 'Medium'
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask._id).toBeDefined();
      expect(savedSubtask.title).toBe(subtaskData.title);
      expect(savedSubtask.description).toBe(subtaskData.description);
      expect(savedSubtask.status).toBe('To Do');
      expect(savedSubtask.priority).toBe('Medium');
    });

    it('should fail validation when title is missing', async () => {
      const subtaskData = {
        description: 'Test description',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });

    it('should fail validation when parentTaskId is missing', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });

    it('should fail validation when projectId is missing', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });

    it('should fail validation when ownerId is missing', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });

    it('should trim whitespace from title', async () => {
      const subtaskData = {
        title: '  Test Subtask  ',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.title).toBe('Test Subtask');
    });

    it('should fail validation when title exceeds max length', async () => {
      const subtaskData = {
        title: 'a'.repeat(201),
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });
  });

  describe('Status Field', () => {
    it('should default to "To Do" status', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.status).toBe('To Do');
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['To Do', 'In Progress', 'Completed', 'Blocked', 'Archived'];

      for (const status of validStatuses) {
        const subtaskData = {
          title: `Test Subtask ${status}`,
          parentTaskId: new mongoose.Types.ObjectId(),
          projectId: new mongoose.Types.ObjectId(),
          ownerId: new mongoose.Types.ObjectId(),
          status
        };

        const subtask = new Subtask(subtaskData);
        const savedSubtask = await subtask.save();

        expect(savedSubtask.status).toBe(status);
      }
    });

    it('should reject invalid status values', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        status: 'Invalid Status'
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });
  });

  describe('Priority Field', () => {
    it('should default to "Medium" priority', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.priority).toBe('Medium');
    });

    it('should accept valid priority values', async () => {
      const validPriorities = ['Low', 'Medium', 'High'];

      for (const priority of validPriorities) {
        const subtaskData = {
          title: `Test Subtask ${priority}`,
          parentTaskId: new mongoose.Types.ObjectId(),
          projectId: new mongoose.Types.ObjectId(),
          ownerId: new mongoose.Types.ObjectId(),
          priority
        };

        const subtask = new Subtask(subtaskData);
        const savedSubtask = await subtask.save();

        expect(savedSubtask.priority).toBe(priority);
      }
    });

    it('should reject invalid priority values', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        priority: 'Urgent'
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.createdAt).toBeDefined();
      expect(savedSubtask.updatedAt).toBeDefined();
      expect(savedSubtask.createdAt).toBeInstanceOf(Date);
      expect(savedSubtask.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();
      const firstUpdatedAt = savedSubtask.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedSubtask.title = 'Updated Title';
      const updatedSubtask = await savedSubtask.save();

      expect(updatedSubtask.updatedAt.getTime()).toBeGreaterThan(firstUpdatedAt.getTime());
    });
  });

  describe('Optional Fields', () => {
    it('should save subtask without optional assigneeId', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.assigneeId).toBeUndefined();
    });

    it('should save subtask with assigneeId', async () => {
      const assigneeId = new mongoose.Types.ObjectId();
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        assigneeId
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.assigneeId).toEqual(assigneeId);
    });

    it('should save subtask without dueDate', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.dueDate).toBeUndefined();
    });

    it('should save subtask with dueDate', async () => {
      const dueDate = new Date('2024-12-31');
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        dueDate
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.dueDate).toEqual(dueDate);
    });
  });
});


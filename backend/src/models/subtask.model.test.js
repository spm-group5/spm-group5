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
        priority: 5
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask._id).toBeDefined();
      expect(savedSubtask.title).toBe(subtaskData.title);
      expect(savedSubtask.description).toBe(subtaskData.description);
      expect(savedSubtask.status).toBe('To Do');
      expect(savedSubtask.priority).toBe(5);
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
      const validStatuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];

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
    it('should default to priority 5', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.priority).toBe(5);
    });

    it('should accept valid priority values (1-10)', async () => {
      const validPriorities = [1, 3, 5, 7, 10];

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

    it('should reject priority values below 1', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        priority: 0
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });

    it('should reject priority values above 10', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        priority: 11
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

  describe('Recurring Fields', () => {
    it('should default to non-recurring', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.isRecurring).toBe(false);
      expect(savedSubtask.recurrenceInterval).toBe(null);
    });

    it('should save recurring subtask with valid interval', async () => {
      const dueDate = new Date('2024-12-31');
      const subtaskData = {
        title: 'Test Recurring Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        isRecurring: true,
        recurrenceInterval: 7,
        dueDate
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.isRecurring).toBe(true);
      expect(savedSubtask.recurrenceInterval).toBe(7);
    });

    it('should reject recurring subtask without interval', async () => {
      const subtaskData = {
        title: 'Test Recurring Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        isRecurring: true
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });

    it('should reject recurring subtask with zero interval', async () => {
      const subtaskData = {
        title: 'Test Recurring Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        isRecurring: true,
        recurrenceInterval: 0
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });

    it('should reject non-recurring subtask with interval', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        isRecurring: false,
        recurrenceInterval: 7
      };

      const subtask = new Subtask(subtaskData);
      await expect(subtask.save()).rejects.toThrow();
    });
  });

  describe('Time Taken Field', () => {
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

    it('should save subtask with timeTaken', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        timeTaken: '2 hours'
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.timeTaken).toBe('2 hours');
    });

    it('should trim whitespace from timeTaken', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        timeTaken: '  2 hours  '
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.timeTaken).toBe('2 hours');
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
    it('should default to not archived', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.archived).toBe(false);
      expect(savedSubtask.archivedAt).toBeNull();
    });

    it('should save archived subtask', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        archived: true,
        archivedAt: new Date()
      };

      const subtask = new Subtask(subtaskData);
      const savedSubtask = await subtask.save();

      expect(savedSubtask.archived).toBe(true);
      expect(savedSubtask.archivedAt).toBeInstanceOf(Date);
    });
  });
});


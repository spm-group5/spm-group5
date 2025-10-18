import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import subtaskService from './subtask.services.js';
import Subtask from '../models/subtask.model.js';
import Task from '../models/task.model.js';
import Project from '../models/project.model.js';

describe('Subtask Service', () => {
  let mockTaskId;
  let mockProjectId;
  let mockOwnerId;
  let mockSubtaskId;

  beforeEach(async () => {
    // Clear the database before each test
    await Subtask.deleteMany({});
    await Task.deleteMany({});
    await Project.deleteMany({});

    // Create mock IDs
    mockTaskId = new mongoose.Types.ObjectId();
    mockProjectId = new mongoose.Types.ObjectId();
    mockOwnerId = new mongoose.Types.ObjectId();

    // Create a mock task
    const mockTask = new Task({
      title: 'Test Task',
      project: mockProjectId,
      owner: mockOwnerId,
      status: 'To Do'
    });
    await mockTask.save();
    mockTaskId = mockTask._id;

    // Create a mock project
    const mockProject = new Project({
      name: 'Test Project',
      description: 'Test Description',
      owner: mockOwnerId,
      status: 'Active'
    });
    await mockProject.save();
    mockProjectId = mockProject._id;
  });

  afterEach(async () => {
    // Clear the database after each test
    await Subtask.deleteMany({});
    await Task.deleteMany({});
    await Project.deleteMany({});
  });

  describe('createSubtask', () => {
    it('should create a subtask successfully', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        description: 'Test Description',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        status: 'To Do',
        priority: 8
      };

      const subtask = await subtaskService.createSubtask(subtaskData);

      expect(subtask).toBeDefined();
      expect(subtask.title).toBe(subtaskData.title);
      expect(subtask.description).toBe(subtaskData.description);
      expect(subtask.parentTaskId.toString()).toBe(mockTaskId.toString());
      expect(subtask.projectId.toString()).toBe(mockProjectId.toString());
      expect(subtask.status).toBe('To Do');
      expect(subtask.priority).toBe(8);
    });

    it('should create subtask with default status and priority', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId
      };

      const subtask = await subtaskService.createSubtask(subtaskData);

      expect(subtask.status).toBe('To Do');
      expect(subtask.priority).toBe(5);
    });

    it('should throw error when parent task does not exist', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: new mongoose.Types.ObjectId(), // Non-existent task
        projectId: mockProjectId,
        ownerId: mockOwnerId
      };

      await expect(subtaskService.createSubtask(subtaskData)).rejects.toThrow('Parent task not found');
    });

    it('should throw error when project does not exist', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: mockTaskId,
        projectId: new mongoose.Types.ObjectId(), // Non-existent project
        ownerId: mockOwnerId
      };

      await expect(subtaskService.createSubtask(subtaskData)).rejects.toThrow('Project not found');
    });
  });

  describe('getSubtasksByParentTask', () => {
    beforeEach(async () => {
      // Create test subtasks
      await Subtask.create([
        {
          title: 'Subtask 1',
          parentTaskId: mockTaskId,
          projectId: mockProjectId,
          ownerId: mockOwnerId,
          status: 'To Do'
        },
        {
          title: 'Subtask 2',
          parentTaskId: mockTaskId,
          projectId: mockProjectId,
          ownerId: mockOwnerId,
          status: 'In Progress'
        },
        {
          title: 'Archived Subtask',
          parentTaskId: mockTaskId,
          projectId: mockProjectId,
          ownerId: mockOwnerId,
          archived: true
        }
      ]);
    });

    it('should get all non-archived subtasks for a parent task', async () => {
      const subtasks = await subtaskService.getSubtasksByParentTask(mockTaskId);

      expect(subtasks).toHaveLength(2);
      expect(subtasks[0].title).toBe('Subtask 2'); // Most recent first
      expect(subtasks[1].title).toBe('Subtask 1');
    });

    it('should not include archived subtasks', async () => {
      const subtasks = await subtaskService.getSubtasksByParentTask(mockTaskId);

      const archivedSubtask = subtasks.find(s => s.archived === true);
      expect(archivedSubtask).toBeUndefined();
    });

    it('should return empty array when no subtasks exist', async () => {
      const newTaskId = new mongoose.Types.ObjectId();
      const subtasks = await subtaskService.getSubtasksByParentTask(newTaskId);

      expect(subtasks).toHaveLength(0);
    });
  });

  describe('getSubtasksByProject', () => {
    beforeEach(async () => {
      // Create test subtasks
      await Subtask.create([
        {
          title: 'Project Subtask 1',
          parentTaskId: mockTaskId,
          projectId: mockProjectId,
          ownerId: mockOwnerId,
          status: 'To Do'
        },
        {
          title: 'Project Subtask 2',
          parentTaskId: mockTaskId,
          projectId: mockProjectId,
          ownerId: mockOwnerId,
          status: 'Completed'
        },
        {
          title: 'Archived Project Subtask',
          parentTaskId: mockTaskId,
          projectId: mockProjectId,
          ownerId: mockOwnerId,
          status: 'To Do',
          archived: true,
          archivedAt: new Date()
        }
      ]);
    });

    it('should get all non-archived subtasks for a project', async () => {
      const subtasks = await subtaskService.getSubtasksByProject(mockProjectId);

      expect(subtasks).toHaveLength(2);
      expect(subtasks.every(s => !s.archived)).toBe(true);
    });

    it('should return empty array when no subtasks exist for project', async () => {
      const newProjectId = new mongoose.Types.ObjectId();
      const subtasks = await subtaskService.getSubtasksByProject(newProjectId);

      expect(subtasks).toHaveLength(0);
    });
  });

  describe('getSubtaskById', () => {
    beforeEach(async () => {
      const subtask = await Subtask.create({
        title: 'Test Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        status: 'To Do'
      });
      mockSubtaskId = subtask._id;
    });

    it('should get a subtask by ID', async () => {
      const subtask = await subtaskService.getSubtaskById(mockSubtaskId);

      expect(subtask).toBeDefined();
      expect(subtask._id.toString()).toBe(mockSubtaskId.toString());
      expect(subtask.title).toBe('Test Subtask');
    });

    it('should throw error when subtask does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(subtaskService.getSubtaskById(nonExistentId)).rejects.toThrow('Subtask not found');
    });
  });

  describe('updateSubtask', () => {
    beforeEach(async () => {
      const subtask = await Subtask.create({
        title: 'Original Title',
        description: 'Original Description',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        status: 'To Do',
        priority: 3
      });
      mockSubtaskId = subtask._id;
    });

    it('should update subtask title', async () => {
      const updateData = { title: 'Updated Title' };
      const updatedSubtask = await subtaskService.updateSubtask(mockSubtaskId, updateData);

      expect(updatedSubtask.title).toBe('Updated Title');
      expect(updatedSubtask.description).toBe('Original Description'); // Unchanged
    });

    it('should update subtask status', async () => {
      const updateData = { status: 'Completed' };
      const updatedSubtask = await subtaskService.updateSubtask(mockSubtaskId, updateData);

      expect(updatedSubtask.status).toBe('Completed');
    });

    it('should update multiple fields', async () => {
      const updateData = {
        title: 'New Title',
        description: 'New Description',
        status: 'In Progress',
        priority: 8
      };
      const updatedSubtask = await subtaskService.updateSubtask(mockSubtaskId, updateData);

      expect(updatedSubtask.title).toBe('New Title');
      expect(updatedSubtask.description).toBe('New Description');
      expect(updatedSubtask.status).toBe('In Progress');
      expect(updatedSubtask.priority).toBe(8);
    });

    it('should throw error when subtask does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { title: 'New Title' };

      await expect(subtaskService.updateSubtask(nonExistentId, updateData)).rejects.toThrow('Subtask not found');
    });
  });

  describe('Archive Functionality', () => {
    beforeEach(async () => {
      const subtask = await Subtask.create({
        title: 'Subtask to Archive',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        status: 'To Do'
      });
      mockSubtaskId = subtask._id;
    });

    it('should archive a subtask', async () => {
      const archivedSubtask = await subtaskService.archiveSubtask(mockSubtaskId);

      expect(archivedSubtask.archived).toBe(true);
      expect(archivedSubtask.archivedAt).toBeDefined();

      // Verify the subtask still exists in database
      const subtaskInDb = await Subtask.findById(mockSubtaskId);
      expect(subtaskInDb).toBeDefined();
      expect(subtaskInDb.archived).toBe(true);
    });

    it('should not return archived subtask in getSubtasksByParentTask', async () => {
      await subtaskService.archiveSubtask(mockSubtaskId);

      const subtasks = await subtaskService.getSubtasksByParentTask(mockTaskId);
      const archivedSubtask = subtasks.find(s => s._id.toString() === mockSubtaskId.toString());

      expect(archivedSubtask).toBeUndefined();
    });

    it('should throw error when trying to archive non-existent subtask', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(subtaskService.archiveSubtask(nonExistentId)).rejects.toThrow('Subtask not found');
    });
  });

  describe('Recurring Subtasks', () => {
    it('should create recurring subtask with valid interval and due date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const subtaskData = {
        title: 'Recurring Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        dueDate: futureDate,
        isRecurring: true,
        recurrenceInterval: 7
      };

      const subtask = await subtaskService.createSubtask(subtaskData);

      expect(subtask.isRecurring).toBe(true);
      expect(subtask.recurrenceInterval).toBe(7);
    });

    it('should throw error for recurring subtask without interval', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const subtaskData = {
        title: 'Recurring Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        dueDate: futureDate,
        isRecurring: true
      };

      await expect(subtaskService.createSubtask(subtaskData))
        .rejects.toThrow('Recurrence interval must be a positive number for recurring subtasks');
    });

    it('should throw error for recurring subtask without due date', async () => {
      const subtaskData = {
        title: 'Recurring Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        isRecurring: true,
        recurrenceInterval: 7
      };

      await expect(subtaskService.createSubtask(subtaskData))
        .rejects.toThrow('Due date is required for recurring subtasks');
    });

    it('should create recurring subtask instance when original is completed', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Create original recurring subtask
      const originalSubtask = await Subtask.create({
        title: 'Recurring Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        status: 'To Do',
        priority: 5,
        dueDate: futureDate,
        isRecurring: true,
        recurrenceInterval: 7
      });

      // Create new recurring subtask
      const newSubtask = await subtaskService.createRecurringSubtask(originalSubtask);

      expect(newSubtask).toBeDefined();
      expect(newSubtask.title).toBe(originalSubtask.title);
      expect(newSubtask.isRecurring).toBe(true);
      expect(newSubtask.recurrenceInterval).toBe(7);
      expect(newSubtask.status).toBe('To Do');
      
      // Check that due date is updated
      const expectedNewDate = new Date(futureDate);
      expectedNewDate.setDate(expectedNewDate.getDate() + 7);
      expect(newSubtask.dueDate.getTime()).toBe(expectedNewDate.getTime());
    });

    it('should return null when creating recurring instance for non-recurring subtask', async () => {
      const subtask = await Subtask.create({
        title: 'Non-recurring Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        status: 'To Do',
        priority: 5,
        isRecurring: false
      });

      const result = await subtaskService.createRecurringSubtask(subtask);
      expect(result).toBeNull();
    });
  });

  describe('Time Taken Field', () => {
    it('should create subtask with timeTaken', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: '2 hours'
      };

      const subtask = await subtaskService.createSubtask(subtaskData);

      expect(subtask.timeTaken).toBe('2 hours');
    });

    it('should update subtask timeTaken', async () => {
      const subtask = await Subtask.create({
        title: 'Test Subtask',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        timeTaken: '1 hour'
      });

      const updateData = { timeTaken: '3 hours' };
      const updatedSubtask = await subtaskService.updateSubtask(subtask._id, updateData);

      expect(updatedSubtask.timeTaken).toBe('3 hours');
    });
  });

  describe('Archive Functionality', () => {
    beforeEach(async () => {
      const subtask = await Subtask.create({
        title: 'Subtask to Archive',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        status: 'To Do'
      });
      mockSubtaskId = subtask._id;
    });

    it('should archive a subtask', async () => {
      const archivedSubtask = await subtaskService.archiveSubtask(mockSubtaskId);

      expect(archivedSubtask.archived).toBe(true);
      expect(archivedSubtask.archivedAt).toBeInstanceOf(Date);

      // Verify the subtask still exists in database
      const subtaskInDb = await Subtask.findById(mockSubtaskId);
      expect(subtaskInDb.archived).toBe(true);
    });

    it('should get archived subtasks for a parent task', async () => {
      await subtaskService.archiveSubtask(mockSubtaskId);

      const archivedSubtasks = await subtaskService.getArchivedSubtasksByParentTask(mockTaskId);
      expect(archivedSubtasks).toHaveLength(1);
      expect(archivedSubtasks[0]._id.toString()).toBe(mockSubtaskId.toString());
    });

    it('should unarchive a subtask', async () => {
      // First archive the subtask
      await subtaskService.archiveSubtask(mockSubtaskId);
      
      // Then unarchive it
      const unarchivedSubtask = await subtaskService.unarchiveSubtask(mockSubtaskId);

      expect(unarchivedSubtask.archived).toBe(false);
      expect(unarchivedSubtask.archivedAt).toBeNull();
    });

    it('should throw error when trying to archive non-existent subtask', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(subtaskService.archiveSubtask(nonExistentId)).rejects.toThrow('Subtask not found');
    });

    it('should throw error when trying to unarchive non-existent subtask', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(subtaskService.unarchiveSubtask(nonExistentId)).rejects.toThrow('Subtask not found');
    });
  });
});


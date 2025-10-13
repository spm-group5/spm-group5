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
        priority: 'High'
      };

      const subtask = await subtaskService.createSubtask(subtaskData);

      expect(subtask).toBeDefined();
      expect(subtask.title).toBe(subtaskData.title);
      expect(subtask.description).toBe(subtaskData.description);
      expect(subtask.parentTaskId.toString()).toBe(mockTaskId.toString());
      expect(subtask.projectId.toString()).toBe(mockProjectId.toString());
      expect(subtask.status).toBe('To Do');
      expect(subtask.priority).toBe('High');
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
      expect(subtask.priority).toBe('Medium');
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
          status: 'Archived'
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

      const archivedSubtask = subtasks.find(s => s.status === 'Archived');
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
          status: 'Archived'
        }
      ]);
    });

    it('should get all non-archived subtasks for a project', async () => {
      const subtasks = await subtaskService.getSubtasksByProject(mockProjectId);

      expect(subtasks).toHaveLength(2);
      expect(subtasks.every(s => s.status !== 'Archived')).toBe(true);
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
        priority: 'Low'
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
        priority: 'High'
      };
      const updatedSubtask = await subtaskService.updateSubtask(mockSubtaskId, updateData);

      expect(updatedSubtask.title).toBe('New Title');
      expect(updatedSubtask.description).toBe('New Description');
      expect(updatedSubtask.status).toBe('In Progress');
      expect(updatedSubtask.priority).toBe('High');
    });

    it('should throw error when subtask does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { title: 'New Title' };

      await expect(subtaskService.updateSubtask(nonExistentId, updateData)).rejects.toThrow('Subtask not found');
    });
  });

  describe('deleteSubtask (Soft Delete)', () => {
    beforeEach(async () => {
      const subtask = await Subtask.create({
        title: 'Subtask to Delete',
        parentTaskId: mockTaskId,
        projectId: mockProjectId,
        ownerId: mockOwnerId,
        status: 'To Do'
      });
      mockSubtaskId = subtask._id;
    });

    it('should soft delete subtask by changing status to Archived', async () => {
      const deletedSubtask = await subtaskService.deleteSubtask(mockSubtaskId);

      expect(deletedSubtask.status).toBe('Archived');

      // Verify the subtask still exists in database
      const subtaskInDb = await Subtask.findById(mockSubtaskId);
      expect(subtaskInDb).toBeDefined();
      expect(subtaskInDb.status).toBe('Archived');
    });

    it('should not return archived subtask in getSubtasksByParentTask', async () => {
      await subtaskService.deleteSubtask(mockSubtaskId);

      const subtasks = await subtaskService.getSubtasksByParentTask(mockTaskId);
      const deletedSubtask = subtasks.find(s => s._id.toString() === mockSubtaskId.toString());

      expect(deletedSubtask).toBeUndefined();
    });

    it('should throw error when subtask does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(subtaskService.deleteSubtask(nonExistentId)).rejects.toThrow('Subtask not found');
    });
  });
});


import { describe, it, expect, beforeEach, vi } from 'vitest';
import subtaskController from './subtask.controller.js';
import subtaskService from '../services/subtask.services.js';

vi.mock('../services/subtask.services.js');

describe('Subtask Controller - Update Permissions', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: 'userId123' },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    vi.clearAllMocks();
  });

  describe('updateSubtask - Permission Checks', () => {
    it('should allow admin user to edit any subtask', async () => {
      const mockOriginalSubtask = {
        _id: '507f1f77bcf86cd799439020',
        status: 'To Do'
      };
      const mockUpdatedSubtask = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Updated Subtask',
        status: 'In Progress'
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { title: 'Updated Subtask', status: 'In Progress' };
      req.user = { _id: 'adminUserId' };

      subtaskService.getSubtaskById.mockResolvedValue(mockOriginalSubtask);
      subtaskService.updateSubtask.mockResolvedValue(mockUpdatedSubtask);

      await subtaskController.updateSubtask(req, res);

      expect(subtaskService.updateSubtask).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439020',
        { title: 'Updated Subtask', status: 'In Progress' },
        'adminUserId'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subtask updated successfully',
        data: mockUpdatedSubtask
      });
    });

    it('should allow manager user to edit subtask they are assigned to', async () => {
      const mockOriginalSubtask = {
        _id: '507f1f77bcf86cd799439020',
        status: 'To Do'
      };
      const mockUpdatedSubtask = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Updated by Manager',
        status: 'In Progress'
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { title: 'Updated by Manager', status: 'In Progress' };
      req.user = { _id: 'managerUserId' };

      subtaskService.getSubtaskById.mockResolvedValue(mockOriginalSubtask);
      subtaskService.updateSubtask.mockResolvedValue(mockUpdatedSubtask);

      await subtaskController.updateSubtask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subtask updated successfully',
        data: mockUpdatedSubtask
      });
    });

    it('should reject staff user even if they are the owner', async () => {
      const mockOriginalSubtask = {
        _id: '507f1f77bcf86cd799439020',
        status: 'To Do',
        ownerId: 'staffUserId'
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { title: 'Attempted Update by Owner' };
      req.user = { _id: 'staffUserId' };

      subtaskService.getSubtaskById.mockResolvedValue(mockOriginalSubtask);
      subtaskService.updateSubtask.mockRejectedValue(
        new Error('You do not have permission to modify this subtask')
      );

      await subtaskController.updateSubtask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to modify this subtask'
      });
    });

    it('should reject staff user even if they are an assignee', async () => {
      const mockOriginalSubtask = {
        _id: '507f1f77bcf86cd799439020',
        status: 'To Do',
        ownerId: 'ownerUserId',
        assigneeId: ['staffUserId', 'otherUserId']
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { title: 'Attempted Update by Assignee' };
      req.user = { _id: 'staffUserId' };

      subtaskService.getSubtaskById.mockResolvedValue(mockOriginalSubtask);
      subtaskService.updateSubtask.mockRejectedValue(
        new Error('You do not have permission to modify this subtask')
      );

      await subtaskController.updateSubtask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to modify this subtask'
      });
    });

    it('should reject staff user who is neither owner nor assignee', async () => {
      const mockOriginalSubtask = {
        _id: '507f1f77bcf86cd799439020',
        status: 'To Do',
        ownerId: 'ownerUserId',
        assigneeId: ['assignee1', 'assignee2']
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { title: 'Unauthorized Update' };
      req.user = { _id: 'staffUserId' };

      subtaskService.getSubtaskById.mockResolvedValue(mockOriginalSubtask);
      subtaskService.updateSubtask.mockRejectedValue(
        new Error('You do not have permission to modify this subtask')
      );

      await subtaskController.updateSubtask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to modify this subtask'
      });
    });
  });
});

describe('Subtask Controller - Manual Time Logging', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: 'userId123' },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    vi.clearAllMocks();
  });

  describe('updateSubtaskTimeTaken', () => {
    it('should update subtask timeTaken successfully', async () => {
      const mockUpdatedSubtask = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Subtask with Time',
        timeTaken: 60,
        status: 'In Progress',
        parentTaskId: '507f1f77bcf86cd799439015'
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { timeTaken: 60 };
      subtaskService.updateSubtaskTimeTaken.mockResolvedValue(mockUpdatedSubtask);

      await subtaskController.updateSubtaskTimeTaken(req, res);

      expect(subtaskService.updateSubtaskTimeTaken).toHaveBeenCalledWith('507f1f77bcf86cd799439020', 60);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subtask time logged successfully',
        data: mockUpdatedSubtask
      });
    });

    it('should reject blank timeTaken field', async () => {
      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { timeTaken: '' };
      subtaskService.updateSubtaskTimeTaken.mockRejectedValue(new Error('Time taken cannot be blank'));

      await subtaskController.updateSubtaskTimeTaken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Time taken cannot be blank'
      });
    });

    it('should handle invalid timeTaken value', async () => {
      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { timeTaken: -15 };
      subtaskService.updateSubtaskTimeTaken.mockRejectedValue(new Error('Time taken must be a positive number'));

      await subtaskController.updateSubtaskTimeTaken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update subtask timeTaken replacing previous value', async () => {
      const mockUpdatedSubtask = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Subtask with Updated Time',
        timeTaken: 120,
        status: 'In Progress',
        parentTaskId: '507f1f77bcf86cd799439015'
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      req.body = { timeTaken: 120 };
      subtaskService.updateSubtaskTimeTaken.mockResolvedValue(mockUpdatedSubtask);

      await subtaskController.updateSubtaskTimeTaken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subtask time logged successfully',
        data: mockUpdatedSubtask
      });
    });

    it('should handle subtask not found', async () => {
      req.params = { subtaskId: 'invalidSubtaskId' };
      req.body = { timeTaken: 60 };
      subtaskService.updateSubtaskTimeTaken.mockRejectedValue(new Error('Subtask not found'));

      await subtaskController.updateSubtaskTimeTaken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getSubtaskTotalTime', () => {
    it('should get subtask total time', async () => {
      const mockSubtaskTime = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Subtask with Time',
        timeTaken: 45
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      subtaskService.getSubtaskById.mockResolvedValue(mockSubtaskTime);

      await subtaskController.getSubtaskTotalTime(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          subtaskId: '507f1f77bcf86cd799439020',
          timeTaken: 45
        }
      });
    });

    it('should return 0 when no time is logged for subtask', async () => {
      const mockSubtaskTime = {
        _id: '507f1f77bcf86cd799439020',
        title: 'Subtask without Time',
        timeTaken: 0
      };

      req.params = { subtaskId: '507f1f77bcf86cd799439020' };
      subtaskService.getSubtaskById.mockResolvedValue(mockSubtaskTime);

      await subtaskController.getSubtaskTotalTime(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          subtaskId: '507f1f77bcf86cd799439020',
          timeTaken: 0
        }
      });
    });

    it('should handle subtask not found error', async () => {
      req.params = { subtaskId: 'invalidSubtaskId' };
      subtaskService.getSubtaskById.mockRejectedValue(new Error('Subtask not found'));

      await subtaskController.getSubtaskTotalTime(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});

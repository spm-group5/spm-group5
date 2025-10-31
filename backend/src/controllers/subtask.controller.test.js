import { describe, it, expect, beforeEach, vi } from 'vitest';
import subtaskController from './subtask.controller.js';
import subtaskService from '../services/subtask.services.js';

vi.mock('../services/subtask.services.js');

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

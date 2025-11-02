import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import taskController from './task.controller.js';
import taskModel from '../models/task.model.js';

// Mock dependencies
vi.mock('../models/task.model.js');

describe('Task Controller - Delete Comment (Admin Only)', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: {
                _id: 'userId123',
                username: 'user@example.com',
                roles: ['admin']
            },
            params: {
                taskId: 'task123',
                commentId: 'comment123'
            }
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('deleteComment - Authorization', () => {
        it('should allow admin to delete any comment', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Some comment',
                author: 'otherUserId456',
                authorName: 'other@example.com',
                deleteOne: vi.fn()
            };

            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockResolvedValue(true)
            };

            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.deleteComment(req, res);

            // Verify comment was deleted
            expect(mockComment.deleteOne).toHaveBeenCalled();
            expect(mockTask.save).toHaveBeenCalled();

            // Verify response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Comment deleted successfully',
                data: mockTask
            });
        });

        it('should allow admin to delete their own comment', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Admin comment',
                author: 'userId123',
                authorName: 'user@example.com',
                deleteOne: vi.fn()
            };

            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockResolvedValue(true)
            };

            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.deleteComment(req, res);

            expect(mockComment.deleteOne).toHaveBeenCalled();
            expect(mockTask.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject deletion when user is not an admin (manager)', async () => {
            req.user.roles = ['manager'];

            await taskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only admins can delete comments'
            });
            expect(taskModel.findById).not.toHaveBeenCalled();
        });

        it('should reject deletion when user is not an admin (staff)', async () => {
            req.user.roles = ['staff'];

            await taskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only admins can delete comments'
            });
            expect(taskModel.findById).not.toHaveBeenCalled();
        });

        it('should reject deletion when user has no roles', async () => {
            req.user.roles = [];

            await taskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only admins can delete comments'
            });
        });

        it('should reject deletion when user is staff trying to delete own comment', async () => {
            req.user.roles = ['staff'];

            await taskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only admins can delete comments'
            });
            // Should not even check the task or comment
            expect(taskModel.findById).not.toHaveBeenCalled();
        });
    });

    describe('deleteComment - Not Found Errors', () => {
        it('should return 404 when task not found', async () => {
            taskModel.findById.mockResolvedValue(null);

            await taskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Task not found'
            });
        });

        it('should return 404 when comment not found', async () => {
            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(null)
                }
            };

            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment not found'
            });
        });
    });

    describe('deleteComment - Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            taskModel.findById.mockRejectedValue(new Error('Database connection failed'));

            await taskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Database connection failed'
            });
        });

        it('should handle save errors', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Comment',
                author: 'userId123',
                authorName: 'user@example.com',
                deleteOne: vi.fn()
            };

            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockRejectedValue(new Error('Save failed'))
            };

            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Save failed'
            });
        });
    });
});

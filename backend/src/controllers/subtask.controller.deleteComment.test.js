import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import subtaskController from './subtask.controller.js';
import Subtask from '../models/subtask.model.js';

// Mock dependencies
vi.mock('../models/subtask.model.js');

describe('Subtask Controller - Delete Comment (Admin Only)', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: {
                _id: 'userId123',
                username: 'user@example.com',
                roles: ['admin']
            },
            params: {
                subtaskId: 'subtask123',
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

            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockResolvedValue(true)
            };

            Subtask.findById.mockResolvedValue(mockSubtask);

            await subtaskController.deleteComment(req, res);

            // Verify comment was deleted
            expect(mockComment.deleteOne).toHaveBeenCalled();
            expect(mockSubtask.save).toHaveBeenCalled();

            // Verify response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Comment deleted successfully',
                data: mockSubtask
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

            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockResolvedValue(true)
            };

            Subtask.findById.mockResolvedValue(mockSubtask);

            await subtaskController.deleteComment(req, res);

            expect(mockComment.deleteOne).toHaveBeenCalled();
            expect(mockSubtask.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject deletion when user is not an admin (manager)', async () => {
            req.user.roles = ['manager'];

            await subtaskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only admins can delete comments'
            });
            expect(Subtask.findById).not.toHaveBeenCalled();
        });

        it('should reject deletion when user is not an admin (staff)', async () => {
            req.user.roles = ['staff'];

            await subtaskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only admins can delete comments'
            });
            expect(Subtask.findById).not.toHaveBeenCalled();
        });

        it('should reject deletion when user has no roles', async () => {
            req.user.roles = [];

            await subtaskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only admins can delete comments'
            });
        });

        it('should reject deletion when user is staff trying to delete own comment', async () => {
            req.user.roles = ['staff'];

            await subtaskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only admins can delete comments'
            });
            // Should not even check the subtask or comment
            expect(Subtask.findById).not.toHaveBeenCalled();
        });
    });

    describe('deleteComment - Not Found Errors', () => {
        it('should return 404 when subtask not found', async () => {
            Subtask.findById.mockResolvedValue(null);

            await subtaskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Subtask not found'
            });
        });

        it('should return 404 when comment not found', async () => {
            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: {
                    id: vi.fn().mockReturnValue(null)
                }
            };

            Subtask.findById.mockResolvedValue(mockSubtask);

            await subtaskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment not found'
            });
        });
    });

    describe('deleteComment - Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            Subtask.findById.mockRejectedValue(new Error('Database connection failed'));

            await subtaskController.deleteComment(req, res);

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

            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockRejectedValue(new Error('Save failed'))
            };

            Subtask.findById.mockResolvedValue(mockSubtask);

            await subtaskController.deleteComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Save failed'
            });
        });
    });
});

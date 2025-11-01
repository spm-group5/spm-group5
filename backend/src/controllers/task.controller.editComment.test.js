import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import taskController from './task.controller.js';
import taskModel from '../models/task.model.js';

// Mock dependencies
vi.mock('../models/task.model.js');

describe('Task Controller - Edit Comment', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: {
                _id: 'userId123',
                username: 'user@example.com'
            },
            params: {
                taskId: 'task123',
                commentId: 'comment123'
            },
            body: {}
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

    describe('editComment - Happy Path', () => {
        it('should successfully edit own comment', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Old comment text',
                author: 'userId123',
                authorName: 'user@example.com',
                createdAt: new Date()
            };

            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockResolvedValue(true)
            };

            req.body = { text: 'Updated comment text' };
            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.editComment(req, res);

            // Verify comment was updated
            expect(mockComment.text).toBe('Updated comment text');
            expect(mockTask.save).toHaveBeenCalled();

            // Verify response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Comment updated successfully',
                data: mockTask
            });
        });

        it('should trim whitespace from comment text', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Old comment text',
                author: 'userId123',
                authorName: 'user@example.com',
                createdAt: new Date()
            };

            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockResolvedValue(true)
            };

            req.body = { text: '  Updated comment with spaces  ' };
            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.editComment(req, res);

            // Verify comment was trimmed
            expect(mockComment.text).toBe('Updated comment with spaces');
            expect(mockTask.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('editComment - Validation Errors', () => {
        it('should reject empty comment text', async () => {
            req.body = { text: '' };

            await taskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment text is required'
            });
            expect(taskModel.findById).not.toHaveBeenCalled();
        });

        it('should reject whitespace-only comment text', async () => {
            req.body = { text: '   ' };

            await taskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment text is required'
            });
            expect(taskModel.findById).not.toHaveBeenCalled();
        });

        it('should reject missing comment text', async () => {
            req.body = {};

            await taskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment text is required'
            });
        });
    });

    describe('editComment - Not Found Errors', () => {
        it('should return 404 when task not found', async () => {
            req.body = { text: 'Valid comment' };
            taskModel.findById.mockResolvedValue(null);

            await taskController.editComment(req, res);

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

            req.body = { text: 'Valid comment' };
            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment not found'
            });
        });
    });

    describe('editComment - Authorization', () => {
        it('should reject editing another user\'s comment', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Someone else\'s comment',
                author: 'otherUserId456',
                authorName: 'other@example.com',
                createdAt: new Date()
            };

            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                }
            };

            req.body = { text: 'Trying to edit someone else\'s comment' };
            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'You can only edit your own comments'
            });
            expect(mockTask.save).not.toHaveBeenCalled();
        });

        it('should allow editing own comment when author matches', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'My comment',
                author: 'userId123',
                authorName: 'user@example.com',
                createdAt: new Date()
            };

            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockResolvedValue(true)
            };

            req.body = { text: 'Updated my comment' };
            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(mockComment.text).toBe('Updated my comment');
            expect(mockTask.save).toHaveBeenCalled();
        });
    });

    describe('editComment - Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            req.body = { text: 'Valid comment' };
            taskModel.findById.mockRejectedValue(new Error('Database connection failed'));

            await taskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Database connection failed'
            });
        });

        it('should handle save errors', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Old comment',
                author: 'userId123',
                authorName: 'user@example.com',
                createdAt: new Date()
            };

            const mockTask = {
                _id: 'task123',
                title: 'Test Task',
                comments: {
                    id: vi.fn().mockReturnValue(mockComment)
                },
                save: vi.fn().mockRejectedValue(new Error('Save failed'))
            };

            req.body = { text: 'Updated comment' };
            taskModel.findById.mockResolvedValue(mockTask);

            await taskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Save failed'
            });
        });
    });
});

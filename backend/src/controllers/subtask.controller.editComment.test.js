import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import subtaskController from './subtask.controller.js';
import Subtask from '../models/subtask.model.js';

// Mock dependencies
vi.mock('../models/subtask.model.js');

describe('Subtask Controller - Edit Comment', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: {
                _id: 'userId123',
                username: 'user@example.com'
            },
            params: {
                subtaskId: 'subtask123',
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
            const mockCommentsArray = [mockComment];
            mockCommentsArray.id = vi.fn().mockReturnValue(mockComment);
            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: mockCommentsArray,
                save: vi.fn().mockResolvedValue(true),
                lean: vi.fn()
            };
            mockSubtask.lean.mockReturnValue(mockSubtask);
            // BOTH calls now mimic async promise mongoose:
            Subtask.findById.mockResolvedValueOnce(mockSubtask).mockResolvedValueOnce({lean: vi.fn().mockResolvedValue(mockSubtask)});
            req.body = { text: 'Updated comment text' };
            await subtaskController.editComment(req, res);
            expect(mockComment.text).toBe('Updated comment text');
            expect(mockSubtask.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
        it('should trim whitespace from comment text', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Old comment text',
                author: 'userId123',
                authorName: 'user@example.com',
                createdAt: new Date()
            };
            const mockCommentsArray = [mockComment];
            mockCommentsArray.id = vi.fn().mockReturnValue(mockComment);
            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: mockCommentsArray,
                save: vi.fn().mockResolvedValue(true),
                lean: vi.fn()
            };
            mockSubtask.lean.mockReturnValue(mockSubtask);
            Subtask.findById.mockResolvedValueOnce(mockSubtask).mockResolvedValueOnce({lean: vi.fn().mockResolvedValue(mockSubtask)});
            req.body = { text: '  Updated comment with spaces  ' };
            await subtaskController.editComment(req, res);
            expect(mockComment.text).toBe('Updated comment with spaces');
            expect(mockSubtask.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('editComment - Validation Errors', () => {
        it('should reject empty comment text', async () => {
            req.body = { text: '' };

            await subtaskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment text is required'
            });
            expect(Subtask.findById).not.toHaveBeenCalled();
        });

        it('should reject whitespace-only comment text', async () => {
            req.body = { text: '   ' };

            await subtaskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment text is required'
            });
            expect(Subtask.findById).not.toHaveBeenCalled();
        });

        it('should reject missing comment text', async () => {
            req.body = {};

            await subtaskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment text is required'
            });
        });
    });

    describe('editComment - Not Found Errors', () => {
        it('should return 404 when subtask not found', async () => {
            req.body = { text: 'Valid comment' };
            Subtask.findById.mockResolvedValue(null);

            await subtaskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Subtask not found'
            });
        });

        it('should return 404 when comment not found', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'Someone else\'s comment',
                author: 'otherUserId456',
                authorName: 'other@example.com',
                createdAt: new Date()
            };
            const mockCommentsArray = [mockComment];
            mockCommentsArray.id = vi.fn().mockReturnValue(mockComment);
            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: mockCommentsArray,
                save: vi.fn().mockResolvedValue(true),
                lean: vi.fn()
            };
            mockSubtask.lean.mockReturnValue(mockSubtask);
            Subtask.findById.mockResolvedValue(mockSubtask);
            req.body = { text: 'Valid comment' };
            await subtaskController.editComment(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
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

            const mockCommentsArray = [mockComment];
            mockCommentsArray.id = vi.fn().mockReturnValue(mockComment);
            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: mockCommentsArray,
                save: vi.fn() // Ensure save is a spy even if not called
            };
            mockSubtask.lean = vi.fn().mockReturnValue(mockSubtask);

            req.body = { text: 'Trying to edit someone else\'s comment' };
            Subtask.findById.mockResolvedValue(mockSubtask);

            await subtaskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'You can only edit your own comments'
            });
            expect(mockSubtask.save).not.toHaveBeenCalled();
        });

        it('should allow editing own comment when author matches', async () => {
            const mockComment = {
                _id: 'comment123',
                text: 'My comment',
                author: 'userId123',
                authorName: 'user@example.com',
                createdAt: new Date()
            };
            const mockCommentsArray = [mockComment];
            mockCommentsArray.id = vi.fn().mockReturnValue(mockComment);
            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: mockCommentsArray,
                save: vi.fn().mockResolvedValue(true),
                lean: vi.fn()
            };
            mockSubtask.lean.mockReturnValue(mockSubtask);
            Subtask.findById.mockResolvedValueOnce(mockSubtask).mockResolvedValueOnce({lean: vi.fn().mockResolvedValue(mockSubtask)});
            req.body = { text: 'Updated my comment' };
            await subtaskController.editComment(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(mockComment.text).toBe('Updated my comment');
            expect(mockSubtask.save).toHaveBeenCalled();
        });
    });

    describe('editComment - Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            req.body = { text: 'Valid comment' };
            Subtask.findById.mockRejectedValue(new Error('Database connection failed'));

            await subtaskController.editComment(req, res);

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

            const mockCommentsArray = [mockComment];
            mockCommentsArray.id = vi.fn().mockReturnValue(mockComment);
            const mockSubtask = {
                _id: 'subtask123',
                title: 'Test Subtask',
                comments: mockCommentsArray,
                save: vi.fn().mockRejectedValue(new Error('Save failed'))
            };
            mockSubtask.lean = vi.fn().mockReturnValue(mockSubtask);

            req.body = { text: 'Updated comment' };
            Subtask.findById.mockResolvedValue(mockSubtask);

            await subtaskController.editComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Save failed'
            });
        });
    });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import taskController from './task.controller.js';
import taskService from '../services/task.services.js';
import notificationModel from '../models/notification.model.js';
import taskModel from '../models/task.model.js';

// Mock dependencies
vi.mock('../services/task.services.js');
vi.mock('../models/notification.model.js');
vi.mock('../models/task.model.js');

describe('Task Controller - Comment Notifications', () => {
    let req, res, mockIo, mockUserSockets;

    beforeEach(() => {
        // Setup mock Socket.IO and user sockets
        mockIo = {
            to: vi.fn().mockReturnThis(),
            emit: vi.fn()
        };
        
        mockUserSockets = new Map();
        mockUserSockets.set('assignee1', 'socket123');
        mockUserSockets.set('assignee2', 'socket456');

        req = {
            user: { 
                _id: 'commenterUserId', 
                username: 'commenter@example.com',
                roles: ['staff', 'manager'],
                department: 'Engineering'     
            },
            params: { taskId: 'task123' },
            body: {},
            app: {
                get: vi.fn((key) => {
                    if (key === 'io') return mockIo;
                    if (key === 'userSockets') return mockUserSockets;
                    return null;
                })
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

    // NOTIF-COMMENT-001: Real-time notification
    describe('addComment - Happy Path', () => {
        it('should create notification for assignees when comment is added (excludes commenter)', async () => {
            const mockTask = {
                _id: 'task123',
                title: 'Implement login feature',
                // ✅ CHANGE: assignees should be objects with populated fields
                assignee: [
                    { _id: 'assignee1', username: 'user1@example.com', department: 'Engineering' },
                    { _id: 'assignee2', username: 'user2@example.com', department: 'Engineering' },
                    { _id: 'commenterUserId', username: 'commenter@example.com', department: 'Engineering' }
                ],
                comments: [],
                save: vi.fn().mockResolvedValue(true)
            };

            req.body = { text: 'Updated the requirements' };
            taskModel.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockTask)
            });
            notificationModel.create.mockResolvedValue({ _id: 'notif123' });

            await taskController.addComment(req, res);

            // Verify response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Comment added successfully',
                data: mockTask
            });

            // Verify comment was added
            expect(mockTask.comments).toHaveLength(1);
            expect(mockTask.comments[0].text).toBe('Updated the requirements');
            expect(mockTask.comments[0].author).toBe('commenterUserId');
            expect(mockTask.save).toHaveBeenCalled();

            // Verify notifications created for assignees (excluding commenter)
            expect(notificationModel.create).toHaveBeenCalledTimes(2);
            expect(notificationModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'assignee1',
                    message: 'commenter@example.com commented on task: "Implement login feature"',
                    task: 'task123'
                })
            );
            expect(notificationModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'assignee2',
                    message: 'commenter@example.com commented on task: "Implement login feature"',
                    task: 'task123'
                })
            );

            // Verify socket events emitted (excluding commenter)
            expect(mockIo.to).toHaveBeenCalledWith('socket123'); // assignee1
            expect(mockIo.to).toHaveBeenCalledWith('socket456'); // assignee2
            expect(mockIo.to).not.toHaveBeenCalledWith('commenterSocket');
            expect(mockIo.emit).toHaveBeenCalledTimes(2);
        });

        // NOTIF-COMMENT-003: User does not receive self-notification
        it('should NOT create notification for the commenter themselves', async () => {
            const mockTask = {
                _id: 'task789',
                title: 'Code review PR #45',
                assignee: [
                    { _id: 'assignee1', username: 'user1@example.com', department: 'Engineering' },
                    { _id: 'commenterUserId', username: 'commenter@example.com', department: 'Engineering' }
                ],
                comments: [],
                save: vi.fn().mockResolvedValue(true)
            };

            req.body = { text: 'I completed the initial review' };
            taskModel.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockTask)
            });
            notificationModel.create.mockResolvedValue({ _id: 'notif456' });

            await taskController.addComment(req, res);

            // Verify only 1 notification created (for assignee1, not commenter)
            expect(notificationModel.create).toHaveBeenCalledTimes(1);
            expect(notificationModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'assignee1' // Only other assignee
                })
            );
            expect(notificationModel.create).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'commenterUserId' // Commenter excluded
                })
            );

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should handle task with no other assignees gracefully (solo assignee comments)', async () => {
            const mockTask = {
                _id: 'task505',
                title: 'Personal note task',
                assignee: [
                    { _id: 'commenterUserId', username: 'commenter@example.com', department: 'Engineering' }
                ],
                comments: [],
                save: vi.fn().mockResolvedValue(true)
            };

            req.body = { text: 'Personal note' };
            taskModel.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockTask)
            });

            await taskController.addComment(req, res);

            // No notifications should be created (no other assignees)
            expect(notificationModel.create).not.toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should handle task with multiple assignees correctly', async () => {
            const mockTask = {
                _id: 'task101',
                title: 'Sprint planning',
                assignee: [
                    { _id: 'user1', username: 'user1@example.com', department: 'Engineering' },
                    { _id: 'user2', username: 'user2@example.com', department: 'Engineering' },
                    { _id: 'user3', username: 'user3@example.com', department: 'Engineering' },
                    { _id: 'commenterUserId', username: 'commenter@example.com', department: 'Engineering' }
                ],
                comments: [],
                save: vi.fn().mockResolvedValue(true)
            };

            mockUserSockets.set('user1', 'socket1');
            mockUserSockets.set('user2', 'socket2');
            mockUserSockets.set('user3', 'socket3');

            req.body = { text: 'Meeting scheduled for Tuesday' };
            taskModel.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockTask)
            });
            notificationModel.create.mockResolvedValue({ _id: 'notif789' });

            await taskController.addComment(req, res);

            // Verify 3 notifications (exclude commenter)
            expect(notificationModel.create).toHaveBeenCalledTimes(3);
            expect(mockIo.emit).toHaveBeenCalledTimes(3);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // NOTIF-COMMENT-004: Validation tests
    describe('addComment - Negative Cases', () => {
        it('should reject empty comment text', async () => {
            req.body = { text: '' };

            await taskController.addComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment text is required'
            });
            expect(taskService.getTaskById).not.toHaveBeenCalled();
            expect(notificationModel.create).not.toHaveBeenCalled();
        });

        it('should reject whitespace-only comment text', async () => {
            req.body = { text: '   ' };

            await taskController.addComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Comment text is required'
            });
        });

        it('should handle task not found error', async () => {
            req.body = { text: 'Valid comment' };
            taskModel.findById.mockReturnValue({
                populate: vi.fn().mockRejectedValue(new Error('Cast to ObjectId failed for value "task123" (type string) at path "_id" for model "Task"'))
            });

            await taskController.addComment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cast to ObjectId failed for value "task123" (type string) at path "_id" for model "Task"'
            });
            expect(notificationModel.create).not.toHaveBeenCalled();
        });

        it('should handle database error during notification creation', async () => {
            const mockTask = {
                _id: 'task999',
                title: 'Test task',
                assignee: [
                    { _id: 'assignee1', username: 'user1@example.com', department: 'Engineering' }
                ],
                comments: [],
                save: vi.fn().mockResolvedValue(true)
            };

            req.body = { text: 'Valid comment' };
            taskModel.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockTask)
            });
            notificationModel.create.mockRejectedValue(new Error('Database error'));

            await taskController.addComment(req, res);

            // Should still save comment but handle notification error gracefully
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    // NOTIF-COMMENT-005: Socket.IO edge cases
    describe('addComment - Socket.IO behavior', () => {
        it('should handle assignees without active socket connections', async () => {
            const mockTask = {
                _id: 'task202',
                title: 'Offline user task',
                assignee: [
                    { _id: 'onlineUser', username: 'online@example.com', department: 'Engineering' },
                    { _id: 'offlineUser', username: 'offline@example.com', department: 'Engineering' },
                    { _id: 'commenterUserId', username: 'commenter@example.com', department: 'Engineering' }
                ],
                comments: [],
                save: vi.fn().mockResolvedValue(true)
            };

            // Only onlineUser has socket connection
            mockUserSockets.clear();
            mockUserSockets.set('onlineUser', 'socketOnline');

            req.body = { text: 'Comment for online and offline users' };
            taskModel.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockTask)
            });
            notificationModel.create.mockResolvedValue({ _id: 'notif101' });

            await taskController.addComment(req, res);

            // Both users should get DB notifications
            expect(notificationModel.create).toHaveBeenCalledTimes(2);
            
            // Only online user gets socket event
            expect(mockIo.to).toHaveBeenCalledWith('socketOnline');
            expect(mockIo.to).toHaveBeenCalledTimes(1);
            expect(mockIo.emit).toHaveBeenCalledTimes(1);
            
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should handle when Socket.IO is not available', async () => {
            const mockTask = {
                _id: 'task303',
                title: 'No socket task',
                assignee: [
                    { _id: 'assignee1', username: 'user1@example.com', department: 'Engineering' },
                    { _id: 'commenterUserId', username: 'commenter@example.com', department: 'Engineering' }
                ],
                comments: [],
                save: vi.fn().mockResolvedValue(true)
            };

            req.app.get = vi.fn((key) => {
                if (key === 'io') return null; // No Socket.IO
                if (key === 'userSockets') return null;
                return null;
            });

            req.body = { text: 'Comment without socket' };
            taskModel.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockTask)
            });
            notificationModel.create.mockResolvedValue({ _id: 'notif202' });

            await taskController.addComment(req, res);

            // DB notification still created
            expect(notificationModel.create).toHaveBeenCalledTimes(1);
            // No socket events (io is null)
            expect(mockIo.emit).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
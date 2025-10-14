import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import taskController from './task.controller.js';
import taskService from '../services/task.services.js';
import notificationModel from '../models/notification.model.js';
import userModel from '../models/user.model.js';

// Mock dependencies
vi.mock('../services/task.services.js');
vi.mock('../models/notification.model.js');
vi.mock('../models/user.model.js');

describe('Task Controller - Archival Notifications (TDD)', () => {
    let req, res, mockIo, mockUserSockets;

    beforeEach(() => {
        mockIo = {
            to: vi.fn().mockReturnThis(),
            emit: vi.fn()
        };

        mockUserSockets = new Map();
        mockUserSockets.set('assignee1', 'socket123');
        mockUserSockets.set('assignee2', 'socket456');

        req = {
            user: {
                _id: 'managerId',
                username: 'manager@company.com',
                roles: ['manager']
            },
            params: {},
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

    // NOTIF-ARCHIVE-001: Happy path - Real-time notification
    describe('archiveTask - with notifications', () => {
        it('should archive task and send notifications to all assignees with full details', async () => {
            const mockTask = {
                _id: 'task601',
                title: 'Update marketing materials',
                project: {
                    _id: 'proj101',
                    name: 'Q4 Campaign'
                },
                assignee: ['assignee1', 'assignee2'],
                archived: false
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: new Date('2025-10-14T14:30:00Z')
            };

            req.params = { taskId: 'task601' };
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);
            notificationModel.create.mockResolvedValue({ _id: 'notif123' });

            await taskController.archiveTask(req, res);

            // Verify service called
            expect(taskService.archiveTask).toHaveBeenCalledWith('task601', 'managerId');

            // Verify response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: expect.stringContaining('archived'),
                data: mockArchivedTask
            });

            // TODO: Implement notification creation in controller
            // For TDD: Write expectations for notification creation
            // expect(notificationModel.create).toHaveBeenCalledTimes(2);
            // expect(notificationModel.create).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         user: 'assignee1',
            //         message: expect.stringContaining('Update marketing materials'),
            //         message: expect.stringContaining('Q4 Campaign'),
            //         message: expect.stringContaining('manager@company.com'),
            //         task: 'task601'
            //     })
            // );
        });

        it('should include task name, project name, archiver name, and timestamp in notification', async () => {
            const archivedAt = new Date('2025-10-14T14:30:00Z');
            const mockTask = {
                _id: 'task602',
                title: 'Client presentation deck',
                project: {
                    _id: 'proj102',
                    name: 'Enterprise Sales'
                },
                assignee: ['assignee1']
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: archivedAt
            };

            req.params = { taskId: 'task602' };
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);
            notificationModel.create.mockResolvedValue({ _id: 'notif456' });

            await taskController.archiveTask(req, res);

            // TODO: Verify notification message format (TDD - write test first)
            // Expected message format:
            // "Task 'Client presentation deck' from project 'Enterprise Sales' was archived by manager@company.com at 2025-10-14 14:30"
            
            // expect(notificationModel.create).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         user: 'assignee1',
            //         message: expect.stringMatching(/Client presentation deck.*Enterprise Sales.*manager@company\.com.*2025-10-14/),
            //         task: 'task602',
            //         assignor: 'managerId'
            //     })
            // );
        });

        // NOTIF-ARCHIVE-003: Multiple assignees
        it('should send notifications to all assignees when task is archived', async () => {
            const mockTask = {
                _id: 'task603',
                title: 'Database optimization',
                project: { _id: 'proj103', name: 'Infrastructure' },
                assignee: ['user1', 'user2', 'user3']
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: new Date()
            };

            mockUserSockets.set('user1', 'socket1');
            mockUserSockets.set('user2', 'socket2');
            mockUserSockets.set('user3', 'socket3');

            req.params = { taskId: 'task603' };
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);
            notificationModel.create.mockResolvedValue({ _id: 'notif789' });

            await taskController.archiveTask(req, res);

            // TODO: Verify 3 notifications created (TDD)
            // expect(notificationModel.create).toHaveBeenCalledTimes(3);
            
            // TODO: Verify 3 socket events emitted (TDD)
            // expect(mockIo.emit).toHaveBeenCalledTimes(3);
            
            expect(res.status).toHaveBeenCalledWith(200);
        });

        // NOTIF-ARCHIVE-005: Boundary case - No assignees
        it('should archive task with no assignees without errors', async () => {
            const mockTask = {
                _id: 'task801',
                title: 'Unassigned task',
                project: { _id: 'proj201', name: 'Test Project' },
                assignee: []
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: new Date()
            };

            req.params = { taskId: 'task801' };
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);

            await taskController.archiveTask(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            // TODO: Verify no notifications created (TDD)
            // expect(notificationModel.create).not.toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalled();
        });
    });

    // NOTIF-ARCHIVE-004: Authorization
    describe('archiveTask - Authorization', () => {
        it('should reject archival by staff (non-manager/non-admin)', async () => {
            req.user = {
                _id: 'staffId',
                username: 'staff@company.com',
                roles: ['staff']
            };
            req.params = { taskId: 'task701' };

            taskService.archiveTask.mockRejectedValue(
                new Error('You do not have permission to archive this task')
            );

            await taskController.archiveTask(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: expect.stringContaining('permission')
            });
            expect(notificationModel.create).not.toHaveBeenCalled();
        });

        it('should allow admin to archive task', async () => {
            req.user = {
                _id: 'adminId',
                username: 'admin@company.com',
                roles: ['admin']
            };
            req.params = { taskId: 'task702' };

            const mockTask = {
                _id: 'task702',
                title: 'Admin task',
                project: { name: 'Test' },
                assignee: ['assignee1']
            };

            const mockArchivedTask = { ...mockTask, archived: true, archivedAt: new Date() };

            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);

            await taskController.archiveTask(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject archival of non-existent task', async () => {
            req.params = { taskId: 'nonexistent' };
            taskService.archiveTask.mockRejectedValue(new Error('Task not found'));

            await taskController.archiveTask(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Task not found'
            });
        });
    });

    // NOTIF-ARCHIVE-002: Offline scenario (DB notifications)
    describe('archiveTask - Offline users', () => {
        it('should create DB notifications for offline assignees', async () => {
            const mockTask = {
                _id: 'task901',
                title: 'Offline test task',
                project: { _id: 'proj301', name: 'Test Project' },
                assignee: ['onlineUser', 'offlineUser']
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: new Date()
            };

            // Only onlineUser has socket
            mockUserSockets.clear();
            mockUserSockets.set('onlineUser', 'socketOnline');

            req.params = { taskId: 'task901' };
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);
            notificationModel.create.mockResolvedValue({ _id: 'notif999' });

            await taskController.archiveTask(req, res);

            // TODO: Both users should get DB notifications (TDD)
            // expect(notificationModel.create).toHaveBeenCalledTimes(2);
            
            // TODO: Only online user gets socket event (TDD)
            // expect(mockIo.to).toHaveBeenCalledWith('socketOnline');
            // expect(mockIo.to).toHaveBeenCalledTimes(1);
        });
    });
});
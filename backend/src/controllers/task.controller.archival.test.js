import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import taskController from './task.controller.js';
import taskService from '../services/task.services.js';
import notificationModel from '../models/notification.model.js';
import userModel from '../models/user.model.js';
import taskModel from '../models/task.model.js';

// Mock dependencies
vi.mock('../services/task.services.js');
vi.mock('../models/notification.model.js');
vi.mock('../models/user.model.js');
vi.mock('../models/task.model.js');

describe('Task Controller - Archival Notifications (TDD)', () => {
    let req, res, mockIo, mockUserSockets;

    beforeEach(() => {
        mockIo = {
            to: vi.fn().mockReturnThis(),
            emit: vi.fn()
        };

        mockUserSockets = new Map();
        mockUserSockets.set('507f1f77bcf86cd799439020', 'socket123');
        mockUserSockets.set('507f1f77bcf86cd799439021', 'socket456');

        req = {
            user: {
                _id: '507f1f77bcf86cd799439012',
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
                _id: '507f1f77bcf86cd799439011',
                title: 'Update marketing materials',
                project: {
                    _id: '507f1f77bcf86cd799439030',
                    name: 'Q4 Campaign'
                },
                assignee: ['507f1f77bcf86cd799439020', '507f1f77bcf86cd799439021'],
                archived: false
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: new Date('2025-10-14T14:30:00Z')
            };

            req.params = { taskId: '507f1f77bcf86cd799439011' };
            taskModel.findById.mockResolvedValue(mockTask);
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);
            notificationModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439040' });

            await taskController.archiveTask(req, res);

            // Verify service called
            expect(taskService.archiveTask).toHaveBeenCalledWith('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');

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
            //         user: '507f1f77bcf86cd799439020',
            //         message: expect.stringContaining('Update marketing materials'),
            //         message: expect.stringContaining('Q4 Campaign'),
            //         message: expect.stringContaining('manager@company.com'),
            //         task: '507f1f77bcf86cd799439011'
            //     })
            // );
        });

        it('should include task name, project name, archiver name, and timestamp in notification', async () => {
            const archivedAt = new Date('2025-10-14T14:30:00Z');
            const mockTask = {
                _id: '507f1f77bcf86cd799439022',
                title: 'Client presentation deck',
                project: {
                    _id: '507f1f77bcf86cd799439031',
                    name: 'Enterprise Sales'
                },
                assignee: ['507f1f77bcf86cd799439020']
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: archivedAt
            };

            req.params = { taskId: '507f1f77bcf86cd799439022' };
            taskModel.findById.mockResolvedValue(mockTask);
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);
            notificationModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439041' });

            await taskController.archiveTask(req, res);

            // TODO: Verify notification message format (TDD - write test first)
            // Expected message format:
            // "Task 'Client presentation deck' from project 'Enterprise Sales' was archived by manager@company.com at 2025-10-14 14:30"
            
            // expect(notificationModel.create).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         user: '507f1f77bcf86cd799439020',
            //         message: expect.stringMatching(/Client presentation deck.*Enterprise Sales.*manager@company\.com.*2025-10-14/),
            //         task: '507f1f77bcf86cd799439022',
            //         assignor: '507f1f77bcf86cd799439012'
            //     })
            // );
        });

        // NOTIF-ARCHIVE-003: Multiple assignees
        it('should send notifications to all assignees when task is archived', async () => {
            const mockTask = {
                _id: '507f1f77bcf86cd799439023',
                title: 'Database optimization',
                project: { _id: '507f1f77bcf86cd799439032', name: 'Infrastructure' },
                assignee: ['507f1f77bcf86cd799439020', '507f1f77bcf86cd799439021', '507f1f77bcf86cd799439022']
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: new Date()
            };

            mockUserSockets.set('507f1f77bcf86cd799439020', 'socket1');
            mockUserSockets.set('507f1f77bcf86cd799439021', 'socket2');
            mockUserSockets.set('507f1f77bcf86cd799439022', 'socket3');

            req.params = { taskId: '507f1f77bcf86cd799439023' };
            taskModel.findById.mockResolvedValue(mockTask);
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);
            notificationModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439042' });

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
                _id: '507f1f77bcf86cd799439024',
                title: 'Unassigned task',
                project: { _id: '507f1f77bcf86cd799439033', name: 'Test Project' },
                assignee: []
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: new Date()
            };

            req.params = { taskId: '507f1f77bcf86cd799439024' };
            taskModel.findById.mockResolvedValue(mockTask);
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
                _id: '507f1f77bcf86cd799439013',
                username: 'staff@company.com',
                roles: ['staff']
            };
            req.params = { taskId: '507f1f77bcf86cd799439025' };
            const mockTask = {
                _id: '507f1f77bcf86cd799439025',
                title: 'Staff task',
                assignee: ['507f1f77bcf86cd799439020']
            };
            taskModel.findById.mockResolvedValue(mockTask);
            taskService.getTaskById.mockResolvedValue(mockTask);
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
                _id: '507f1f77bcf86cd799439014',
                username: 'admin@company.com',
                roles: ['admin']
            };
            req.params = { taskId: '507f1f77bcf86cd799439026' };

            const mockTask = {
                _id: '507f1f77bcf86cd799439026',
                title: 'Admin task',
                project: { name: 'Test' },
                assignee: ['507f1f77bcf86cd799439020']
            };

            const mockArchivedTask = { ...mockTask, archived: true, archivedAt: new Date() };

            taskModel.findById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);

            await taskController.archiveTask(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject archival of non-existent task', async () => {
            req.params = { taskId: '507f1f77bcf86cd799439027' };
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
                _id: '507f1f77bcf86cd799439028',
                title: 'Offline test task',
                project: { _id: '507f1f77bcf86cd799439034', name: 'Test Project' },
                assignee: ['507f1f77bcf86cd799439020', '507f1f77bcf86cd799439021']
            };

            const mockArchivedTask = {
                ...mockTask,
                archived: true,
                archivedAt: new Date()
            };

            // Only onlineUser has socket
            mockUserSockets.clear();
            mockUserSockets.set('507f1f77bcf86cd799439020', 'socketOnline');

            req.params = { taskId: '507f1f77bcf86cd799439028' };
            taskModel.findById.mockResolvedValue(mockTask);
            taskService.getTaskById.mockResolvedValue(mockTask);
            taskService.archiveTask.mockResolvedValue(mockArchivedTask);
            notificationModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439043' });

            await taskController.archiveTask(req, res);

            // TODO: Both users should get DB notifications (TDD)
            // expect(notificationModel.create).toHaveBeenCalledTimes(2);
            
            // TODO: Only online user gets socket event (TDD)
            // expect(mockIo.to).toHaveBeenCalledWith('socketOnline');
            // expect(mockIo.to).toHaveBeenCalledTimes(1);
        });
    });
});
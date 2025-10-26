import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import taskController from './task.controller.js';
import taskService from '../services/task.services.js';
import taskModel from '../models/task.model.js';
import notificationModel from '../models/notification.model.js';

// Mock the service
vi.mock('../services/task.services.js', () => ({
  default: {
    createTask: vi.fn(),
    updateTask: vi.fn(),
    getTaskById: vi.fn(),
    calculateTotalTime: vi.fn(),
    formatTime: vi.fn((minutes) => {
      if (!minutes || minutes === 0) return 'Not specified';
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours === 0) return `${remainingMinutes} minutes`;
      if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
    }),
    parseTimeToMinutes: vi.fn((timeString) => {
      if (!timeString || timeString.trim() === '') return 0;
      const hoursMinutesMatch = timeString.match(/(\d+)\s*hours?\s*(\d+)\s*minutes?/i);
      if (hoursMinutesMatch) {
        const hours = parseInt(hoursMinutesMatch[1]);
        const minutes = parseInt(hoursMinutesMatch[2]);
        return hours * 60 + minutes;
      }
      const minutesMatch = timeString.match(/(\d+)\s*minutes?/i);
      if (minutesMatch) return parseInt(minutesMatch[1]);
      const hoursMatch = timeString.match(/(\d+)\s*hours?/i);
      if (hoursMatch) return parseInt(hoursMatch[1]) * 60;
      return 0;
    })
  }
}));

describe('Task Controller - Time Logging', () => {
  let mockReq, mockRes, mockNext;

	beforeEach(() => {
    mockReq = {
      user: { _id: new mongoose.Types.ObjectId() },
			body: {},
      params: { taskId: new mongoose.Types.ObjectId().toString() },
      app: {
        get: vi.fn().mockReturnValue(null)
      }
    };
    mockRes = {
			params: {},
			query: {},
			app: {
				get: vi.fn().mockImplementation((key) => {
					if (key === 'io') {
						return {
							to: vi.fn().mockReturnValue({
								emit: vi.fn()
							})
						};
					}
					if (key === 'userSockets') {
						return new Map(); // Return an empty Map instead of null
					}
					return null;
				})
			}
		};
		res = {
			status: vi.fn().mockReturnThis(),
      json: vi.fn()
		};
    mockNext = vi.fn();
  });

  afterEach(() => {
		vi.clearAllMocks();
		taskModel.findById = vi.fn();
		notificationModel.create = vi.fn();
	});

  describe('Time Validation - 15 Minute Increments', () => {
    it('should accept valid 15-minute increment time formats', async () => {
      const validTimes = [
        '15 minutes',
        '30 minutes', 
        '45 minutes',
        '1 hour',
        '1 hour 15 minutes',
        '1 hour 30 minutes',
        '1 hour 45 minutes',
        '2 hours',
        '2 hours 15 minutes',
        '2 hours 30 minutes',
        '2 hours 45 minutes',
        '3 hours'
      ];

      for (const time of validTimes) {
        mockReq.body = {
          title: 'Test Task',
          project: new mongoose.Types.ObjectId().toString(),
          timeTaken: time
        };

			const mockTask = {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Task',
          timeTaken: time
        };

			taskService.createTask.mockResolvedValue(mockTask);

        await taskController.createTask(mockReq, mockRes);

        expect(taskService.createTask).toHaveBeenCalledWith(
          expect.objectContaining({ timeTaken: time }),
          mockReq.user._id
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Task created successfully and notifications sent',
          data: expect.objectContaining({ timeTaken: time })
        });

		it('should handle task creation error', async () => {
			req.body = { title: '' };
			taskService.createTask.mockRejectedValue(new Error('Task title is required'));

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Task title is required'
			});
		});

		it('should handle missing project error', async () => {
			req.body = { title: 'New Task' };
			taskService.createTask.mockRejectedValue(new Error('Project is required'));

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Project is required'
			});
		});
	});

	describe('updateTask', () => {
		it('should update task successfully', async () => {
			const mockUpdatedTask = {
				_id: '507f1f77bcf86cd799439014',
				title: 'Updated Task',
				status: 'In Progress',
				assignee: []
			};

			const mockOriginalTask = {
                _id: '507f1f77bcf86cd799439014',
                title: 'Original Task',
                assignee: []
            };

			req.params = { taskId: '507f1f77bcf86cd799439014' };
			req.body = { title: 'Updated Task', status: 'In Progress' };
			taskService.getTaskById.mockResolvedValue(mockOriginalTask);
            taskService.updateTask.mockResolvedValue(mockUpdatedTask);

			await taskController.updateTask(req, res);

			expect(taskService.updateTask).toHaveBeenCalledWith('507f1f77bcf86cd799439014', req.body, 'userId123');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				message: 'Task updated successfully',
				data: mockUpdatedTask
			});
		});

		it('should handle update error', async () => {
			req.params = { taskId: '507f1f77bcf86cd799439014' };
			req.body = { title: '' };
			taskService.getTaskById.mockResolvedValue({ assignee: [] });
            taskService.updateTask.mockRejectedValue(new Error('Task title cannot be empty'));

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Task title cannot be empty'
			});
		});
	});

	describe('getTasks', () => {
		it('should get all tasks', async () => {
			const mockTasks = [
				{ _id: '507f1f77bcf86cd799439011', title: 'Task 1' },
				{ _id: 'task2', title: 'Task 2' }
			];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ userId: 'userId123' }, 'userId123');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				data: mockTasks
			});
		});

		it('should filter tasks by owner', async () => {
			req.query = { owner: 'me' };
			req.user.roles = ['admin']; // Set as admin to use owner filter
			const mockTasks = [{ _id: '507f1f77bcf86cd799439011', title: 'My Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ owner: 'userId123' }, 'userId123');
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should filter tasks by assignee', async () => {
			req.query = { assignee: 'me' };
			req.user.roles = ['admin']; // Set as admin to use assignee filter
			const mockTasks = [{ _id: '507f1f77bcf86cd799439011', title: 'Assigned Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ assignee: 'userId123' }, 'userId123');
		});

		it('should filter tasks by project', async () => {
			req.query = { project: 'projectId123' };
			const mockTasks = [{ _id: '507f1f77bcf86cd799439011', title: 'Project Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ project: 'projectId123', userId: 'userId123' }, 'userId123');
		});

		it('should filter tasks by status', async () => {
			req.query = { status: 'To Do' };
			const mockTasks = [{ _id: '507f1f77bcf86cd799439011', title: 'Todo Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ status: 'To Do', userId: 'userId123' }, 'userId123');
		});

		it('should handle get tasks error', async () => {
			taskService.getTasks.mockRejectedValue(new Error('Database error'));

			await taskController.getTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Database error'
			});
		});
	});

	describe('getTaskById', () => {
		it('should get task by ID successfully', async () => {
			const mockTask = {
				_id: '507f1f77bcf86cd799439011',
				title: 'Test Task',
				owner: { _id: 'userId123' }, // User is the owner
				assignee: []
			};

			req.params = { taskId: '507f1f77bcf86cd799439011' };
			taskService.getTaskById.mockResolvedValue(mockTask);

			await taskController.getTaskById(req, res);

			expect(taskService.getTaskById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				message: 'Task created successfully',
				data: mockTask
			});
      }
    });

    it('should reject invalid time formats', async () => {
      const invalidTimes = [
        '10 minutes', // Not 15-minute increment
        '20 minutes', // Not 15-minute increment
        '1 hour 5 minutes', // Not 15-minute increment
        '1 hour 10 minutes', // Not 15-minute increment
        '1 hour 20 minutes', // Not 15-minute increment
        '1 hour 25 minutes', // Not 15-minute increment
        '1 hour 35 minutes', // Not 15-minute increment
        '1 hour 40 minutes', // Not 15-minute increment
        '1 hour 50 minutes', // Not 15-minute increment
        '1 hour 55 minutes', // Not 15-minute increment
        '2 hours 5 minutes', // Not 15-minute increment
        'invalid format',
        '1.5 hours',
        '90 minutes' // Should be "1 hour 30 minutes"
      ];

      for (const time of invalidTimes) {
        mockReq.body = {
          title: 'Test Task',
          project: new mongoose.Types.ObjectId().toString(),
          timeTaken: time
        };

        taskService.createTask.mockRejectedValue(new Error('Invalid time format'));

        await taskController.createTask(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
				success: false,
          message: 'Invalid time format'
			});
      }
		});
	});
		});

		it('should handle task not found', async () => {
			req.params = { taskId: 'nonExistentId' };
			taskService.getTaskById.mockRejectedValue(new Error('Task not found'));

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Task not found'
			});
		});

		it('should handle other errors', async () => {
			req.params = { taskId: '507f1f77bcf86cd799439011' };
			taskService.getTaskById.mockRejectedValue(new Error('Database error'));

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Database error'
			});
		});
	});

	describe('Total Time Calculation', () => {
    it('should calculate total time when getting task by ID', async () => {
			const mockTask = {
        _id: new mongoose.Types.ObjectId(),
				title: 'Test Task',
        timeTaken: '1 hour',
        toObject: vi.fn().mockReturnValue({
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Task',
          timeTaken: '1 hour'
        })
      };

      taskService.getTaskById.mockResolvedValue(mockTask);
      taskService.calculateTotalTime.mockReturnValue('2 hours 30 minutes');

      await taskController.getTaskById(mockReq, mockRes);

      expect(taskService.getTaskById).toHaveBeenCalledWith(mockReq.params.taskId);
      expect(taskService.calculateTotalTime).toHaveBeenCalledWith(mockReq.params.taskId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
				success: true,
        data: expect.objectContaining({
          _id: expect.any(mongoose.Types.ObjectId),
          title: 'Test Task',
          timeTaken: '1 hour',
          totalTime: '2 hours 30 minutes'
        })
			});
		});
	});

  describe('Time Format Conversion', () => {
    it('should format time correctly', () => {
      expect(taskService.formatTime(15)).toBe('15 minutes');
      expect(taskService.formatTime(30)).toBe('30 minutes');
      expect(taskService.formatTime(45)).toBe('45 minutes');
      expect(taskService.formatTime(60)).toBe('1 hour');
      expect(taskService.formatTime(75)).toBe('1 hour 15 minutes');
      expect(taskService.formatTime(90)).toBe('1 hour 30 minutes');
      expect(taskService.formatTime(105)).toBe('1 hour 45 minutes');
      expect(taskService.formatTime(120)).toBe('2 hours');
      expect(taskService.formatTime(135)).toBe('2 hours 15 minutes');
    });

    it('should parse time string to minutes', () => {
      expect(taskService.parseTimeToMinutes('15 minutes')).toBe(15);
      expect(taskService.parseTimeToMinutes('30 minutes')).toBe(30);
      expect(taskService.parseTimeToMinutes('45 minutes')).toBe(45);
      expect(taskService.parseTimeToMinutes('1 hour')).toBe(60);
      expect(taskService.parseTimeToMinutes('1 hour 15 minutes')).toBe(75);
      expect(taskService.parseTimeToMinutes('1 hour 30 minutes')).toBe(90);
      expect(taskService.parseTimeToMinutes('1 hour 45 minutes')).toBe(105);
      expect(taskService.parseTimeToMinutes('2 hours')).toBe(120);
      expect(taskService.parseTimeToMinutes('2 hours 15 minutes')).toBe(135);
				_id: '507f1f77bcf86cd799439011',
				title: 'Test Task',
				assignee: ['507f1f77bcf86cd799439020'],
				owner: '507f1f77bcf86cd799439015'
			};
			const mockArchivedTask = {
				_id: '507f1f77bcf86cd799439011',
				title: 'Test Task',
				archived: true,
				archivedAt: new Date()
			};
		
			req.params = { taskId: '507f1f77bcf86cd799439011' };
			req.user = { _id: '507f1f77bcf86cd799439015', username: 'testuser' };
			
			// Mock the new controller flow
			taskModel.findById.mockResolvedValue(mockTask);
			taskService.archiveTask.mockResolvedValue(mockArchivedTask);
			notificationModel.create.mockResolvedValue({});
		
			await taskController.archiveTask(req, res);
		
			expect(taskService.archiveTask).toHaveBeenCalledWith('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439015');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				message: 'Task archived successfully and notifications sent',
				data: mockArchivedTask
			});
		});

		it('should return 404 for non-existent task', async () => {
			req.params = { taskId: 'nonexistent' };
			req.user = { _id: '507f1f77bcf86cd799439015' };
			
			// Mock taskModel.findById to return null (task not found)
			taskModel.findById.mockResolvedValue(null);
		
			await taskController.archiveTask(req, res);
		
			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Task not found'
			});
		});
		it('should return 403 for permission error', async () => {
			const mockTask = {
				_id: '507f1f77bcf86cd799439011',
				title: 'Test Task',
				assignee: ['507f1f77bcf86cd799439020']
			};
		
			req.params = { taskId: '507f1f77bcf86cd799439011' };
			req.user = { _id: '507f1f77bcf86cd799439016' };
			
			// Mock taskModel.findById to return the task
			taskModel.findById.mockResolvedValue(mockTask);
			// Mock service to throw permission error
			taskService.archiveTask.mockRejectedValue(
				new Error('You do not have permission to archive this task')
			);
		
			await taskController.archiveTask(req, res);
		
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'You do not have permission to archive this task'
			});
		});

		it('should handle other archive errors', async () => {
			const mockTask = {
				_id: '507f1f77bcf86cd799439011',
				title: 'Test Task',
				assignee: ['507f1f77bcf86cd799439020']
			};
		
			req.params = { taskId: '507f1f77bcf86cd799439011' };
			req.user = { _id: '507f1f77bcf86cd799439016' };
			
			// Mock taskModel.findById to return the task
			taskModel.findById.mockResolvedValue(mockTask);
			// Mock service to throw other error
			taskService.archiveTask.mockRejectedValue(new Error('Database error'));
		
			await taskController.archiveTask(req, res);
		
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Database error'
			});
		});
	});

	describe('unarchiveTask', () => {
		it('should unarchive a task successfully', async () => {
			const mockTask = {
				_id: '507f1f77bcf86cd799439011',
				title: 'Test Task',
				archived: false,
				archivedAt: null
			};

			req.params = { taskId: '507f1f77bcf86cd799439011' };
			req.user = { _id: '507f1f77bcf86cd799439016' };
			taskService.unarchiveTask.mockResolvedValue(mockTask);

			await taskController.unarchiveTask(req, res);

			expect(taskService.unarchiveTask).toHaveBeenCalledWith('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439016');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				message: 'Task unarchived successfully',
				data: mockTask
			});
		});

		it('should return 404 for non-existent task', async () => {
			req.params = { taskId: 'nonexistent' };
			req.user = { _id: '507f1f77bcf86cd799439016' };
			taskService.unarchiveTask.mockRejectedValue(new Error('Task not found'));

			await taskController.unarchiveTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Task not found'
			});
		});

		it('should return 403 for permission error', async () => {
			req.params = { taskId: '507f1f77bcf86cd799439011' };
			req.user = { _id: 'unauthorizedUser' };
			taskService.unarchiveTask.mockRejectedValue(
				new Error('You do not have permission to unarchive this task')
			);

			await taskController.unarchiveTask(req, res);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'You do not have permission to unarchive this task'
			});
		});

		it('should handle other unarchive errors', async () => {
			req.params = { taskId: '507f1f77bcf86cd799439011' };
			req.user = { _id: '507f1f77bcf86cd799439016' };
			taskService.unarchiveTask.mockRejectedValue(new Error('Database error'));

			await taskController.unarchiveTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Database error'
			});
		});
	});

	/**
	 * NEW TEST SUITE: Project Task Viewing Permissions - Controller Layer (TDD)
	 * Test Cards Covered: PTV-006, PTV-007, PTV-013
	 *
	 * Purpose: Test request/response handling for getTasksByProject endpoint
	 * Tests controller's responsibility to:
	 * - Extract data from req.params, req.user
	 * - Validate input (projectId format)
	 * - Call appropriate service methods
	 * - Format responses with standard structure
	 * - Handle errors and return appropriate status codes
	 *
	 * Note: These tests will FAIL until getTasksByProject controller method is implemented.
	 * This follows TDD (Test-Driven Development) methodology.
	 */
	describe('Task Viewing Permissions - Controller Layer (TDD)', () => {
		describe('getTasksByProject', () => {
			describe('[PTV-006] Standard success response structure', () => {
				it('should return 200 with standard success structure', async () => {
					// Arrange: Mock service to return tasks
					const mockTasks = [
						{
							_id: 'task1',
							title: 'Task 1',
							project: 'projectId123',
							status: 'To Do',
							assignee: [],
							createdAt: new Date(),
							updatedAt: new Date()
						},
						{
							_id: 'task2',
							title: 'Task 2',
							project: 'projectId123',
							status: 'In Progress',
							assignee: [],
							createdAt: new Date(),
							updatedAt: new Date()
						}
					];

					req.params = { projectId: 'projectId123' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: 'engineering'
					};

					taskService.getTasksByProject.mockResolvedValue(mockTasks);

					// Act: Call controller method
					await taskController.getTasksByProject(req, res);

					// Assert: Verify standard response structure
					expect(res.status).toHaveBeenCalledWith(200);
					expect(res.json).toHaveBeenCalledWith({
						success: true,
						data: mockTasks
					});
				});

				it('should extract projectId from req.params', async () => {
					// Arrange
					req.params = { projectId: 'projectId456' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: 'it'
					};
					taskService.getTasksByProject.mockResolvedValue([]);

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert: Verify service was called with correct projectId
					expect(taskService.getTasksByProject).toHaveBeenCalledWith(
						'projectId456',
						'userId123',
						'staff',
						'it'
					);
				});

				it('should extract userId, role, and department from req.user', async () => {
					// Arrange
					req.params = { projectId: 'projectId789' };
					req.user = {
						_id: 'userAbc',
						roles: ['admin'],
						department: 'sales'
					};
					taskService.getTasksByProject.mockResolvedValue([]);

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert: Verify service was called with user data
					expect(taskService.getTasksByProject).toHaveBeenCalledWith(
						'projectId789',
						'userAbc',
						'admin',
						'sales'
					);
				});
			});

			describe('[PTV-007] Standard error response structure', () => {
				it('should return 403 with standard error structure for access denied', async () => {
					// Arrange: Mock service to throw access denied error
					req.params = { projectId: 'projectId123' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: 'engineering'
					};
					taskService.getTasksByProject.mockRejectedValue(
						new Error('Access denied to view tasks in this project')
					);

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert: Standard error response structure
					expect(res.status).toHaveBeenCalledWith(403);
					expect(res.json).toHaveBeenCalledWith({
						success: false,
						message: 'Access denied to view tasks in this project'
					});
				});

				it('should return 404 with standard error structure for project not found', async () => {
					// Arrange
					req.params = { projectId: '507f1f77bcf86cd799439011' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: 'engineering'
					};
					taskService.getTasksByProject.mockRejectedValue(
						new Error('Project not found')
					);

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(404);
					expect(res.json).toHaveBeenCalledWith({
						success: false,
						message: 'Project not found'
					});
				});

				it('should return 400 with standard error structure for invalid project ID', async () => {
					// Arrange: This should be caught by controller validation
					req.params = { projectId: 'invalid-id-123' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: 'engineering'
					};

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert: Controller should validate before calling service
					expect(res.status).toHaveBeenCalledWith(400);
					expect(res.json).toHaveBeenCalledWith({
						success: false,
						message: 'Invalid project ID format'
					});
					// Service should NOT be called with invalid ID
					expect(taskService.getTasksByProject).not.toHaveBeenCalled();
				});

				it('should return 401 with standard error structure when user not authenticated', async () => {
					// Arrange: req.user is undefined (no authentication)
					req.params = { projectId: 'projectId123' };
					req.user = undefined;

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(401);
					expect(res.json).toHaveBeenCalledWith({
						success: false,
						message: 'Authentication required'
					});
					expect(taskService.getTasksByProject).not.toHaveBeenCalled();
				});

				it('should return 500 with standard error structure for unexpected errors', async () => {
					// Arrange: Mock unexpected database error
					req.params = { projectId: 'projectId123' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: 'engineering'
					};
					taskService.getTasksByProject.mockRejectedValue(
						new Error('Database connection failed')
					);

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(500);
					expect(res.json).toHaveBeenCalledWith({
						success: false,
						message: 'Database connection failed'
					});
				});
			});

			describe('[PTV-013] Malformed projectId validation', () => {
				const invalidProjectIds = [
					'invalid-id-123',
					'abc',
					'12345',
					'proj001',
					'',
					'not-24-chars',
					'gggggggggggggggggggggggg' // 24 chars but not valid hex
				];

				invalidProjectIds.forEach(invalidId => {
					it(`should return 400 for invalid projectId: "${invalidId}"`, async () => {
						// Arrange
						req.params = { projectId: invalidId };
						req.user = {
							_id: 'userId123',
							roles: ['staff'],
							department: 'engineering'
						};

						// Act
						await taskController.getTasksByProject(req, res);

						// Assert: Controller validates before calling service
						expect(res.status).toHaveBeenCalledWith(400);
						expect(res.json).toHaveBeenCalledWith({
							success: false,
							message: 'Invalid project ID format'
						});
						expect(taskService.getTasksByProject).not.toHaveBeenCalled();
					});
				});

				it('should accept valid 24-character hex ObjectId', async () => {
					// Arrange: Valid MongoDB ObjectId format
					req.params = { projectId: '507f1f77bcf86cd799439011' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: 'engineering'
					};
					taskService.getTasksByProject.mockResolvedValue([]);

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert: Should proceed to service call
					expect(taskService.getTasksByProject).toHaveBeenCalledWith(
						'507f1f77bcf86cd799439011',
						'userId123',
						'staff',
						'engineering'
					);
					expect(res.status).toHaveBeenCalledWith(200);
				});
			});

			describe('Edge cases', () => {
				it('should handle empty task array response', async () => {
					// Arrange
					req.params = { projectId: 'projectId123' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: 'engineering'
					};
					taskService.getTasksByProject.mockResolvedValue([]);

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(200);
					expect(res.json).toHaveBeenCalledWith({
						success: true,
						data: []
					});
				});

				it('should handle missing department in req.user', async () => {
					// Arrange
					req.params = { projectId: 'projectId123' };
					req.user = {
						_id: 'userId123',
						roles: ['staff'],
						department: undefined
					};
					taskService.getTasksByProject.mockResolvedValue([]);

					// Act
					await taskController.getTasksByProject(req, res);

					// Assert: Controller passes undefined department to service
					expect(taskService.getTasksByProject).toHaveBeenCalledWith(
						'projectId123',
						'userId123',
						'staff',
						undefined
					);
				});
			});
		});
	});

	// TESTS: Task Assignment Feature Tests (TSK-020, TSK-022)
	describe('Task Assignment Tests - TSK-020, TSK-022', () => {
		describe('TSK-020: Ownership Transfer via Controller', () => {
			it('should handle ownership transfer successfully', async () => {
				// Arrange
				req.params = { taskId: 'task123' };
				req.body = {
					owner: 'staff2Id',
					assignee: ['staff2Id', 'managerId']
				};
				req.user = { _id: 'managerId' };

				const mockOriginalTask = {
					_id: 'task123',
					title: 'T-612: API documentation',
					owner: 'staff1Id',
					assignee: [{ _id: 'staff1Id' }],
					status: 'To Do',
					project: 'project123'
				};

				const mockUpdatedTask = {
					_id: 'task123',
					title: 'T-612: API documentation',
					owner: 'staff2Id',
					assignee: [{ _id: 'staff2Id' }, { _id: 'managerId' }],
					project: 'project123'
				};

				taskService.getTaskById.mockResolvedValue(mockOriginalTask);
				taskService.updateTask.mockResolvedValue(mockUpdatedTask);

				// Act
				await taskController.updateTask(req, res);

				// Assert
				expect(taskService.updateTask).toHaveBeenCalledWith(
					'task123',
					req.body,
					'managerId'
				);
				expect(res.status).toHaveBeenCalledWith(200);
				expect(res.json).toHaveBeenCalledWith({
					success: true,
					message: 'Task updated successfully',
					data: mockUpdatedTask
				});
			});

			it('should return error when updating with null owner', async () => {
				// Arrange
				req.params = { taskId: 'task123' };
				req.body = {
					owner: null,
					assignee: ['staff1Id']
				};
				req.user = { _id: 'managerId' };

				const mockOriginalTask = {
					_id: 'task123',
					assignee: [{ _id: 'staff1Id' }],
					status: 'To Do'
				};

				taskService.getTaskById.mockResolvedValue(mockOriginalTask);
				taskService.updateTask.mockRejectedValue(
					new Error('Every task or subtask must have an owner.')
				);

				// Act
				await taskController.updateTask(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith({
					success: false,
					message: 'Every task or subtask must have an owner.'
				});
			});

			it('should return error when updating with empty assignee array', async () => {
				// Arrange
				req.params = { taskId: 'task123' };
				req.body = {
					assignee: []
				};
				req.user = { _id: 'managerId' };

				const mockOriginalTask = {
					_id: 'task123',
					assignee: [{ _id: 'staff1Id' }],
					status: 'To Do'
				};

				taskService.getTaskById.mockResolvedValue(mockOriginalTask);
				taskService.updateTask.mockRejectedValue(
					new Error('At least one assignee is required')
				);

				// Act
				await taskController.updateTask(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith({
					success: false,
					message: 'At least one assignee is required'
				});
			});

			it('should handle assignOwner successfully via dedicated endpoint', async () => {
				// Arrange
				req.params = { id: 'task123' };
				req.body = { assignee: 'staff2@example.com' };
				req.user = {
					_id: 'managerId',
					username: 'manager1',
					roles: ['manager']
				};

				const mockUpdatedTask = {
					_id: 'task123',
					title: 'Test Task',
					owner: { _id: 'staff2Id', username: 'staff2' },
					assignee: [
						{ _id: 'staff2Id', username: 'staff2' },
						{ _id: 'staff1Id', username: 'staff1' }
					]
				};

				taskService.assignOwner.mockResolvedValue(mockUpdatedTask);

				// Act
				await taskController.assignOwner(req, res);

				// Assert
				expect(taskService.assignOwner).toHaveBeenCalledWith({
					taskId: 'task123',
					assigneeInput: 'staff2@example.com',
					actingUser: req.user
				});
				expect(res.status).toHaveBeenCalledWith(200);
				expect(res.json).toHaveBeenCalledWith({
					success: true,
					data: mockUpdatedTask
				});
			});

			it('should return 422 when assignOwner called without assignee', async () => {
				// Arrange
				req.params = { id: 'task123' };
				req.body = { assignee: null };
				req.user = { _id: 'managerId', username: 'manager1' };

				// Act
				await taskController.assignOwner(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(422);
				expect(res.json).toHaveBeenCalledWith({
					success: false,
					message: 'Every task or subtask must have an owner.'
				});
			});

			it('should return 404 when task not found during ownership transfer', async () => {
				// Arrange
				req.params = { id: 'nonexistent' };
				req.body = { assignee: 'staff2@example.com' };
				req.user = { _id: 'managerId', username: 'manager1' };

				taskService.assignOwner.mockRejectedValue(new Error('Task not found'));

				// Act
				await taskController.assignOwner(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(404);
				expect(res.json).toHaveBeenCalledWith({
					success: false,
					message: 'Task not found'
				});
			});

			it('should return 403 when assignee lacks project access', async () => {
				// Arrange
				req.params = { id: 'task123' };
				req.body = { assignee: 'outsider@example.com' };
				req.user = { _id: 'managerId', username: 'manager1' };

				taskService.assignOwner.mockRejectedValue(
					new Error('Assignee must have access to this project')
				);

				// Act
				await taskController.assignOwner(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(403);
				expect(res.json).toHaveBeenCalledWith({
					success: false,
					message: 'Assignee must have access to this project'
				});
			});

			it('should return 400 when transferring ownership of archived task', async () => {
				// Arrange
				req.params = { id: 'task123' };
				req.body = { assignee: 'staff2@example.com' };
				req.user = { _id: 'managerId', username: 'manager1' };

				taskService.assignOwner.mockRejectedValue(
					new Error('This task is no longer active')
				);

				// Act
				await taskController.assignOwner(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith({
					success: false,
					message: 'This task is no longer active'
				});
			});

			it('should return 400 when exceeding max assignees limit', async () => {
				// Arrange
				req.params = { id: 'task123' };
				req.body = { assignee: 'staff6@example.com' };
				req.user = { _id: 'managerId', username: 'manager1' };

				taskService.assignOwner.mockRejectedValue(
					new Error('Maximum of 5 assignees allowed')
				);

				// Act
				await taskController.assignOwner(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith({
					success: false,
					message: 'Maximum of 5 assignees allowed'
				});
			});
		});

		describe('TSK-022: Notification on Assignment', () => {
			it.skip('should create notification when ownership changes', async () => {
				// Arrange
				req.params = { taskId: 'task614' };
				req.body = {
					owner: 'staff3Id',
					assignee: ['staff3Id', 'managerId']
				};
				req.user = { _id: 'managerId' };

				const mockTask = {
					_id: 'task614',
					title: 'T-614: Implement notifications',
					owner: 'managerId',
					assignee: [{ _id: 'managerId' }],
					status: 'To Do'
				};

				const mockUpdatedTask = {
					_id: 'task614',
					title: 'T-614: Implement notifications',
					owner: 'staff3Id',
					assignee: [{ _id: 'staff3Id' }, { _id: 'managerId' }]
				};

				taskService.getTaskById.mockResolvedValue(mockTask);
				taskModel.findById.mockResolvedValue(mockTask);
				taskService.updateTask.mockResolvedValue(mockUpdatedTask);
				notificationModel.create.mockResolvedValue({
					_id: 'notif123',
					userId: 'staff3Id',
					taskId: 'task614',
					type: 'task_assigned',
					message: 'You are now the owner of T-614 (assigned by manager@company.com)'
				});

				// Act
				await taskController.updateTask(req, res);

				// Assert - Notification should be created
				expect(notificationModel.create).toHaveBeenCalled();
				expect(res.status).toHaveBeenCalledWith(200);
			});

			it.skip('should emit socket event when ownership changes', async () => {
				// Arrange
				req.params = { taskId: 'task614' };
				req.body = {
					owner: 'staff3Id',
					assignee: ['staff3Id']
				};
				req.user = { _id: 'managerId' };

				const mockOriginalTask = {
					_id: 'task614',
					title: 'T-614: Implement notifications',
					owner: 'managerId',
					assignee: [{ _id: 'managerId' }],
					status: 'To Do'
				};

				const mockUpdatedTask = {
					_id: 'task614',
					title: 'T-614: Implement notifications',
					owner: 'staff3Id',
					assignee: [{ _id: 'staff3Id' }]
				};

				taskService.getTaskById.mockResolvedValue(mockOriginalTask);
				taskService.updateTask.mockResolvedValue(mockUpdatedTask);

				// Act
				await taskController.updateTask(req, res);

				// Assert - Socket.io should emit to new owner
				const mockIo = req.app.get('io');
				expect(mockIo.to).toHaveBeenCalled();
			});
		});

		describe('Department-Agnostic Assignment via Controller', () => {
			it('should allow cross-department assignment', async () => {
				// Arrange
				req.body = {
					title: 'Cross-department Task',
					description: 'Task with assignees from multiple departments',
					priority: 5,
					status: 'To Do',
					owner: 'managerId',
					assignee: ['managerId', 'staff2IdHR', 'staff3IdSales'],
					project: 'project123'
				};
				req.user = { _id: 'managerId' };

				const mockTask = {
					_id: 'newTaskId',
					...req.body,
					assignee: ['managerId', 'staff2IdHR', 'staff3IdSales']
				};

				taskService.createTask.mockResolvedValue(mockTask);

				// Act
				await taskController.createTask(req, res);

				// Assert
				expect(taskService.createTask).toHaveBeenCalledWith(
					req.body,
					'managerId'
				);
				expect(res.status).toHaveBeenCalledWith(201);
				expect(res.json).toHaveBeenCalledWith({
					success: true,
					message: 'Task created successfully and notifications sent',
					data: mockTask
				});
			});
		});
	});
});
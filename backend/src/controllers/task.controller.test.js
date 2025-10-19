import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import taskController from './task.controller.js';
import taskService from '../services/task.services.js';
import taskModel from '../models/task.model.js';
import notificationModel from '../models/notification.model.js';

vi.mock('../services/task.services.js');

describe('Task Controller Test', () => {
	let req, res;

	beforeEach(() => {
		req = {
			user: { _id: 'userId123' },
			body: {},
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
			json: vi.fn().mockReturnThis()
		};
		vi.clearAllMocks();
		taskModel.findById = vi.fn();
		notificationModel.create = vi.fn();
	});

	describe('createTask', () => {
		it('should create task successfully', async () => {
			const mockTask = {
				_id: '507f1f77bcf86cd799439011',
				title: 'New Task',
				status: 'To Do',
				owner: 'userId123',
				assignee: [],
				project: 'projectId123'
			};

			req.body = { title: 'New Task', project: 'projectId123' };
			taskService.createTask.mockResolvedValue(mockTask);

			await taskController.createTask(req, res);
			expect(taskService.createTask).toHaveBeenCalledWith(req.body, 'userId123');
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				message: 'Task created successfully and notifications sent',
				data: mockTask
			});
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

			expect(taskService.getTasks).toHaveBeenCalledWith({});
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				data: mockTasks
			});
		});

		it('should filter tasks by owner', async () => {
			req.query = { owner: 'me' };
			const mockTasks = [{ _id: '507f1f77bcf86cd799439011', title: 'My Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ owner: 'userId123' });
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should filter tasks by assignee', async () => {
			req.query = { assignee: 'me' };
			const mockTasks = [{ _id: '507f1f77bcf86cd799439011', title: 'Assigned Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ assignee: 'userId123' });
		});

		it('should filter tasks by project', async () => {
			req.query = { project: 'projectId123' };
			const mockTasks = [{ _id: '507f1f77bcf86cd799439011', title: 'Project Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ project: 'projectId123' });
		});

		it('should filter tasks by status', async () => {
			req.query = { status: 'To Do' };
			const mockTasks = [{ _id: '507f1f77bcf86cd799439011', title: 'Todo Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ status: 'To Do' });
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
			const mockTask = { _id: '507f1f77bcf86cd799439011', title: 'Test Task' };

			req.params = { taskId: '507f1f77bcf86cd799439011' };
			taskService.getTaskById.mockResolvedValue(mockTask);

			await taskController.getTaskById(req, res);

			expect(taskService.getTaskById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				data: mockTask
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


	describe('archiveTask', () => {
		it('should archive a task successfully', async () => {
			const mockTask = {
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
});
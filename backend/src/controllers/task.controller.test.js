import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import taskController from './task.controller.js';
import taskService from '../services/task.services.js';

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
                get: vi.fn().mockReturnValue(null) // Return null for 'io' and 'userSockets'
            }
		};
		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis()
		};
		vi.clearAllMocks();
	});

	describe('createTask', () => {
		it('should create task successfully', async () => {
			const mockTask = {
				_id: 'taskId123',
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
				_id: 'taskId123',
				title: 'Updated Task',
				status: 'In Progress',
				assignee: []
			};

			const mockOriginalTask = {
                _id: 'taskId123',
                title: 'Original Task',
                assignee: []
            };

			req.params = { taskId: 'taskId123' };
			req.body = { title: 'Updated Task', status: 'In Progress' };
			taskService.getTaskById.mockResolvedValue(mockOriginalTask);
            taskService.updateTask.mockResolvedValue(mockUpdatedTask);

			await taskController.updateTask(req, res);

			expect(taskService.updateTask).toHaveBeenCalledWith('taskId123', req.body, 'userId123');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				message: 'Task updated successfully',
				data: mockUpdatedTask
			});
		});

		it('should handle update error', async () => {
			req.params = { taskId: 'taskId123' };
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
				{ _id: 'task1', title: 'Task 1' },
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
			const mockTasks = [{ _id: 'task1', title: 'My Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ owner: 'userId123' });
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should filter tasks by assignee', async () => {
			req.query = { assignee: 'me' };
			const mockTasks = [{ _id: 'task1', title: 'Assigned Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ assignee: 'userId123' });
		});

		it('should filter tasks by project', async () => {
			req.query = { project: 'projectId123' };
			const mockTasks = [{ _id: 'task1', title: 'Project Task' }];

			taskService.getTasks.mockResolvedValue(mockTasks);

			await taskController.getTasks(req, res);

			expect(taskService.getTasks).toHaveBeenCalledWith({ project: 'projectId123' });
		});

		it('should filter tasks by status', async () => {
			req.query = { status: 'To Do' };
			const mockTasks = [{ _id: 'task1', title: 'Todo Task' }];

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
			const mockTask = { _id: 'taskId123', title: 'Test Task' };

			req.params = { taskId: 'taskId123' };
			taskService.getTaskById.mockResolvedValue(mockTask);

			await taskController.getTaskById(req, res);

			expect(taskService.getTaskById).toHaveBeenCalledWith('taskId123');
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
			req.params = { taskId: 'taskId123' };
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
				_id: 'taskId123',
				title: 'Test Task',
				archived: true,
				archivedAt: new Date()
			};

			req.params = { taskId: 'taskId123' };
			req.user = { _id: 'userId123' };
			taskService.archiveTask.mockResolvedValue(mockTask);

			await taskController.archiveTask(req, res);

			expect(taskService.archiveTask).toHaveBeenCalledWith('taskId123', 'userId123');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				message: 'Task archived successfully',
				data: mockTask
			});
		});

		it('should return 404 for non-existent task', async () => {
			req.params = { taskId: 'nonexistent' };
			req.user = { _id: 'userId123' };
			taskService.archiveTask.mockRejectedValue(new Error('Task not found'));

			await taskController.archiveTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Task not found'
			});
		});

		it('should return 403 for permission error', async () => {
			req.params = { taskId: 'taskId123' };
			req.user = { _id: 'unauthorizedUser' };
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
			req.params = { taskId: 'taskId123' };
			req.user = { _id: 'userId123' };
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
				_id: 'taskId123',
				title: 'Test Task',
				archived: false,
				archivedAt: null
			};

			req.params = { taskId: 'taskId123' };
			req.user = { _id: 'userId123' };
			taskService.unarchiveTask.mockResolvedValue(mockTask);

			await taskController.unarchiveTask(req, res);

			expect(taskService.unarchiveTask).toHaveBeenCalledWith('taskId123', 'userId123');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				success: true,
				message: 'Task unarchived successfully',
				data: mockTask
			});
		});

		it('should return 404 for non-existent task', async () => {
			req.params = { taskId: 'nonexistent' };
			req.user = { _id: 'userId123' };
			taskService.unarchiveTask.mockRejectedValue(new Error('Task not found'));

			await taskController.unarchiveTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Task not found'
			});
		});

		it('should return 403 for permission error', async () => {
			req.params = { taskId: 'taskId123' };
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
			req.params = { taskId: 'taskId123' };
			req.user = { _id: 'userId123' };
			taskService.unarchiveTask.mockRejectedValue(new Error('Database error'));

			await taskController.unarchiveTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Database error'
			});
		});
	});
});
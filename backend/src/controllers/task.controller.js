import taskService from '../services/task.services.js';

class TaskController {
    async createTask(req, res) {
        try {
            const userId = req.user._id;
            const task = await taskService.createTask(req.body, userId);

            res.status(201).json({
                success: true,
                message: 'Task created successfully',
                data: task
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateTask(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user._id;

            const updatedTask = await taskService.updateTask(taskId, req.body, userId);

            res.status(200).json({
                success: true,
                message: 'Task updated successfully',
                data: updatedTask
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTasks(req, res) {
        try {
            const filters = {};

            if (req.query.owner === 'me') {
                filters.owner = req.user._id;
            } else if (req.query.owner) {
                filters.owner = req.query.owner;
            }

            if (req.query.assignee === 'me') {
                filters.assignee = req.user._id;
            } else if (req.query.assignee) {
                filters.assignee = req.query.assignee;
            }

            if (req.query.project) {
                filters.project = req.query.project;
            }

            if (req.query.standalone === 'true') {
                filters.standalone = true;
            }

            if (req.query.status) {
                filters.status = req.query.status;
            }

            const tasks = await taskService.getTasks(filters);

            res.status(200).json({
                success: true,
                data: tasks
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTaskById(req, res) {
        try {
            const { taskId } = req.params;
            const task = await taskService.getTaskById(taskId);

            res.status(200).json({
                success: true,
                data: task
            });
        } catch (error) {
            const statusCode = error.message === 'Task not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteTask(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user._id;

            await taskService.deleteTask(taskId, userId);

            res.status(200).json({
                success: true,
                message: 'Task deleted successfully'
            });
        } catch (error) {
            const statusCode = error.message === 'Task not found' ? 404 :
                             error.message.includes('permission') ? 403 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new TaskController();
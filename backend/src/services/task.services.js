import Task from '../models/task.model.js';
import Project from '../models/project.model.js';

class TaskService {
    async createTask(taskData, userId) {
        const { title, description, project, dueDate, assignee } = taskData;

        if (!title || title.trim() === '') {
            throw new Error('Task title is required');
        }

        const newTaskData = {
            title: title.trim(),
            description: description || '',
            status: 'To Do',
            owner: userId,
            assignee: assignee || userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (dueDate) {
            const parsedDueDate = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (parsedDueDate < today) {
                throw new Error('Due date cannot be in the past');
            }
            newTaskData.dueDate = parsedDueDate;
        }

        if (project) {
            const projectExists = await Project.findById(project);
            if (!projectExists) {
                throw new Error('Selected project does not exist');
            }
            newTaskData.project = project;
        }

        const task = new Task(newTaskData);
        return await task.save();
    }

    async updateTask(taskId, updateData, userId) {
        // STEP 1: Validate input data FIRST (before checking task existence or permissions)
        if (updateData.title !== undefined) {
            if (!updateData.title || updateData.title.trim() === '') {
                throw new Error('Title cannot be empty');
            }
        }

        if (updateData.dueDate !== undefined && updateData.dueDate) {
            const parsedDueDate = new Date(updateData.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (parsedDueDate < today) {
                throw new Error('Due date cannot be in the past');
            }
        }

        // STEP 2: Check if task exists
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // STEP 3: Check permissions AFTER validation
        const hasPermission = task.owner.toString() === userId.toString() ||
                            task.assignee?.toString() === userId.toString();

        if (!hasPermission) {
            throw new Error('You do not have permission to modify this task');
        }

        // STEP 4: Apply validated updates
        if (updateData.title !== undefined) {
            task.title = updateData.title.trim();
        }

        if (updateData.dueDate !== undefined) {
            if (updateData.dueDate) {
                task.dueDate = new Date(updateData.dueDate);
            } else {
                task.dueDate = null;
            }
        }

        if (updateData.description !== undefined) {
            task.description = updateData.description;
        }

        if (updateData.status !== undefined) {
            task.status = updateData.status;
        }

        if (updateData.assignee !== undefined) {
            task.assignee = updateData.assignee;
        }

        if (updateData.project !== undefined) {
            if (updateData.project) {
                const projectExists = await Project.findById(updateData.project);
                if (!projectExists) {
                    throw new Error('Selected project does not exist');
                }
                task.project = updateData.project;
            } else {
                task.project = null;
            }
        }

        task.updatedAt = new Date();
        return await task.save();
    }

    async getTasks(filters = {}) {
        const query = {};

        if (filters.owner) {
            query.owner = filters.owner;
        }

        if (filters.assignee) {
            query.assignee = filters.assignee;
        }

        if (filters.project) {
            query.project = filters.project;
        } else if (filters.standalone) {
            query.project = null;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        return await Task.find(query)
            .populate('owner', 'username')
            .populate('assignee', 'username')
            .populate('project', 'name')
            .sort({ createdAt: -1 });
    }

    async getTaskById(taskId) {
        const task = await Task.findById(taskId)
            .populate('owner', 'username')
            .populate('assignee', 'username')
            .populate('project', 'name');

        if (!task) {
            throw new Error('Task not found');
        }

        return task;
    }

    async deleteTask(taskId, userId) {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        if (task.owner.toString() !== userId.toString()) {
            throw new Error('You do not have permission to delete this task');
        }

        return await Task.findByIdAndDelete(taskId);
    }
}

export default new TaskService();
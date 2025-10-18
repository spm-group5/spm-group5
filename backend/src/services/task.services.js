import Task from '../models/task.model.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';

class TaskService {
    async createTask(taskData, userId) {
        const { title, description, project, dueDate, assignee, priority, tags, isRecurring, recurrenceInterval } = taskData;

        if (!title || title.trim() === '') {
            throw new Error('Task title is required');
        }

        if (!project) {
            throw new Error('Project is required');
        }

        // Verify project exists and is active
        const projectExists = await Project.findById(project);
        if (!projectExists) {
            throw new Error('Selected project does not exist');
        }

        if (projectExists.status !== 'Active') {
            throw new Error('Project must be Active to assign tasks');
        }

        // Creator is always the default assignee
        let assigneeList = [userId];

        // Add additional assignees if provided
        if (assignee && assignee.length > 0) {
            const additionalAssignees = assignee.filter(id => id.toString() !== userId.toString());
            assigneeList = [...assigneeList, ...additionalAssignees];
        }

        // Remove duplicates
        assigneeList = [...new Set(assigneeList.map(id => id.toString()))];

        // Validate max 5 assignees
        if (assigneeList.length > 5) {
            throw new Error('A task can have a maximum of 5 assignees');
        }

        // Validate recurrence settings
        if (isRecurring) {
            if (!recurrenceInterval || recurrenceInterval <= 0) {
                throw new Error('Recurrence interval must be a positive number for recurring tasks');
            }
            if (!dueDate) {
                throw new Error('Due date is required for recurring tasks');
            }
        }

        const newTaskData = {
            title: title.trim(),
            description: description || '',
            status: 'To Do',
            priority: priority !== undefined ? priority : 5,
            tags: tags || '',
            owner: userId,
            assignee: assigneeList,
            project: project,
            isRecurring: isRecurring || false,
            recurrenceInterval: isRecurring ? recurrenceInterval : null,
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

        const task = new Task(newTaskData);
        return await task.save();
    }

    async updateTask(taskId, updateData, userId) {
        // STEP 1: Validate input data FIRST (before checking task existence or permissions)
        if (updateData.title !== undefined) {
            if (!updateData.title || updateData.title.trim() === '') {
                throw new Error('Task title cannot be empty');
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
        const isOwner = task.owner.toString() === userId.toString();
        const isAssignee = task.assignee && task.assignee.some(
            assigneeId => assigneeId.toString() === userId.toString()
        );
        const hasPermission = isOwner || isAssignee;

        if (!hasPermission) {
            throw new Error('You do not have permission to modify this task');
        }

        // Get user role for assignment validation
        const user = await User.findById(userId);
        const isManager = user && user.roles && user.roles.includes('manager');

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

        if (updateData.priority !== undefined) {
            task.priority = updateData.priority;
        }

        if (updateData.assignee !== undefined) {
            if (!Array.isArray(updateData.assignee)) {
                throw new Error('Assignee must be an array');
            }

            // Must have at least one assignee
            if (updateData.assignee.length === 0) {
                throw new Error('At least one assignee is required');
            }

            // Maximum 5 assignees
            if (updateData.assignee.length > 5) {
                throw new Error('A task can have a maximum of 5 assignees');
            }

            const currentAssignees = task.assignee.map(a => a.toString());
            const newAssignees = updateData.assignee.map(a => a.toString());

            // Check if assignees are being removed
            const removedAssignees = currentAssignees.filter(a => !newAssignees.includes(a));

            if (removedAssignees.length > 0) {
                // Only managers can remove assignees
                if (!isManager) {
                    throw new Error('Only managers can remove assignees from a task');
                }
            }

            // Assignees can only add new members (not remove)
            const addedAssignees = newAssignees.filter(a => !currentAssignees.includes(a));
            if (addedAssignees.length > 0) {
                // All assignees can add new members
                // Just validate the new list doesn't exceed maximum
                if (newAssignees.length > 5) {
                    throw new Error('A task can have a maximum of 5 assignees');
                }
            }

            task.assignee = updateData.assignee;
        }

        if (updateData.tags !== undefined) {
            task.tags = updateData.tags;
        }

        // Handle recurrence updates
        if (updateData.isRecurring !== undefined) {
            if (updateData.isRecurring) {
                // Turning on recurrence
                if (!updateData.recurrenceInterval || updateData.recurrenceInterval <= 0) {
                    throw new Error('Recurrence interval must be a positive number for recurring tasks');
                }
                if (!task.dueDate && !updateData.dueDate) {
                    throw new Error('Due date is required for recurring tasks');
                }
                task.isRecurring = true;
                task.recurrenceInterval = updateData.recurrenceInterval;
            } else {
                // Turning off recurrence
                task.isRecurring = false;
                task.recurrenceInterval = null;
            }
        } else if (updateData.recurrenceInterval !== undefined) {
            // Only updating interval
            if (task.isRecurring) {
                if (updateData.recurrenceInterval <= 0) {
                    throw new Error('Recurrence interval must be a positive number');
                }
                task.recurrenceInterval = updateData.recurrenceInterval;
            }
        }

        // Project cannot be changed after task creation
        if (updateData.project !== undefined) {
            throw new Error('Project cannot be changed after task creation');
        }

        task.updatedAt = new Date();
        await task.save();

        // Re-populate the fields before returning
        return await Task.findById(task._id)
            .populate('owner', 'username')
            .populate('assignee', 'username')
            .populate('project', 'name');
    }

    async createRecurringTask(originalTask) {
        // Create a new task based on the original recurring task
        if (!originalTask.isRecurring) {
            return null;
        }

        // Calculate new due date based on original due date + interval
        const newDueDate = new Date(originalTask.dueDate);
        newDueDate.setDate(newDueDate.getDate() + originalTask.recurrenceInterval);

        const newTaskData = {
            title: originalTask.title,
            description: originalTask.description,
            priority: originalTask.priority,
            tags: originalTask.tags,
            owner: originalTask.owner,
            assignee: originalTask.assignee,
            project: originalTask.project,
            dueDate: newDueDate,
            isRecurring: originalTask.isRecurring,
            recurrenceInterval: originalTask.recurrenceInterval,
            status: 'To Do'
        };

        const newTask = new Task(newTaskData);
        return await newTask.save();
    }

    async getTasks(filters = {}) {
        const query = {};

        if (filters.owner) {
            query.owner = filters.owner;
        }

        if (filters.assignee) {
            query.assignee = { $in: [filters.assignee] };
        }

        if (filters.project) {
            query.project = filters.project;
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

    async archiveTask(taskId, userId) {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // Check permissions - only owner or assignees can archive
        const isOwner = task.owner.toString() === userId.toString();
        const isAssignee = task.assignee && task.assignee.some(
            assigneeId => assigneeId.toString() === userId.toString()
        );

        if (!isOwner && !isAssignee) {
            throw new Error('You do not have permission to archive this task');
        }

        task.archived = true;
        task.archivedAt = new Date();
        await task.save();

        // Return populated task
        return await Task.findById(task._id)
            .populate('owner', 'username')
            .populate('assignee', 'username')
            .populate('project', 'name');
    }

    async unarchiveTask(taskId, userId) {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // Check permissions
        const isOwner = task.owner.toString() === userId.toString();
        const isAssignee = task.assignee && task.assignee.some(
            assigneeId => assigneeId.toString() === userId.toString()
        );

        if (!isOwner && !isAssignee) {
            throw new Error('You do not have permission to unarchive this task');
        }

        task.archived = false;
        task.archivedAt = null;
        await task.save();

        // Return populated task
        return await Task.findById(task._id)
            .populate('owner', 'username')
            .populate('assignee', 'username')
            .populate('project', 'name');
    }

    // Keep delete for admin purposes only (can be restricted later)
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

    /**
     * Get tasks for a specific project with authorization
     * Authorization rules:
     * - Admin: can view all tasks
     * - Staff: can view tasks if they or a department colleague is assigned
     */
    async getTasksByProject(projectId, userId, userRole, userDepartment) {
        // Validate project exists
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Admin can view all tasks without restrictions
        if (userRole === 'admin') {
            return await Task.find({ project: projectId })
                .populate('owner', 'username department')
                .populate('assignee', 'username department');
        }

        // Staff and Manager authorization logic
        // Both roles require department-based access
        // Staff/Manager with null/undefined department cannot access
        if (!userDepartment) {
            throw new Error('Access denied to view tasks in this project');
        }

        // Get all tasks for this project
        const tasks = await Task.find({ project: projectId })
            .populate('owner', 'username department')
            .populate('assignee', 'username department');

        // If no tasks exist, return empty array (permissive approach - PTV-015)
        if (tasks.length === 0) {
            return [];
        }

        // Check if user or department colleague is assigned to any task
        const hasAccess = tasks.some(task => {
            // Check if any assignee matches user ID or department
            return task.assignee.some(assignee => {
                // Direct assignment
                if (assignee._id.toString() === userId.toString()) {
                    return true;
                }
                // Department colleague assignment
                if (assignee.department && assignee.department === userDepartment) {
                    return true;
                }
                return false;
            });
        });

        if (!hasAccess) {
            throw new Error('Access denied to view tasks in this project');
        }

        // User has access - return all tasks in the project
        return tasks;
    }
}

export default new TaskService();
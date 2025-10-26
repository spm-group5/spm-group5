import Task from '../models/task.model.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import notificationModel from '../models/notification.model.js';
import mongoose from 'mongoose';

class TaskService {
    async createTask(taskData, userId) {
        const { title, description, project, dueDate, assignee, priority, tags, isRecurring, recurrenceInterval, owner } = taskData;

        if (!title || title.trim() === '') {
            throw new Error('Task title is required');
        }

        if (!project) {
            throw new Error('Project is required');
        }

        // ASSIGNEE-SCOPE: Validate owner is not explicitly null
        if ('owner' in taskData && taskData.owner === null) {
            throw new Error('Every task or subtask must have an owner.');
        }

        // Verify project exists and is not archived or completed
        const projectExists = await Project.findById(project);
        if (!projectExists) {
            throw new Error('Selected project does not exist');
        }

        // Check if project is archived - archived projects cannot have new tasks
        if (projectExists.archived === true) {
            throw new Error('Cannot assign tasks to archived projects');
        }

        // Check if project is completed - completed projects cannot have new tasks
        if (projectExists.status === 'Completed') {
            throw new Error('Cannot assign tasks to completed projects');
        }

        // Creator is always the default assignee
        let assigneeList = [userId];

        // Add additional assignees if provided
        // Only Manager or Admin can assign additional users during task creation
        if (assignee && assignee.length > 0) {
            const user = await User.findById(userId);
            const isManagerOrAdmin = user && user.roles && (user.roles.includes('manager') || user.roles.includes('admin'));

            if (!isManagerOrAdmin) {
                throw new Error('Only Manager or Admin can assign additional users to tasks');
            }

            const additionalAssignees = assignee.filter(id => id.toString() !== userId.toString());
            assigneeList = [...assigneeList, ...additionalAssignees];
        }

        // Remove duplicates
        assigneeList = [...new Set(assigneeList.map(id => id.toString()))];

        // ASSIGNEE-SCOPE: Validate max 5 assignees
        if (assigneeList.length > 5) {
            throw new Error('Maximum of 5 assignees allowed');
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

        // Validate time format if provided
        if (taskData.timeTaken && taskData.timeTaken.trim() !== '') {
            const tempTask = new Task();
            if (!tempTask.isValidTimeFormat(taskData.timeTaken)) {
                throw new Error('Time must be in 15-minute increments (e.g., "15 minutes", "1 hour", "1 hour 15 minutes")');
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
            timeTaken: taskData.timeTaken || '',
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
        const savedTask = await task.save();

        // Automatically add all assignees to the project members array if not already members
        const projectDoc = await Project.findById(project);
        if (projectDoc) {
            let membersUpdated = false;
            const currentMembers = projectDoc.members.map(m => m.toString());
            const projectOwner = projectDoc.owner.toString();

            for (const assigneeId of assigneeList) {
                const assigneeIdStr = assigneeId.toString();
                // Add to members if not already a member and not the project owner
                if (!currentMembers.includes(assigneeIdStr) && assigneeIdStr !== projectOwner) {
                    projectDoc.members.push(assigneeId);
                    membersUpdated = true;
                }
            }

            if (membersUpdated) {
                projectDoc.updatedAt = new Date();
                await projectDoc.save();
            }
        }

        return savedTask;
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
        const task = await Task.findById(taskId).populate('assignee');

        if (!task) {
            throw new Error('Task not found');
        }

        // STEP 3: Check permissions AFTER validation
        // Get user to check roles
        const user = await User.findById(userId);
        const isAdmin = user && user.roles && user.roles.includes('admin');
        const isManager = user && user.roles && user.roles.includes('manager');

        // Admin can edit all tasks
        if (isAdmin) {
            // Admin has permission, continue
        } else {
            const isOwner = task.owner.toString() === userId.toString();
            const isAssignee = task.assignee && task.assignee.some(
                assignee => {
                    const assigneeId = assignee._id || assignee;
                    return assigneeId.toString() === userId.toString();
                }
            );

            // Manager can edit if they are assigned or if any assignee is from their department
            let hasManagerPermission = false;
            if (isManager) {
                hasManagerPermission = isAssignee || task.assignee.some(assignee =>
                    assignee.department === user.department
                );
            }

            const hasPermission = isOwner || isAssignee || hasManagerPermission;

            if (!hasPermission) {
                throw new Error('You do not have permission to modify this task');
            }
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

            // ASSIGNEE-SCOPE: Maximum 5 assignees
            if (updateData.assignee.length > 5) {
                throw new Error('Maximum of 5 assignees allowed');
            }

            // ASSIGNEE-SCOPE: Only Manager or Admin can modify assignees
            if (!isManager && !isAdmin) {
                throw new Error('Only Manager or Admin can modify task assignees');
            }

            task.assignee = updateData.assignee;
        }

        // ASSIGNEE-SCOPE: Handle owner updates (for post-creation assignment via updateTask)
        if (updateData.owner !== undefined) {
            if (updateData.owner === null) {
                throw new Error('Every task or subtask must have an owner.');
            }
            task.owner = updateData.owner;
        }

        if (updateData.tags !== undefined) {
            task.tags = updateData.tags;
        }

        if (updateData.timeTaken !== undefined) {
            // Validate time format if provided
            if (updateData.timeTaken && updateData.timeTaken.trim() !== '') {
                if (!task.isValidTimeFormat(updateData.timeTaken)) {
                    throw new Error('Time must be in 15-minute increments (e.g., "15 minutes", "1 hour", "1 hour 15 minutes")');
                }
            }
            task.timeTaken = updateData.timeTaken;
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

        // If assignees were updated, automatically add new assignees to project members
        if (updateData.assignee !== undefined) {
            const projectDoc = await Project.findById(task.project);
            if (projectDoc) {
                let membersUpdated = false;
                const currentMembers = projectDoc.members.map(m => m.toString());
                const projectOwner = projectDoc.owner.toString();

                for (const assigneeId of task.assignee) {
                    const assigneeIdStr = assigneeId.toString();
                    // Add to members if not already a member and not the project owner
                    if (!currentMembers.includes(assigneeIdStr) && assigneeIdStr !== projectOwner) {
                        projectDoc.members.push(assigneeId);
                        currentMembers.push(assigneeIdStr); // Update local array to avoid duplicates
                        membersUpdated = true;
                    }
                }

                if (membersUpdated) {
                    projectDoc.updatedAt = new Date();
                    await projectDoc.save();
                }
            }
        }

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

    async getTasks(filters = {}, userId = null) {
        const query = {};

        // If userId is provided in filters, user wants to see only their assigned tasks
        if (filters.userId) {
            // Find tasks where user is either owner OR in assignee array
            query.$or = [
                { owner: filters.userId },
                { assignee: { $in: [filters.userId] } }
            ];
        } else {
            // Apply specific filters
            if (filters.owner) {
                query.owner = filters.owner;
            }

            if (filters.assignee) {
                query.assignee = { $in: [filters.assignee] };
            }
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

        // Get user to check roles
        const user = await User.findById(userId);
        const isManagerOrAdmin = user && (user.roles.includes('manager') || user.roles.includes('admin'));

        if (!isOwner && !isAssignee && !isManagerOrAdmin) {
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
     * Calculate total time for a task (task time + subtask times)
     */
    async calculateTotalTime(taskId) {
        try {
            const task = await Task.findById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            // Get all subtasks for this task
            const Subtask = (await import('../models/subtask.model.js')).default;
            const subtasks = await Subtask.find({ parentTaskId: taskId, archived: false });

            // Parse task time
            let taskMinutes = 0;
            if (task.timeTaken && task.timeTaken.trim() !== '') {
                taskMinutes = this.parseTimeToMinutes(task.timeTaken);
            }

            // Parse subtask times
            let subtaskMinutes = 0;
            for (const subtask of subtasks) {
                if (subtask.timeTaken && subtask.timeTaken.trim() !== '') {
                    subtaskMinutes += this.parseTimeToMinutes(subtask.timeTaken);
                }
            }

            const totalMinutes = taskMinutes + subtaskMinutes;
            
            if (totalMinutes === 0) {
                return 'Not specified';
            }

            return this.formatTime(totalMinutes);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Format minutes to hours and minutes string
     */
    formatTime(minutes) {
        if (!minutes || minutes === 0) {
            return '';
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours === 0) {
            return `${remainingMinutes} minutes`;
        } else if (remainingMinutes === 0) {
            return hours === 1 ? '1 hour' : `${hours} hours`;
        } else {
            const hourText = hours === 1 ? 'hour' : 'hours';
            return `${hours} ${hourText} ${remainingMinutes} minutes`;
        }
    }

    /**
     * Parse time string to minutes
     */
    parseTimeToMinutes(timeString) {
        if (!timeString || typeof timeString !== 'string') {
            return 0;
        }

        const trimmedTime = timeString.trim();
        
        // Pattern for "X minutes"
        const minutesPattern = /^(\d+)\s+minutes$/;
        const minutesMatch = trimmedTime.match(minutesPattern);
        if (minutesMatch) {
            return parseInt(minutesMatch[1]);
        }

        // Pattern for "X hour" or "X hours"
        const hoursPattern = /^(\d+)\s+hours?$/;
        const hoursMatch = trimmedTime.match(hoursPattern);
        if (hoursMatch) {
            return parseInt(hoursMatch[1]) * 60;
        }

        // Pattern for "X hour Y minutes" or "X hours Y minutes"
        const hoursMinutesPattern = /^(\d+)\s+hours?\s+(\d+)\s+minutes$/;
        const hoursMinutesMatch = trimmedTime.match(hoursMinutesPattern);
        if (hoursMinutesMatch) {
            const hours = parseInt(hoursMinutesMatch[1]);
            const minutes = parseInt(hoursMinutesMatch[2]);
            return hours * 60 + minutes;
        }

        return 0;
    }

    /**
     * Get tasks for a specific project with authorization
     * Authorization rules:
     * - Admin: can view all tasks
     * - Project Owner: can view all tasks in their project
     * - Project Member: can view all tasks in projects they are a member of
     */
    async getTasksByProject(projectId, userId, userRole, userDepartment) {
        // Validate project exists and populate members
        const project = await Project.findById(projectId).populate('members', '_id');
        if (!project) {
            throw new Error('Project not found');
        }

        // Admin can view all tasks without restrictions
        if (userRole === 'admin') {
            return await Task.find({ project: projectId })
                .populate('owner', 'username department')
                .populate('assignee', 'username department')
                .populate('project', 'name');
        }

        // Project owner can always view tasks in their own project
        const projectOwnerId = project.owner?._id?.toString() || project.owner?.toString();
        if (projectOwnerId === userId?.toString()) {
            return await Task.find({ project: projectId })
                .populate('owner', 'username department')
                .populate('assignee', 'username department')
                .populate('project', 'name');
        }

        // Check if user is a project member
        const isMember = project.members.some(
            member => (member._id?.toString() || member.toString()) === userId.toString()
        );

        if (isMember) {
            // Project members can view all tasks in the project
            return await Task.find({ project: projectId })
                .populate('owner', 'username department')
                .populate('assignee', 'username department')
                .populate('project', 'name');
        }

        // User is not admin, not owner, and not a member
        throw new Error('Access denied to view tasks in this project');
    }

    // ASSIGNEE-SCOPE: Post-creation assignment entry point
    async assignOwner({ taskId, assigneeInput, actingUser }) {
        // 1) Guard: empty/null
        if (!assigneeInput) {
            throw new Error('Every task or subtask must have an owner.');
        }

        // 2) Resolve user by email or _id (case-insensitive username lookup)
        // Escape special regex characters in the input (e.g., ^ in SkibidiSigma^3)
        const escapedInput = String(assigneeInput).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const assignee = await User.findOne({
            $or: [
                { username: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
                { _id: mongoose.Types.ObjectId.isValid(assigneeInput) ? assigneeInput : null }
            ]
        });

        if (!assignee) {
            throw new Error('Every task or subtask must have an owner.');
        }

        // 3) Load task with project, owner, assignee
        const task = await Task.findById(taskId)
            .populate('project')
            .populate('owner', 'username')
            .populate('assignee', 'username');

        if (!task) {
            throw new Error('Task not found');
        }

        // OWNERSHIP-TRANSFER: Prevent ownership transfer on archived tasks
        if (task.archived === true) {
            throw new Error('This task is no longer active');
        }

        // 4) ACCESS-SCOPE: For Manager/Admin, skip project access check
        // For other users, ensure assignee has project access
        const isManagerOrAdmin = actingUser && actingUser.roles &&
            (actingUser.roles.includes('manager') || actingUser.roles.includes('admin'));

        if (!isManagerOrAdmin) {
            const canAccess = await this.userHasAccessToTaskProject(assignee._id, task.project);
            if (!canAccess) {
                throw new Error('Assignee must have access to this project');
            }
        }

        // 5) Build next assignees set: prior owner stays visible, not owner
        const next = new Set();
        if (task.assignee && task.assignee.length > 0) {
            task.assignee.forEach(a => {
                const aid = a._id || a;
                next.add(String(aid));
            });
        }

        // Add current owner to participants
        if (task.owner) {
            const ownerId = task.owner._id || task.owner;
            next.add(String(ownerId));
        }

        // Remove new assignee from participants (they become owner)
        next.delete(String(assignee._id));

        // 6) Cap check: owner(1) + assignees <= 5
        if (1 + next.size > 5) {
            throw new Error('Maximum of 5 assignees allowed');
        }

        // 7) Write changes
        task.owner = assignee._id;
        task.assignee = Array.from(next);
        await task.save();

        // Automatically add the new owner to the project members array if not already a member
        const projectDoc = await Project.findById(task.project);
        if (projectDoc) {
            const isAlreadyMember = projectDoc.members.some(
                memberId => memberId.toString() === assignee._id.toString()
            );
            const isProjectOwner = projectDoc.owner.toString() === assignee._id.toString();

            if (!isAlreadyMember && !isProjectOwner) {
                projectDoc.members.push(assignee._id);
                projectDoc.updatedAt = new Date();
                await projectDoc.save();
            }
        }

        // Re-populate
        await task.populate('owner', 'username');
        await task.populate('assignee', 'username');

        // 8) Notify (call notification wrapper)
        try {
            await notificationModel.create({
                user: assignee._id,
                message: `You are now the owner of "${task.title}" (assigned by ${actingUser.username})`,
                assignor: actingUser._id,
                deadline: task.dueDate
            });
        } catch (notifError) {
            console.error('Notification creation failed:', notifError);
            // Don't fail the assignment if notification fails
        }

        return task;
    }

    // ACCESS-SCOPE: local helper to check project access (stays within task.services.js)
    async userHasAccessToTaskProject(userId, project) {
        // If project is just an ID, populate it
        let p = project;
        if (!project.owner && !project.members) {
            p = await Project.findById(project).populate(['owner', 'members']);
        }

        if (!p) {
            return false;
        }

        const userIdStr = String(userId);

        // Check owner
        if (p.owner) {
            const ownerId = p.owner._id || p.owner;
            if (String(ownerId) === userIdStr) {
                return true;
            }
        }

        // Check members
        if (p.members && Array.isArray(p.members)) {
            for (const member of p.members) {
                const memberId = member._id || member;
                if (String(memberId) === userIdStr) {
                    return true;
                }
            }
        }

        return false;
    }

    // ASSIGNEE-SCOPE: Get eligible assignees for a task (based on project access)
    async getEligibleAssignees(taskId, actingUser = null) {
        const task = await Task.findById(taskId).populate('project assignee owner');
        if (!task) {
            throw new Error('Task not found');
        }

        const project = task.project;
        if (!project) {
            return [];
        }

        // Check if acting user is Manager, Admin, task owner, or current assignee
        const isManagerOrAdmin = actingUser && actingUser.roles &&
            (actingUser.roles.includes('manager') || actingUser.roles.includes('admin'));

        const isTaskOwner = actingUser && task.owner &&
            (task.owner._id || task.owner).toString() === actingUser._id.toString();

        const isCurrentAssignee = actingUser && task.assignee && task.assignee.some(
            assignee => (assignee._id || assignee).toString() === actingUser._id.toString()
        );

        // If Manager, Admin, task owner, or current assignee, return ALL users in the organization
        if (isManagerOrAdmin || isTaskOwner || isCurrentAssignee) {
            const users = await User.find({})
                .select('_id username roles department')
                .lean();

            return users.map(u => ({
                _id: u._id,
                email: u.username, // username is email in this system
                name: u.username,
                role: u.roles && u.roles.length > 0 ? u.roles[0] : 'staff',
                department: u.department
            }));
        }

        // For other users (not assignee, owner, manager, or admin), return only project owner + members
        // Populate project members and owner
        const fullProject = await Project.findById(project._id).populate(['owner', 'members']);

        const eligibleUserIds = new Set();

        // Add project owner
        if (fullProject.owner) {
            const ownerId = fullProject.owner._id || fullProject.owner;
            eligibleUserIds.add(String(ownerId));
        }

        // Add all project members
        if (fullProject.members && Array.isArray(fullProject.members)) {
            fullProject.members.forEach(member => {
                const memberId = member._id || member;
                eligibleUserIds.add(String(memberId));
            });
        }

        // Fetch user details
        const users = await User.find({ _id: { $in: Array.from(eligibleUserIds) } })
            .select('_id username roles department')
            .lean();

        return users.map(u => ({
            _id: u._id,
            email: u.username, // username is email in this system
            name: u.username,
            role: u.roles && u.roles.length > 0 ? u.roles[0] : 'staff',
            department: u.department
        }));
    }

    // ASSIGNEE-SCOPE: Add assignee to task (one at a time)
    async addAssignee({ taskId, newAssigneeInput, actingUser }) {
        // Find task and populate necessary fields
        const task = await Task.findById(taskId).populate('project assignee owner');
        if (!task) {
            throw new Error('Task not found');
        }

        // Resolve newAssigneeInput to User ObjectId
        let newAssigneeId;
        const newAssigneeUser = await User.findOne({ username: newAssigneeInput });
        if (!newAssigneeUser) {
            throw new Error('User not found');
        }
        newAssigneeId = newAssigneeUser._id;

        // Check if user already assigned
        const alreadyAssigned = task.assignee.some(
            assignee => (assignee._id || assignee).toString() === newAssigneeId.toString()
        );
        if (alreadyAssigned) {
            throw new Error('User is already assigned to this task');
        }

        // Validate max 5 assignees
        if (task.assignee.length >= 5) {
            throw new Error('Maximum of 5 assignees allowed');
        }

        // Verify acting user has permission to add assignees
        // Permission: Current assignees, task owner, Manager, or Admin can add assignees
        const isAssignee = task.assignee.some(
            assignee => (assignee._id || assignee).toString() === actingUser._id.toString()
        );
        const isOwner = task.owner._id.toString() === actingUser._id.toString();
        const isManagerOrAdmin = actingUser.roles?.includes('manager') || actingUser.roles?.includes('admin');

        if (!isAssignee && !isOwner && !isManagerOrAdmin) {
            throw new Error('You do not have permission to add assignees to this task');
        }

        // Assignees can assign ANY user in the organization (no restrictions)

        // Add assignee to task
        task.assignee.push(newAssigneeId);
        task.updatedAt = new Date();
        await task.save();

        // Automatically add the assignee to the project members array if not already a member
        const project = await Project.findById(task.project);
        const isAlreadyMember = project.members.some(
            memberId => memberId.toString() === newAssigneeId.toString()
        );
        const isProjectOwner = project.owner.toString() === newAssigneeId.toString();

        if (!isAlreadyMember && !isProjectOwner) {
            project.members.push(newAssigneeId);
            project.updatedAt = new Date();
            await project.save();
        }

        // Return populated task
        const populatedTask = await Task.findById(taskId)
            .populate('owner', 'username roles')
            .populate('assignee', 'username roles')
            .populate('project', 'title');

        return populatedTask;
    }

    // ASSIGNEE-SCOPE: Remove assignee from task
    async removeAssignee({ taskId, assigneeToRemoveInput, actingUser }) {
        // Find task and populate necessary fields
        const task = await Task.findById(taskId).populate('project assignee owner');
        if (!task) {
            throw new Error('Task not found');
        }

        // Resolve assigneeToRemoveInput to User ObjectId
        let assigneeToRemoveId;
        const assigneeUser = await User.findOne({ username: assigneeToRemoveInput });
        if (!assigneeUser) {
            throw new Error('User not found');
        }
        assigneeToRemoveId = assigneeUser._id;

        // Check if user is actually assigned
        const isAssigned = task.assignee.some(
            assignee => (assignee._id || assignee).toString() === assigneeToRemoveId.toString()
        );
        if (!isAssigned) {
            throw new Error('User is not assigned to this task');
        }

        // Validate minimum 1 assignee
        if (task.assignee.length <= 1) {
            throw new Error('Task must have at least one assignee');
        }

        // Verify acting user has permission to remove assignees
        // Only Manager, Admin, or Task Owner can remove assignees
        const isOwner = task.owner._id.toString() === actingUser._id.toString();
        const isManagerOrAdmin = actingUser.roles?.includes('manager') || actingUser.roles?.includes('admin');

        if (!isOwner && !isManagerOrAdmin) {
            throw new Error('Only Manager, Admin, or Task Owner can remove assignees');
        }

        // Remove assignee
        task.assignee = task.assignee.filter(
            assignee => (assignee._id || assignee).toString() !== assigneeToRemoveId.toString()
        );
        task.updatedAt = new Date();
        await task.save();

        // Return populated task
        const populatedTask = await Task.findById(taskId)
            .populate('owner', 'username roles')
            .populate('assignee', 'username roles')
            .populate('project', 'title');

        return populatedTask;
    }
}

export default new TaskService();
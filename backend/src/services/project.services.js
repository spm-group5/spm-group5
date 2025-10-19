import Project from '../models/project.model.js';

class ProjectService {

    /**
     * Create a new project
     *
     * Purpose: Create a project with comprehensive validation
     *
     * Validation Rules:
     * - Name: Required, non-empty string
     * - Due Date: Optional, cannot be in the past if provided
     * - Priority: Optional, must be 1-10 if provided
     * - Status: Optional, must be valid enum value, defaults to "To Do"
     * - Tags: Optional, array of strings
     * - Archived: Optional, boolean flag, defaults to false
     *
     * @param {Object} projectData - Project data including name, description, status, priority, dueDate, tags, archived
     * @param {String} userId - ID of the user creating the project
     * @returns {Promise<Object>} Created project object
     * @throws {Error} If validation fails
     */
    async createProject(projectData, userId) {
        const { name, description, members, status, priority, dueDate, tags, archived } = projectData;

        // Validate name (required, non-empty)
        if (!name || name.trim() === '') {
            throw new Error('Project name is required');
        }

        // Validate dueDate is not in the past (if provided)
        if (dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const projectDueDate = new Date(dueDate);
            projectDueDate.setHours(0, 0, 0, 0);

            if (projectDueDate < today) {
                throw new Error('Due date cannot be in the past');
            }
        }

        // Validate priority if provided (must be 1-10)
        if (priority !== undefined && priority !== null) {
            if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < 1 || priority > 10) {
                throw new Error('Priority must be a number between 1 and 10');
            }
        }

        // Validate status if provided (must be valid enum value)
        const validStatuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];
        if (status !== undefined && status !== null && !validStatuses.includes(status)) {
            throw new Error('Status must be one of: To Do, In Progress, Completed, Blocked');
        }

        // Create project object with validated data
        const projectObj = {
            name: name.trim(),
            description: description || '',
            owner: userId,
            members: members || [userId],
            status: status || 'To Do',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add optional fields if provided
        if (dueDate) {
            projectObj.dueDate = new Date(dueDate);
        }

        if (priority !== undefined && priority !== null) {
            projectObj.priority = priority;
        }

        if (tags !== undefined) {
            projectObj.tags = Array.isArray(tags) ? tags : [];
        }

        if (archived !== undefined) {
            projectObj.archived = archived;
            if (archived === true) {
                projectObj.archivedAt = new Date();
            }
        }

        const newProject = new Project(projectObj);
        return await newProject.save();
    }

    async getProjects(userId) {
        return await Project.find({
            $or: [
                { owner: userId },
                { members: userId }
            ]
        })
        .populate('owner', 'username')
        .populate('members', 'username')
        .sort({ createdAt: -1 });
    }

    async getProjectById(projectId) {
        const project = await Project.findById(projectId)
            .populate('owner', 'username')
            .populate('members', 'username');

        if (!project) {
            throw new Error('Project not found');
        }

        return project;
    }

    /**
     * Update an existing project
     *
     * Purpose: Update project fields with validation and cascade archive to tasks
     *
     * Validation Rules:
     * - Only project owner can update the project
     * - Name: Cannot be empty if provided
     * - Due Date: Cannot be in the past if provided
     * - Priority: Must be 1-10 if provided
     * - Status: Must be valid enum value if provided
     *
     * Archive Behavior:
     * - When project.archived changes from false to true: All project tasks are archived
     * - When project.archived changes from true to false: All project tasks are unarchived
     *
     * @param {String} projectId - ID of the project to update
     * @param {Object} updateData - Fields to update (including archived field)
     * @param {String} userId - ID of the user updating the project
     * @returns {Promise<Object>} Updated project object
     * @throws {Error} If validation fails or user lacks permission
     */
    async updateProject(projectId, updateData, userId) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Only project owner can update the project');
        }

        // Validate name if provided
        if (updateData.name !== undefined) {
            if (!updateData.name || updateData.name.trim() === '') {
                throw new Error('Project name cannot be empty');
            }
            project.name = updateData.name.trim();
        }

        if (updateData.description !== undefined) {
            project.description = updateData.description;
        }

        // Validate status if provided
        const validStatuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];
        if (updateData.status !== undefined) {
            if (!validStatuses.includes(updateData.status)) {
                throw new Error('Status must be one of: To Do, In Progress, Completed, Blocked');
            }
            project.status = updateData.status;
        }

        // Validate priority if provided
        if (updateData.priority !== undefined && updateData.priority !== null) {
            if (typeof updateData.priority !== 'number' || !Number.isInteger(updateData.priority) || updateData.priority < 1 || updateData.priority > 10) {
                throw new Error('Priority must be a number between 1 and 10');
            }
            project.priority = updateData.priority;
        }

        // Validate dueDate if provided
        if (updateData.dueDate !== undefined) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const projectDueDate = new Date(updateData.dueDate);
            projectDueDate.setHours(0, 0, 0, 0);

            if (projectDueDate < today) {
                throw new Error('Due date cannot be in the past');
            }
            project.dueDate = new Date(updateData.dueDate);
        }

        if (updateData.tags !== undefined) {
            project.tags = Array.isArray(updateData.tags) ? updateData.tags : [];
        }

        if (updateData.members !== undefined) {
            project.members = updateData.members;
        }

        // Handle archiving: if archived status is changing to true, cascade to all tasks
        if (updateData.archived !== undefined) {
            // If archiving the project
            if (updateData.archived === true && project.archived === false) {
                project.archived = true;
                project.archivedAt = new Date();

                // Import Task model dynamically to avoid circular dependency
                const Task = (await import('../models/task.model.js')).default;

                // Archive all tasks belonging to this project
                await Task.updateMany(
                    { project: project._id },
                    {
                        $set: {
                            archived: true,
                            archivedAt: new Date()
                        }
                    }
                );
            }
            // If unarchiving the project
            else if (updateData.archived === false && project.archived === true) {
                project.archived = false;
                project.archivedAt = null;

                // Import Task model dynamically to avoid circular dependency
                const Task = (await import('../models/task.model.js')).default;

                // Unarchive all tasks belonging to this project
                await Task.updateMany(
                    { project: project._id },
                    {
                        $set: {
                            archived: false,
                            archivedAt: null
                        }
                    }
                );
            }
        }

        project.updatedAt = new Date();
        return await project.save();
    }

    async deleteProject(projectId, userId) {

        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Only project owner can delete the project');
        }

        return await Project.findByIdAndDelete(projectId);
    }

    async getAllProjects() {
        return await Project.find({})
            .populate('owner', 'username')
            .populate('members', 'username')
            .select('name description status priority dueDate tags archived archivedAt owner members createdAt updatedAt')
            .sort({ name: 1 });
    }

    /**
     * Get all projects with access metadata (canViewTasks flag)
     * The canViewTasks flag indicates whether the user can view tasks in each project
     * Based on authorization rules:
     * - Admin: can view all tasks (canViewTasks: true for all projects)
     * - Staff: can view tasks if they or a department colleague is assigned
     */
    async getProjectsWithAccessMetadata(userId, userRole, userDepartment) {
        // Import Task model dynamically to avoid circular dependency
        const Task = (await import('../models/task.model.js')).default;

        // All roles can view all projects, so fetch all.
        // Task visibility is handled by the 'canViewTasks' flag later.
        const projects = await Project.find({})
            .populate('owner', 'username')
            .populate('members', 'username')
            .select('name description status priority dueDate tags archived archivedAt owner members createdAt updatedAt')
            .sort({ createdAt: -1 });

        // Add canViewTasks metadata to each project
        const projectsWithMetadata = await Promise.all(
            projects.map(async (project) => {
                const projectObj = project.toObject();

                // Admin can view all tasks
                if (userRole === 'admin') {
                    projectObj.canViewTasks = true;
                    return projectObj;
                }

                // Staff and Manager use department-based access control
                // Get tasks for this project with populated assignees
                const tasks = await Task.find({ project: project._id })
                    .populate('assignee', 'username department');

                // If no tasks exist, canViewTasks is false
                if (tasks.length === 0) {
                    projectObj.canViewTasks = false;
                    return projectObj;
                }

                // Check if user or department colleague is assigned to any task
                const hasAccess = tasks.some(task => {
                    return task.assignee.some(assignee => {
                        // Direct assignment
                        if (assignee._id.toString() === userId.toString()) {
                            return true;
                        }
                        // Department colleague assignment
                        if (userDepartment && assignee.department && assignee.department === userDepartment) {
                            return true;
                        }
                        return false;
                    });
                });

                projectObj.canViewTasks = hasAccess;
                return projectObj;
            })
        );

        return projectsWithMetadata;
    }
}

export default new ProjectService();
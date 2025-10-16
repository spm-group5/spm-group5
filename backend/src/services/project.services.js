import Project from '../models/project.model.js';

class ProjectService {

    async createProject(projectData, userId) {
        const { name, description, members } = projectData;

        if (!name || name.trim() === '') {
            throw new Error('Project name is required');
        }

        const newProject = new Project({
            name: name.trim(),
            description: description || '',
            owner: userId,
            members: members || [userId],
            status: 'Active',
            createdAt: new Date(),
            updatedAt: new Date()
        });

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

    async updateProject(projectId, updateData, userId) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Only project owner can update the project');
        }

        if (updateData.name !== undefined) {
            if (!updateData.name || updateData.name.trim() === '') {
                throw new Error('Project name cannot be empty');
            }
            project.name = updateData.name.trim();
        }

        if (updateData.description !== undefined) {
            project.description = updateData.description;
        }

        if (updateData.status !== undefined) {
            project.status = updateData.status;
        }

        if (updateData.members !== undefined) {
            project.members = updateData.members;
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
            .select('name description status owner members createdAt updatedAt')
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
            .select('name description status owner members createdAt updatedAt')
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
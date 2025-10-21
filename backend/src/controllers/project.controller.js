import projectService from '../services/project.services.js';

class ProjectController {
    /**
     * Create a new project
     *
     * Purpose: Handle HTTP request to create a project with attributes
     *
     * Expected Request Body:
     * - name: Required project name (String)
     * - description: Optional project description (String)
     * - status: Optional status (Enum: To Do, In Progress, Completed, Blocked), defaults to "To Do"
     * - priority: Optional priority ranking (Number, 1-10)
     * - dueDate: Optional due date (Date, cannot be in past if provided)
     * - tags: Optional array of tags (String[])
     * - members: Optional array of member IDs (ObjectId[])
     * - archived: Optional boolean flag (defaults to false)
     *
     * Response:
     * - 201 Created: Project created successfully with complete project object and canViewTasks flag
     * - 400 Bad Request: Validation error (empty name, invalid priority, past due date, etc.)
     *
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createProject(req, res) {
        try {
            const userId = req.user._id;
            const project = await projectService.createProject(req.body, userId);

            // Convert to object and add canViewTasks flag
            // The creator is always the owner, so they can always view tasks in their project
            const projectObj = project.toObject ? project.toObject() : project;
            projectObj.canViewTasks = true;

            res.status(201).json({
                success: true,
                message: 'Project created successfully',
                data: projectObj
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getProjects(req, res) {
        try {
            const userId = req.user._id;
            const projects = await projectService.getProjects(userId);

            res.status(200).json({
                success: true,
                data: projects
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getProjectById(req, res) {
        try {
            const { projectId } = req.params;
            const project = await projectService.getProjectById(projectId);

            res.status(200).json({
                success: true,
                data: project
            });
        } catch (error) {
            const statusCode = error.message === 'Project not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateProject(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;
            const userRole = req.user.roles && req.user.roles[0]; // Get first role

            const updatedProject = await projectService.updateProject(projectId, req.body, userId, userRole);

            // Convert to object and add canViewTasks flag
            // Since only the owner can update a project, they can always view tasks
            const projectObj = updatedProject.toObject ? updatedProject.toObject() : updatedProject;
            projectObj.canViewTasks = true;

            res.status(200).json({
                success: true,
                message: 'Project updated successfully',
                data: projectObj
            });
        } catch (error) {
            const statusCode = error.message.includes('permission') ||
                             error.message.includes('owner') ||
                             error.message.includes('admin') ? 403 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteProject(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            await projectService.deleteProject(projectId, userId);

            res.status(200).json({
                success: true,
                message: 'Project deleted successfully'
            });
        } catch (error) {
            const statusCode = error.message === 'Project not found' ? 404 :
                             error.message.includes('owner') ? 403 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllProjects(req, res) {
        try {
            const projects = await projectService.getAllProjects();

            res.status(200).json({
                success: true,
                data: projects
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get all projects with access metadata (canViewTasks flag)
     * Returns projects with additional metadata indicating if user can view tasks
     */
    async getProjectsWithAccessMetadata(req, res) {
        try {
            // Extract user data
            const userId = req.user._id;
            const userRole = req.user.roles && req.user.roles[0]; // Get first role
            const userDepartment = req.user.department;

            // Call service layer
            const projects = await projectService.getProjectsWithAccessMetadata(
                userId,
                userRole,
                userDepartment
            );

            res.status(200).json({
                success: true,
                data: projects
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new ProjectController();
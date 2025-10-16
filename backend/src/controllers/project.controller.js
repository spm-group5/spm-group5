import projectService from '../services/project.services.js';

class ProjectController {
    async createProject(req, res) {
        try {
            const userId = req.user._id;
            const project = await projectService.createProject(req.body, userId);

            res.status(201).json({
                success: true,
                message: 'Project created successfully',
                data: project
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

            const updatedProject = await projectService.updateProject(projectId, req.body, userId);

            res.status(200).json({
                success: true,
                message: 'Project updated successfully',
                data: updatedProject
            });
        } catch (error) {
            const statusCode = error.message.includes('permission') ||
                             error.message.includes('owner') ? 403 : 400;
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
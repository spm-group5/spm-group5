import { describe, it, expect, beforeEach, vi } from 'vitest';
import projectController from './project.controller.js';
import projectService from '../services/project.services.js';

vi.mock('../services/project.services.js');

describe('Project Controller Test', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { _id: 'userId123' },
            body: {},
            params: {},
            query: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        vi.clearAllMocks();
    });

    describe('createProject', () => {
        it('should create project successfully', async () => {
            const mockProject = { 
                _id: 'projectId123', 
                name: 'Test Project',
                owner: 'userId123',
                status: 'Active'
            };
            req.body = { name: 'Test Project', description: 'Test description' };
            projectService.createProject.mockResolvedValue(mockProject);

            await projectController.createProject(req, res);

            expect(projectService.createProject).toHaveBeenCalledWith(req.body, 'userId123');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project created successfully',
                data: mockProject
            });
        });

        it('should handle creation error', async () => {
            req.body = { name: '' };
            projectService.createProject.mockRejectedValue(new Error('Project name is required'));

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Project name is required'
            });
        });
    });

    describe('getProjects', () => {
        it('should get all projects for user', async () => {
            const mockProjects = [
                { _id: 'project1', name: 'Project 1' },
                { _id: 'project2', name: 'Project 2' }
            ];
            projectService.getProjects.mockResolvedValue(mockProjects);

            await projectController.getProjects(req, res);

            expect(projectService.getProjects).toHaveBeenCalledWith('userId123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockProjects
            });
        });

        it('should handle get projects error', async () => {
            projectService.getProjects.mockRejectedValue(new Error('Database error'));

            await projectController.getProjects(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Database error'
            });
        });
    });

    describe('getProjectById', () => {
        it('should get project by ID successfully', async () => {
            const mockProject = { _id: 'projectId123', name: 'Test Project' };
            req.params = { projectId: 'projectId123' };
            projectService.getProjectById.mockResolvedValue(mockProject);

            await projectController.getProjectById(req, res);

            expect(projectService.getProjectById).toHaveBeenCalledWith('projectId123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockProject
            });
        });

        it('should handle project not found', async () => {
            req.params = { projectId: 'nonExistentId' };
            projectService.getProjectById.mockRejectedValue(new Error('Project not found'));

            await projectController.getProjectById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Project not found'
            });
        });
    });

    describe('updateProject', () => {
        it('should update project successfully', async () => {
            const mockUpdatedProject = {
                _id: 'projectId123',
                name: 'Updated Project',
                description: 'Updated description'
            };
            req.params = { projectId: 'projectId123' };
            req.body = { name: 'Updated Project', description: 'Updated description' };
            projectService.updateProject.mockResolvedValue(mockUpdatedProject);

            await projectController.updateProject(req, res);

            expect(projectService.updateProject).toHaveBeenCalledWith('projectId123', req.body, 'userId123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project updated successfully',
                data: mockUpdatedProject
            });
        });

        it('should handle permission denied on update', async () => {
            req.params = { projectId: 'projectId123' };
            req.body = { name: 'Updated Project' };
            projectService.updateProject.mockRejectedValue(new Error('Only project owner can update the project'));

            await projectController.updateProject(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only project owner can update the project'
            });
        });
    });

    describe('deleteProject', () => {
        it('should delete project successfully', async () => {
            req.params = { projectId: 'projectId123' };
            projectService.deleteProject.mockResolvedValue({ _id: 'projectId123' });

            await projectController.deleteProject(req, res);

            expect(projectService.deleteProject).toHaveBeenCalledWith('projectId123', 'userId123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project deleted successfully'
            });
        });

        it('should handle project not found on delete', async () => {
            req.params = { projectId: 'nonExistentId' };
            projectService.deleteProject.mockRejectedValue(new Error('Project not found'));

            await projectController.deleteProject(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Project not found'
            });
        });

        it('should handle permission denied on delete', async () => {
            req.params = { projectId: 'projectId123' };
            projectService.deleteProject.mockRejectedValue(new Error('Only project owner can delete the project'));

            await projectController.deleteProject(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Only project owner can delete the project'
            });
        });
    });
});
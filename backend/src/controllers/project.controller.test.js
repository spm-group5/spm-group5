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

    /**
     * NEW TEST SUITE: Project Task Viewing Permissions - Controller Layer (TDD)
     * Test Card Covered: PTV-006
     *
     * Purpose: Test getProjectsWithAccessMetadata controller method
     * Validates standard success response structure with canViewTasks metadata
     *
     * Note: These tests will FAIL until getProjectsWithAccessMetadata is implemented.
     * This follows TDD (Test-Driven Development) methodology.
     */
    describe('Project Task Viewing Permissions - Controller Layer (TDD)', () => {
        describe('getProjectsWithAccessMetadata', () => {
            describe('[PTV-006] Standard success response structure', () => {
                it('should return 200 with standard success structure including canViewTasks', async () => {
                    // Arrange: Mock service to return projects with canViewTasks metadata
                    const mockProjects = [
                        {
                            _id: 'project1',
                            name: 'Project Alpha',
                            description: 'First project',
                            owner: 'userId123',
                            status: 'Active',
                            canViewTasks: true
                        },
                        {
                            _id: 'project2',
                            name: 'Project Beta',
                            description: 'Second project',
                            owner: 'userId456',
                            status: 'Active',
                            canViewTasks: false
                        }
                    ];

                    req.user = {
                        _id: 'userId123',
                        roles: ['staff'],
                        department: 'engineering'
                    };

                    projectService.getProjectsWithAccessMetadata.mockResolvedValue(mockProjects);

                    // Act
                    await projectController.getProjectsWithAccessMetadata(req, res);

                    // Assert: Standard success response structure
                    expect(res.status).toHaveBeenCalledWith(200);
                    expect(res.json).toHaveBeenCalledWith({
                        success: true,
                        data: mockProjects
                    });
                });

                it('should extract userId, role, and department from req.user', async () => {
                    // Arrange
                    req.user = {
                        _id: 'userAbc',
                        roles: ['admin'],
                        department: 'sales'
                    };
                    projectService.getProjectsWithAccessMetadata.mockResolvedValue([]);

                    // Act
                    await projectController.getProjectsWithAccessMetadata(req, res);

                    // Assert: Verify service called with correct user data
                    expect(projectService.getProjectsWithAccessMetadata).toHaveBeenCalledWith(
                        'userAbc',
                        'admin',
                        'sales'
                    );
                });

                it('should verify each project contains canViewTasks property', async () => {
                    // Arrange
                    const mockProjects = [
                        {
                            _id: 'project1',
                            name: 'Test Project',
                            canViewTasks: true
                        },
                        {
                            _id: 'project2',
                            name: 'Another Project',
                            canViewTasks: false
                        }
                    ];

                    req.user = {
                        _id: 'userId123',
                        roles: ['staff'],
                        department: 'engineering'
                    };
                    projectService.getProjectsWithAccessMetadata.mockResolvedValue(mockProjects);

                    // Act
                    await projectController.getProjectsWithAccessMetadata(req, res);

                    // Assert: Response includes canViewTasks for each project
                    expect(res.json).toHaveBeenCalledWith({
                        success: true,
                        data: expect.arrayContaining([
                            expect.objectContaining({ canViewTasks: expect.any(Boolean) }),
                            expect.objectContaining({ canViewTasks: expect.any(Boolean) })
                        ])
                    });
                });

                it('should handle empty projects array', async () => {
                    // Arrange
                    req.user = {
                        _id: 'userId123',
                        roles: ['staff'],
                        department: 'engineering'
                    };
                    projectService.getProjectsWithAccessMetadata.mockResolvedValue([]);

                    // Act
                    await projectController.getProjectsWithAccessMetadata(req, res);

                    // Assert
                    expect(res.status).toHaveBeenCalledWith(200);
                    expect(res.json).toHaveBeenCalledWith({
                        success: true,
                        data: []
                    });
                });

                it('should handle errors with standard error response structure', async () => {
                    // Arrange
                    req.user = {
                        _id: 'userId123',
                        roles: ['staff'],
                        department: 'engineering'
                    };
                    projectService.getProjectsWithAccessMetadata.mockRejectedValue(
                        new Error('Database connection failed')
                    );

                    // Act
                    await projectController.getProjectsWithAccessMetadata(req, res);

                    // Assert
                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.json).toHaveBeenCalledWith({
                        success: false,
                        message: 'Database connection failed'
                    });
                });
            });
        });
    });
});
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
        // Create project with default status "To Do" and owner
        it('should create project successfully with default status "To Do"', async () => {
            const mockProject = {
                _id: 'projectId123',
                name: 'Test Project',
                description: 'Test description',
                owner: 'userId123',
                status: 'To Do',
                priority: 5, // Default priority
                tags: [],
                archived: false,
                archivedAt: null,
                members: ['userId123'],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            req.body = {
                name: 'Test Project',
                description: 'Test description'
            };
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

        // Empty name returns 400 error
        it('should return 400 when name is empty', async () => {
            req.body = { name: '' };
            projectService.createProject.mockRejectedValue(new Error('Project name is required'));

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Project name is required'
            });
        });

        // Valid priority (1-10) returns 201
        it('should create project with valid priority', async () => {
            const mockProject = {
                _id: 'projectId123',
                name: 'Priority Project',
                owner: 'userId123',
                status: 'To Do',
                priority: 5,
                tags: []
            };
            req.body = {
                name: 'Priority Project',
                priority: 5
            };
            projectService.createProject.mockResolvedValue(mockProject);

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project created successfully',
                data: mockProject
            });
        });

        // Invalid priority returns 400
        it('should return 400 when priority is invalid', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            req.body = {
                name: 'Test Project',
                dueDate: futureDate,
                priority: 11
            };
            projectService.createProject.mockRejectedValue(new Error('Priority must be a number between 1 and 10'));

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Priority must be a number between 1 and 10'
            });
        });

        // Valid future dueDate returns 201
        it('should create project with valid future dueDate', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const mockProject = {
                _id: 'projectId123',
                name: 'Future Date Project',
                owner: 'userId123',
                status: 'To Do',
                dueDate: futureDate,
                tags: []
            };
            req.body = {
                name: 'Future Date Project',
                dueDate: futureDate
            };
            projectService.createProject.mockResolvedValue(mockProject);

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project created successfully',
                data: mockProject
            });
        });

        // Missing dueDate returns 400
        it('should return 400 when dueDate is missing', async () => {
            req.body = { name: 'Test Project' };
            projectService.createProject.mockRejectedValue(new Error('Due date is required'));

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Due date is required'
            });
        });

        // Past dueDate returns 400
        it('should return 400 when dueDate is in the past', async () => {
            const pastDate = new Date(Date.now() - 86400000);
            req.body = {
                name: 'Test Project',
                dueDate: pastDate
            };
            projectService.createProject.mockRejectedValue(new Error('Due date cannot be in the past'));

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Due date cannot be in the past'
            });
        });

        // Valid status returns 201
        it('should create project with valid status "In Progress"', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const mockProject = {
                _id: 'projectId123',
                name: 'Status Project',
                owner: 'userId123',
                status: 'In Progress',
                dueDate: futureDate,
                tags: []
            };
            req.body = {
                name: 'Status Project',
                dueDate: futureDate,
                status: 'In Progress'
            };
            projectService.createProject.mockResolvedValue(mockProject);

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project created successfully',
                data: mockProject
            });
        });

        // Invalid status returns 400
        it('should return 400 when status is invalid', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            req.body = {
                name: 'Test Project',
                dueDate: futureDate,
                status: 'Active'
            };
            projectService.createProject.mockRejectedValue(new Error('Status must be one of: To Do, In Progress, Completed, Blocked'));

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Status must be one of: To Do, In Progress, Completed, Blocked'
            });
        });

        // Valid tags array returns 201
        it('should create project with tags array', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const mockProject = {
                _id: 'projectId123',
                name: 'Tagged Project',
                owner: 'userId123',
                status: 'To Do',
                dueDate: futureDate,
                tags: ['frontend', 'urgent']
            };
            req.body = {
                name: 'Tagged Project',
                dueDate: futureDate,
                tags: ['frontend', 'urgent']
            };
            projectService.createProject.mockResolvedValue(mockProject);

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project created successfully',
                data: mockProject
            });
        });

        // Project without tags field returns 201 (defaults to [])
        it('should create project without tags field', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const mockProject = {
                _id: 'projectId123',
                name: 'No Tags Project',
                owner: 'userId123',
                status: 'To Do',
                dueDate: futureDate,
                tags: []
            };
            req.body = {
                name: 'No Tags Project',
                dueDate: futureDate
            };
            projectService.createProject.mockResolvedValue(mockProject);

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project created successfully',
                data: mockProject
            });
        });

        // Response contains all required fields
        it('should return response with all required fields', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const mockProject = {
                _id: 'projectId123',
                name: 'Complete Project',
                description: 'Full description',
                owner: 'userId123',
                members: ['userId123'],
                status: 'In Progress',
                priority: 7,
                dueDate: futureDate,
                tags: ['important', 'milestone'],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            req.body = {
                name: 'Complete Project',
                description: 'Full description',
                dueDate: futureDate,
                priority: 7,
                status: 'In Progress',
                tags: ['important', 'milestone']
            };
            projectService.createProject.mockResolvedValue(mockProject);

            await projectController.createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project created successfully',
                data: expect.objectContaining({
                    _id: expect.any(String),
                    name: 'Complete Project',
                    description: 'Full description',
                    owner: expect.any(String),
                    members: expect.any(Array),
                    status: 'In Progress',
                    priority: 7,
                    dueDate: expect.any(Date),
                    tags: expect.arrayContaining(['important', 'milestone']),
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date)
                })
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
            req.user.roles = ['staff']; // Add roles to user
            req.user.department = 'engineering'; // Add department
            projectService.updateProject.mockResolvedValue(mockUpdatedProject);

            await projectController.updateProject(req, res);

            expect(projectService.updateProject).toHaveBeenCalledWith('projectId123', req.body, 'userId123', 'staff', 'engineering');
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
                            status: 'To Do',
                            canViewTasks: true
                        },
                        {
                            _id: 'project2',
                            name: 'Project Beta',
                            description: 'Second project',
                            owner: 'userId456',
                            status: 'In Progress',
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
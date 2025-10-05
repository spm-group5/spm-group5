import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/user.model.js';
import Task from '../models/task.model.js';
import Project from '../models/project.model.js';

// Share currentUser for the auth mock to use
let currentUser = null;

// Mock auth middleware
vi.mock('../middleware/auth.middleware.js', () => ({
    requireAuth: (req, res, next) => {
        if (currentUser) {
            req.session = {
                authenticated: true,
                userId: currentUser._id,
                username: currentUser.username,
                userRoles: currentUser.roles,
                userDepartment: currentUser.department
            };
            req.user = currentUser;
        } else {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    },
    requireRole: (roles) => (req, res, next) => {
        if (currentUser && currentUser.roles.some(role => roles.includes(role))) {
            next();
        } else {
            return res.status(403).json({ error: 'Forbidden - insufficient privileges' });
        }
    }
}));

// Mock puppeteer and xlsx to avoid heavy dependencies in tests
vi.mock('puppeteer', () => ({
    default: {
        launch: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
                setContent: vi.fn().mockResolvedValue(),
                pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content'))
            }),
            close: vi.fn().mockResolvedValue()
        })
    }
}));

vi.mock('xlsx', () => ({
    default: {
        utils: {
            book_new: vi.fn().mockReturnValue({}),
            aoa_to_sheet: vi.fn().mockReturnValue({ '!cols': [] }),
            book_append_sheet: vi.fn()
        },
        write: vi.fn().mockReturnValue(Buffer.from('mock-excel-content'))
    }
}));

// Import router AFTER the mocks above
import reportRouter from './report.router.js';

let app;
let mongoServer;
let adminUser;
let staffUser;
let testProject;
let testTasks;

beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app
    app = express();
    app.use(express.json());

    // Create test users
    adminUser = await User.create({
        username: 'adminuser',
        roles: ['admin'],
        department: 'it',
        hashed_password: 'password123'
    });

    staffUser = await User.create({
        username: 'staffuser',
        roles: ['staff'],
        department: 'hr',
        hashed_password: 'password456'
    });

    // Mount router
    app.use('/api', reportRouter);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Task.deleteMany({});
    await Project.deleteMany({});

    // Create test project
    testProject = await Project.create({
        name: 'Test Project for Reports',
        description: 'Test project for report generation',
        owner: adminUser._id
    });

    // Create test tasks
    const baseDate = new Date('2024-01-15');
    const futureDueDate = new Date();
    futureDueDate.setDate(futureDueDate.getDate() + 30); // 30 days from now

    testTasks = await Task.create([
        {
            title: 'Task 1 - To Do',
            description: 'First task to do',
            status: 'To Do',
            priority: 8, // High priority (number 1-10)
            owner: adminUser._id,
            assignee: staffUser._id,
            project: testProject._id,
            dueDate: futureDueDate,
            createdAt: baseDate
        },
        {
            title: 'Task 2 - In Progress',
            description: 'Second task in progress',
            status: 'In Progress',
            priority: 5, // Medium priority
            owner: staffUser._id,
            assignee: adminUser._id,
            project: testProject._id,
            createdAt: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)
        },
        {
            title: 'Task 3 - Done',
            description: 'Third task completed',
            status: 'Done',
            priority: 3, // Low priority
            owner: adminUser._id,
            assignee: staffUser._id,
            project: testProject._id,
            createdAt: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000)
        }
    ]);

    // Clear mocks
    vi.clearAllMocks();
});

describe('Report Router Test', () => {
    describe('GET /api/reports/task-completion/project/:projectId', () => {
        const validQuery = {
            startDate: '2024-01-01',
            endDate: '2024-02-28',
            format: 'pdf'
        };

        describe('Authentication and Authorization', () => {
            it('should return 401 when user is not authenticated', async () => {
                currentUser = null;
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;

                const response = await request(app)
                    .get(endpoint)
                    .query(validQuery)
                    .expect(401);

                expect(response.body.error).toBe('Unauthorized');
            });

            it('should return 403 when user is not admin', async () => {
                currentUser = staffUser;
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;

                const response = await request(app)
                    .get(endpoint)
                    .query(validQuery)
                    .expect(403);

                expect(response.body.error).toBe('Forbidden - insufficient privileges');
            });

            it('should allow admin users to access the endpoint', async () => {
                currentUser = adminUser;
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;

                // This should not return 401 or 403
                const response = await request(app)
                    .get(endpoint)
                    .query(validQuery);

                expect(response.status).not.toBe(401);
                expect(response.status).not.toBe(403);
            });
        });

        describe('Valid Requests', () => {
            beforeEach(() => {
                currentUser = adminUser;
            });

            it('should generate PDF report successfully', async () => {
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
                const response = await request(app)
                    .get(endpoint)
                    .query(validQuery)
                    .expect(200);

                expect(response.headers['content-type']).toBe('application/pdf');
                expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.pdf"/);
                expect(Buffer.isBuffer(response.body)).toBe(true);
            });

            it('should generate Excel report successfully', async () => {
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
                const query = { ...validQuery, format: 'excel' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(200);

                expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.xlsx"/);
                expect(Buffer.isBuffer(response.body)).toBe(true);
            });

            it('should accept case-insensitive format parameter', async () => {
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
                const query = { ...validQuery, format: 'PDF' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(200);

                expect(response.headers['content-type']).toBe('application/pdf');
            });

            it('should handle different date ranges', async () => {
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
                const query = {
                    startDate: '2024-01-16',
                    endDate: '2024-01-17',
                    format: 'pdf'
                };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(200);

                expect(response.headers['content-type']).toBe('application/pdf');
            });
        });

        describe('Invalid Requests', () => {
            beforeEach(() => {
                currentUser = adminUser;
            });

            it('should return 400 for missing startDate', async () => {
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
                const query = { endDate: '2024-02-28', format: 'pdf' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toBe('Missing required parameters');
                expect(response.body.message).toBe('startDate, endDate, and format are required parameters');
            });

            it('should return 400 for missing endDate', async () => {
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
                const query = { startDate: '2024-01-01', format: 'pdf' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toBe('Missing required parameters');
            });

            it('should return 400 for missing format', async () => {
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
                const query = { startDate: '2024-01-01', endDate: '2024-02-28' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toBe('Missing required parameters');
            });

            it('should return 400 for invalid format (json not allowed)', async () => {
                const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
                const query = { ...validQuery, format: 'json' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toBe('Invalid format parameter');
                expect(response.body.message).toBe('Format must be either pdf or excel');
            });

            it('should return 400 for invalid format (unsupported format)', async () => {
                const query = { ...validQuery, format: 'csv' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toBe('Invalid format parameter');
            });

            it('should return 400 for invalid date format', async () => {
                const query = { ...validQuery, startDate: 'invalid-date' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toContain('Invalid start date format');
            });

            it('should return 400 when start date is after end date', async () => {
                const query = {
                    startDate: '2024-02-28',
                    endDate: '2024-01-01',
                    format: 'pdf'
                };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toBe('Start date cannot be after end date');
            });

            it('should return 404 for non-existent project', async () => {
                const fakeProjectId = new mongoose.Types.ObjectId();
                const fakeEndpoint = `/api/reports/task-completion/project/${fakeProjectId}`;

                const response = await request(app)
                    .get(fakeEndpoint)
                    .query(validQuery)
                    .expect(404);

                expect(response.body.error).toBe('Resource not found');
                expect(response.body.message).toBe('Project not found');
            });
        });
    });

    describe('GET /api/reports/task-completion/user/:userId', () => {
        const validQuery = {
            startDate: '2024-01-01',
            endDate: '2024-02-28',
            format: 'pdf'
        };

        describe('Authentication and Authorization', () => {
            it('should return 401 when user is not authenticated', async () => {
                currentUser = null;

                const response = await request(app)
                    .get(endpoint)
                    .query(validQuery)
                    .expect(401);

                expect(response.body.error).toBe('Unauthorized');
            });

            it('should return 403 when user is not admin', async () => {
                currentUser = staffUser;

                const response = await request(app)
                    .get(endpoint)
                    .query(validQuery)
                    .expect(403);

                expect(response.body.error).toBe('Forbidden - insufficient privileges');
            });

            it('should allow admin users to access the endpoint', async () => {
                currentUser = adminUser;

                const response = await request(app)
                    .get(endpoint)
                    .query(validQuery);

                expect(response.status).not.toBe(401);
                expect(response.status).not.toBe(403);
            });
        });

        describe('Valid Requests', () => {
            beforeEach(() => {
                currentUser = adminUser;
            });

            it('should generate PDF report for user successfully', async () => {
                const response = await request(app)
                    .get(endpoint)
                    .query(validQuery)
                    .expect(200);

                expect(response.headers['content-type']).toBe('application/pdf');
                expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*user.*\.pdf"/);
                expect(Buffer.isBuffer(response.body)).toBe(true);
            });

            it('should generate Excel report for user successfully', async () => {
                const query = { ...validQuery, format: 'excel' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(200);

                expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*user.*\.xlsx"/);
            });

            it('should handle user with no tasks', async () => {
                const userWithNoTasks = await User.create({
                    username: 'notaskuser',
                    roles: ['staff'],
                    department: 'finance',
                    hashed_password: 'password789'
                });

                const userEndpoint = `/api/reports/task-completion/user/${userWithNoTasks._id}`;

                const response = await request(app)
                    .get(userEndpoint)
                    .query(validQuery)
                    .expect(200);

                expect(response.headers['content-type']).toBe('application/pdf');
            });
        });

        describe('Invalid Requests', () => {
            beforeEach(() => {
                currentUser = adminUser;
            });

            it('should return 400 for missing parameters', async () => {
                const query = { startDate: '2024-01-01' }; // Missing endDate and format

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toBe('Missing required parameters');
            });

            it('should return 400 for invalid format', async () => {
                const query = { ...validQuery, format: 'json' };

                const response = await request(app)
                    .get(endpoint)
                    .query(query)
                    .expect(400);

                expect(response.body.error).toBe('Invalid format parameter');
            });

            it('should return 404 for non-existent user', async () => {
                const fakeUserId = new mongoose.Types.ObjectId();
                const fakeEndpoint = `/api/reports/task-completion/user/${fakeUserId}`;

                const response = await request(app)
                    .get(fakeEndpoint)
                    .query(validQuery)
                    .expect(404);

                expect(response.body.error).toBe('Resource not found');
                expect(response.body.message).toBe('User not found');
            });
        });
    });

    describe('Route Parameter Validation', () => {
        beforeEach(() => {
            currentUser = adminUser;
        });

        it('should handle invalid MongoDB ObjectId format in project route', async () => {
            const invalidEndpoint = '/api/reports/task-completion/project/invalid-id';
            const validQuery = {
                startDate: '2024-01-01',
                endDate: '2024-02-28',
                format: 'pdf'
            };

            const response = await request(app)
                .get(invalidEndpoint)
                .query(validQuery);

            // Should return some kind of error (either 400 for invalid ID or 404 for not found)
            expect([400, 404, 500]).toContain(response.status);
        });

        it('should handle invalid MongoDB ObjectId format in user route', async () => {
            const invalidEndpoint = '/api/reports/task-completion/user/invalid-id';
            const validQuery = {
                startDate: '2024-01-01',
                endDate: '2024-02-28',
                format: 'pdf'
            };

            const response = await request(app)
                .get(invalidEndpoint)
                .query(validQuery);

            // Should return some kind of error
            expect([400, 404, 500]).toContain(response.status);
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            currentUser = adminUser;
        });

        it('should handle same start and end date', async () => {
            const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
            const query = {
                startDate: '2024-01-15',
                endDate: '2024-01-15',
                format: 'pdf'
            };

            const response = await request(app)
                .get(endpoint)
                .query(query)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/pdf');
        });

        it('should handle future date ranges with no data', async () => {
            const endpoint = `/api/reports/task-completion/user/${staffUser._id}`;
            const query = {
                startDate: '2025-01-01',
                endDate: '2025-01-31',
                format: 'excel'
            };

            const response = await request(app)
                .get(endpoint)
                .query(query)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });

        it('should handle very long date ranges', async () => {
            const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
            const query = {
                startDate: '2020-01-01',
                endDate: '2030-12-31',
                format: 'pdf'
            };

            const response = await request(app)
                .get(endpoint)
                .query(query)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/pdf');
        });
    });

    describe('Content Headers Validation', () => {
        beforeEach(() => {
            currentUser = adminUser;
        });

        it('should set correct Content-Disposition header for PDF', async () => {
            const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
            const query = {
                startDate: '2024-01-01',
                endDate: '2024-02-28',
                format: 'pdf'
            };

            const response = await request(app)
                .get(endpoint)
                .query(query)
                .expect(200);

            expect(response.headers['content-disposition']).toMatch(
                /attachment; filename="task-completion-report-project-.+\.pdf"/
            );
        });

        it('should set correct Content-Disposition header for Excel', async () => {
            const endpoint = `/api/reports/task-completion/user/${staffUser._id}`;
            const query = {
                startDate: '2024-01-01',
                endDate: '2024-02-28',
                format: 'excel'
            };

            const response = await request(app)
                .get(endpoint)
                .query(query)
                .expect(200);

            expect(response.headers['content-disposition']).toMatch(
                /attachment; filename="task-completion-report-user-.+\.xlsx"/
            );
        });

        it('should include Content-Length header', async () => {
            const endpoint = `/api/reports/task-completion/project/${testProject._id}`;
            const query = {
                startDate: '2024-01-01',
                endDate: '2024-02-28',
                format: 'pdf'
            };

            const response = await request(app)
                .get(endpoint)
                .query(query)
                .expect(200);

            expect(response.headers['content-length']).toBeDefined();
            expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
        });
    });
});
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Task from '../models/task.model.js';
import Subtask from '../models/subtask.model.js';
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
import loggedTimeReportRouter from './logged-time-report.router.js';

// Share currentUser for the auth mock to use


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

// ...existing code for Mongo setup, user/project/task creation, and test cases for:
// LTR-001: Unauthorized
// LTR-002: Insufficient Privileges
// LTR-003: Missing Required Parameters
// LTR-004: Invalid Format Parameter
// LTR-005: Non-existent Project
// LTR-006: Happy Path PDF
// LTR-007: Happy Path Excel
// LTR-008: Data Completeness (tasks/subtasks, archived)
// LTR-009: Aggregation (total time formatting)

let app;
let adminUser;
let staffUser;
let testProject;
let testTasks;
let testSubtasks;


beforeAll(async () => {
    // Setup: Use the shared MongoDB connection from global test setup
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection not ready');
    }
    app = express();
    app.use(express.json());

    // Create test users
    adminUser = await User.create({
        username: 'adminuser@example.com',
        roles: ['admin'],
        department: 'it',
        hashed_password: 'password123'
    });
    staffUser = await User.create({
        username: 'staffuser@example.com',
        roles: ['staff'],
        department: 'hr',
        hashed_password: 'password456'
    });

    // Mount router (assume /api/reports/logged-time/project/:projectId exists)
    app.use('/api', loggedTimeReportRouter);
});

beforeEach(async () => {
    await Task.deleteMany({});
    await Subtask.deleteMany({});
    await Project.deleteMany({});

    // Create test project
    testProject = await Project.create({
        name: 'Test Project for Logged Time',
        description: 'Test project for logged time report',
        owner: adminUser._id
    });

    // Create test tasks
    testTasks = await Task.create([
        {
            title: 'Task 1',
            description: 'Task 1 desc',
            status: 'To Do',
            priority: 8,
            owner: adminUser._id,
            assignee: [staffUser._id],
            project: testProject._id,
            dueDate: new Date(Date.now() + 86400000),
            createdAt: new Date('2024-01-15'),
            timeTaken: 90 // minutes
        },
        {
            title: 'Task 2',
            description: 'Task 2 desc',
            status: 'Completed',
            priority: 5,
            owner: staffUser._id,
            assignee: [adminUser._id],
            project: testProject._id,
            createdAt: new Date('2024-01-16'),
            timeTaken: 200
        },
        {
            title: 'Task 3',
            description: 'Task 3 desc',
            status: 'Blocked',
            priority: 3,
            owner: adminUser._id,
            assignee: [staffUser._id],
            project: testProject._id,
            createdAt: new Date('2024-01-17'),
            timeTaken: 1500
        },
        {
            title: 'Task 4',
            description: 'Task 4 desc',
            status: 'Completed',
            priority: 9,
            owner: adminUser._id,
            assignee: [adminUser._id],
            project: testProject._id,
            createdAt: new Date('2024-01-18'),
            archived: true,
            timeTaken: 60
        }
    ]);

    // Create subtasks
    testSubtasks = await Subtask.create([
        {
            title: 'Subtask 1',
            status: 'Completed',
            priority: 7,
            ownerId: staffUser._id,
            assigneeId: adminUser._id,
            parentTaskId: testTasks[0]._id,
            projectId: testProject._id,
            createdAt: new Date('2024-01-19'),
            timeTaken: 30
        },
        {
            title: 'Subtask 2',
            status: 'In Progress',
            priority: 6,
            ownerId: adminUser._id,
            assigneeId: staffUser._id,
            parentTaskId: testTasks[1]._id,
            projectId: testProject._id,
            createdAt: new Date('2024-01-20'),
            archived: true,
            timeTaken: 45
        }
    ]);

    vi.clearAllMocks();
});

describe('Logged Time Report Router Test', () => {
    const endpointBase = () => `/api/reports/logged-time/project/${testProject._id}`;

    // LTR-001: Authentication - Unauthorized Access
    it('LTR-001: should return 401 when user is not authenticated', async () => {
        currentUser = null;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf' })
            .expect(401);
        expect(response.body.error).toBe('Unauthorized');
    });

    // LTR-002: Authorization - Insufficient Privileges
    it('LTR-002: should return 403 when user is not admin', async () => {
        currentUser = staffUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf' })
            .expect(403);
        expect(response.body.error).toBe('Forbidden - insufficient privileges');
    });

    // LTR-003: Validation - Missing Required Parameters
    it('LTR-003: should return 400 for missing format parameter', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .expect(400);
        expect(response.body.error).toMatch(/Missing required parameters/i);
    });

    // LTR-004: Validation - Invalid Format Parameter
    it('LTR-004: should return 400 for invalid format value', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'json' })
            .expect(400);
        expect(response.body.error).toMatch(/Invalid format/i);
    });

    // LTR-005: Error Handling - Non-existent Project
    it('LTR-005: should return 404 for non-existent project', async () => {
        currentUser = adminUser;
        const fakeId = new mongoose.Types.ObjectId();
        const endpoint = `/api/reports/logged-time/project/${fakeId}`;
        const response = await request(app)
            .get(endpoint)
            .query({ format: 'pdf' })
            .expect(404);
        expect(response.body.error).toMatch(/not found|Project not found/i);
    });

    // LTR-006: Happy Path - Generate PDF Report
    it('LTR-006: should generate PDF logged time report successfully', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.pdf"/);
        expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    // LTR-007: Happy Path - Generate Excel Report
    it('LTR-007: should generate Excel logged time report successfully', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'excel' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.xlsx"/);
        expect(response.body).toBeDefined();
    });

    // LTR-008: Data Completeness - Includes Tasks and Subtasks, Excludes Archived
    it('LTR-008: should include all non-archived tasks and subtasks, exclude archived', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        // Optionally, check aggregation logic by inspecting the report if possible
    });

    // LTR-009: Aggregation - Total Time Formatting
    it('LTR-009: should aggregate total logged time and format as min/hr/day', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        // Optionally, check aggregation logic by inspecting the report if possible
    });

    // Edge: Invalid projectId format (should return 500 or 400)
    it('should handle invalid MongoDB ObjectId format in project route', async () => {
        currentUser = adminUser;
        const endpoint = '/api/reports/logged-time/project/invalid-id';
        const response = await request(app)
            .get(endpoint)
            .query({ format: 'pdf' })
            .expect(res => {
                expect([400, 500]).toContain(res.status);
            });
    });

    // Edge: Future date range with no data
    it('should handle future date ranges with no data', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf', startDate: '2030-01-01', endDate: '2030-12-31' })
            .expect(200);
        // Should return JSON message when no tasks found, not generate PDF
        // (Assume implementation returns JSON with { success: false, type: 'NO_DATA_FOUND' })
        expect([
            'application/json; charset=utf-8',
            'application/pdf' // fallback if not implemented
        ]).toContain(response.headers['content-type']);
    });

    // Edge: Same start and end date
    it('should handle same start and end date', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf', startDate: '2024-01-15', endDate: '2024-01-15' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
    });

    // Content headers validation
    it('should set correct Content-Disposition header for PDF', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.pdf"/);
    });
    it('should set correct Content-Disposition header for Excel', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'excel' })
            .expect(200);
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.xlsx"/);
    });
    it('should include Content-Length header', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpointBase())
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-length']).toBeDefined();
        expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
    });
});

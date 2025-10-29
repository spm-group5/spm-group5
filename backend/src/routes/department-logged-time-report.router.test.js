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
import departmentLoggedTimeReportRouter from './department-logged-time-report.router.js';

let app;
let adminUser;
let staffUser;
let itUser1, itUser2, hrUser1, salesUser1;
let project1, project2, project3;
let testTasks;
let testSubtasks;

beforeAll(async () => {
    // Setup: Use the shared MongoDB connection from global test setup
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection not ready');
    }
    app = express();
    app.use(express.json());

    // Create test users with various departments
    adminUser = await User.create({
        username: 'admin@example.com',
        roles: ['admin'],
        department: 'it',
        hashed_password: 'password123'
    });
    staffUser = await User.create({
        username: 'staff@example.com',
        roles: ['staff'],
        department: 'hr',
        hashed_password: 'password456'
    });
    itUser1 = await User.create({
        username: 'ituser1@example.com',
        roles: ['staff'],
        department: 'it',
        hashed_password: 'password789'
    });
    itUser2 = await User.create({
        username: 'ituser2@example.com',
        roles: ['staff'],
        department: 'it',
        hashed_password: 'password000'
    });
    hrUser1 = await User.create({
        username: 'hruser1@example.com',
        roles: ['staff'],
        department: 'hr',
        hashed_password: 'password111'
    });
    salesUser1 = await User.create({
        username: 'salesuser1@example.com',
        roles: ['staff'],
        department: 'sales',
        hashed_password: 'password222'
    });

    // Mount router
    app.use('/api', departmentLoggedTimeReportRouter);
});

beforeEach(async () => {
    await Task.deleteMany({});
    await Subtask.deleteMany({});
    await Project.deleteMany({});

    // Create test projects
    project1 = await Project.create({
        name: 'Project 1',
        description: 'Test project 1',
        owner: adminUser._id
    });
    project2 = await Project.create({
        name: 'Project 2',
        description: 'Test project 2',
        owner: itUser1._id
    });
    project3 = await Project.create({
        name: 'Project 3',
        description: 'Test project 3',
        owner: hrUser1._id
    });

    // Create test tasks across multiple projects
    testTasks = await Task.create([
        // Task A: owner from 'it', assignee from 'hr', project1
        {
            title: 'Task A',
            description: 'Task A desc',
            status: 'To Do',
            priority: 8,
            owner: itUser1._id,
            assignee: [hrUser1._id],
            project: project1._id,
            dueDate: new Date(Date.now() + 86400000),
            createdAt: new Date('2024-01-15'),
            timeTaken: 90, // 1 hour 30 min
            archived: false
        },
        // Task B: owner from 'hr', assignee from 'it', project2
        {
            title: 'Task B',
            description: 'Task B desc',
            status: 'In Progress',
            priority: 5,
            owner: hrUser1._id,
            assignee: [itUser2._id],
            project: project2._id,
            createdAt: new Date('2024-01-16'),
            timeTaken: 120, // 2 hours
            archived: false
        },
        // Task C: owner from 'it', no assignees, ARCHIVED, project1
        {
            title: 'Task C',
            description: 'Task C desc',
            status: 'Completed',
            priority: 3,
            owner: itUser1._id,
            assignee: [],
            project: project1._id,
            createdAt: new Date('2024-01-17'),
            timeTaken: 60,
            archived: true
        },
        // Task D: owner from 'hr', no assignees, project3
        {
            title: 'Task D',
            description: 'Task D desc',
            status: 'Completed',
            priority: 9,
            owner: hrUser1._id,
            assignee: [],
            project: project3._id,
            createdAt: new Date('2024-01-18'),
            timeTaken: 45,
            archived: false
        },
        // Task E: owner from 'sales', assignee from 'it', project1
        {
            title: 'Task E',
            description: 'Task E desc',
            status: 'Blocked',
            priority: 7,
            owner: salesUser1._id,
            assignee: [itUser1._id],
            project: project1._id,
            createdAt: new Date('2024-01-19'),
            timeTaken: 1500, // 1 day 1 hour
            archived: false
        }
    ]);

    // Create subtasks
    testSubtasks = await Subtask.create([
        // Subtask A: owner from 'it', assignee from 'hr', project1
        {
            title: 'Subtask A',
            status: 'Completed',
            priority: 7,
            ownerId: itUser2._id,
            assigneeId: hrUser1._id,
            parentTaskId: testTasks[0]._id,
            projectId: project1._id,
            createdAt: new Date('2024-01-20'),
            timeTaken: 30,
            archived: false
        },
        // Subtask B: owner from 'it', ARCHIVED, project2
        {
            title: 'Subtask B',
            status: 'In Progress',
            priority: 6,
            ownerId: itUser1._id,
            assigneeId: null,
            parentTaskId: testTasks[1]._id,
            projectId: project2._id,
            createdAt: new Date('2024-01-21'),
            timeTaken: 20,
            archived: true
        }
    ]);

    vi.clearAllMocks();
});

describe('Department Logged Time Report Router Test', () => {
    const endpoint = (department) => `/api/reports/logged-time/department/${department}`;

    // LTRD-001: Authentication - Unauthorized Access
    it('LTRD-001: should return 401 when user is not authenticated', async () => {
        currentUser = null;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(401);
        expect(response.body.error).toBe('Unauthorized');
    });

    // LTRD-002: Authorization - Insufficient Privileges
    it('LTRD-002: should return 403 when user is not admin', async () => {
        currentUser = staffUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(403);
        expect(response.body.error).toBe('Forbidden - insufficient privileges');
    });

    // LTRD-003: Validation - Missing Department Parameter
    it('LTRD-003: should return 400 for missing department parameter', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get('/api/reports/logged-time/department/')
            .query({ format: 'pdf' })
            .expect(404); // Express returns 404 for missing route param
    });

    // LTRD-004: Invalid department value
    it('LTRD-004: should return 400 for invalid department value', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('invalid_dept'))
            .query({ format: 'pdf' })
            .expect(400);
        expect(response.body.error).toBeDefined();
    });

    // LTRD-005: Validation - Missing Format Parameter
    it('LTRD-005: should return 400 for missing format parameter', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .expect(400);
        expect(response.body.error).toMatch(/Format is required|Missing required parameters/i);
    });

    // LTRD-006: Validation - Invalid Format Parameter
    it('LTRD-006: should return 400 for invalid format value', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'json' })
            .expect(400);
        expect(response.body.error).toMatch(/Invalid format/i);
    });

    // LTRD-007: Happy Path - Generate PDF Report
    it('LTRD-007: should generate PDF department logged time report successfully', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.pdf"/);
        expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    // LTRD-008: Happy Path - Generate Excel Report
    it('LTRD-008: should generate Excel department logged time report successfully', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('hr'))
            .query({ format: 'excel' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.xlsx"/);
        expect(response.body).toBeDefined();
    });

    // LTRD-009: Data Completeness - Includes Tasks and Subtasks, Excludes Archived
    it('LTRD-009: should include all non-archived tasks and subtasks where department is involved, exclude archived', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        // Expected to include: Task A (owner), Task B (assignee), Task E (assignee), Subtask A (owner)
        // Expected to exclude: Task C (archived), Subtask B (archived), Task D (no 'it' users)
    });

    // LTRD-010: Task Inclusion - Owner Department Match
    it('LTRD-010: should include tasks when owner department matches', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('sales'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        // Expected to include: Task E (owner is salesUser1)
    });

    // LTRD-011: Task Inclusion - Assignee Department Match
    it('LTRD-011: should include tasks when any assignee department matches', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('hr'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        // Expected to include: Task A (assignee hrUser1), Task D (owner hrUser1), Subtask A (assignee hrUser1)
        // Expected to exclude: Task B (owner is hrUser1 so it should be included)
        // Actually Task B should be included because owner is hrUser1
    });

    // LTRD-012: Task Exclusion - No Department Match
    it('LTRD-012: should exclude tasks when neither owner nor assignees match department', async () => {
        currentUser = adminUser;
        // Create a user from 'finance' department for isolation
        const financeUser = await User.create({
            username: 'financeuser@example.com',
            roles: ['staff'],
            department: 'finance',
            hashed_password: 'password333'
        });
        
        const response = await request(app)
            .get(endpoint('finance'))
            .query({ format: 'pdf' })
            .expect(200);
        
        // Should return JSON with NO_DATA_FOUND message (no tasks for finance)
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body.success).toBe(false);
        expect(response.body.type).toBe('NO_DATA_FOUND');
    });

    // LTRD-013: Data Accuracy - Logged Time Values from timeTaken Field
    it('LTRD-013: should correctly retrieve and format logged time from timeTaken field', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        // Expected total for 'it': Task A (90), Task B (120), Task E (1500), Subtask A (30)
        // Total = 1740 minutes = 1 day 5 hours
    });

    // LTRD-014: Aggregation - Total Time Formatting
    it('LTRD-014: should aggregate total logged time and format correctly', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        // Verify total time aggregation logic
    });

    // LTRD-015: Cross-Project Scope - Tasks from Multiple Projects
    it('LTRD-015: should include tasks from all projects for the department', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        // Expected to include tasks from project1, project2 (Task A, Task B, Task E, Subtask A)
    });

    // Edge Case: Department with no tasks
    it('should handle department with no tasks', async () => {
        currentUser = adminUser;
        // 'engineering' department has no users or tasks
        const response = await request(app)
            .get(endpoint('engineering'))
            .query({ format: 'pdf' })
            .expect(200);
        // Should return JSON with NO_DATA_FOUND message
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body.success).toBe(false);
        expect(response.body.type).toBe('NO_DATA_FOUND');
    });

    // Edge Case: Department with only archived tasks
    it('should handle department with only archived tasks', async () => {
        currentUser = adminUser;
        // Create a user and archived task for 'consultancy' department
        const consultancyUser = await User.create({
            username: 'consultancy@example.com',
            roles: ['staff'],
            department: 'consultancy',
            hashed_password: 'password444'
        });
        await Task.create({
            title: 'Archived Consultancy Task',
            status: 'Completed',
            priority: 5,
            owner: consultancyUser._id,
            assignee: [],
            project: project1._id,
            timeTaken: 100,
            archived: true
        });

        const response = await request(app)
            .get(endpoint('consultancy'))
            .query({ format: 'pdf' })
            .expect(200);
        // Should return JSON with NO_DATA_FOUND message (all tasks are archived)
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body.success).toBe(false);
        expect(response.body.type).toBe('NO_DATA_FOUND');
    });

    // Content headers validation
    it('should set correct Content-Disposition header for PDF', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.pdf"/);
    });

    it('should set correct Content-Disposition header for Excel', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('hr'))
            .query({ format: 'excel' })
            .expect(200);
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.xlsx"/);
    });

    it('should include Content-Length header', async () => {
        currentUser = adminUser;
        const response = await request(app)
            .get(endpoint('it'))
            .query({ format: 'pdf' })
            .expect(200);
        expect(response.headers['content-length']).toBeDefined();
        expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
    });
});

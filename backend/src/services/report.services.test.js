import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import reportService from './report.services.js';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import xlsx from 'xlsx';
import puppeteer from 'puppeteer';

// Mock external dependencies
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

let mongoServer;

beforeAll(async () => {
    // Setup: Use the shared MongoDB connection from global test setup
    // Connection is already established by global test setup
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection not ready');
    }
});

afterAll(async () => {
    // Cleanup is handled by global test setup
});

describe('Report Service Test', () => {
    let testUser1;
    let testUser2;
    let testProject;
    let testTasks;

    beforeEach(async () => {
        // Clean up collections
        await Task.deleteMany({});
        await User.deleteMany({});
        await Project.deleteMany({});

        // Create test users
        testUser1 = await User.create({
            username: 'testuser1@example.com',
            roles: ['staff'],
            department: 'it',
            hashed_password: 'password123'
        });

        testUser2 = await User.create({
            username: 'testuser2@example.com',
            roles: ['admin'],
            department: 'hr',
            hashed_password: 'password456'
        });

        // Create test project
        testProject = await Project.create({
            name: 'Test Project',
            description: 'Test project for reports',
            owner: testUser1._id
        });

        // Create test tasks with different statuses and dates
        const baseDate = new Date('2024-01-15');
        const futureDueDate1 = new Date();
        futureDueDate1.setDate(futureDueDate1.getDate() + 30); // 30 days from now
        const futureDueDate2 = new Date();
        futureDueDate2.setDate(futureDueDate2.getDate() + 45); // 45 days from now

        testTasks = await Task.create([
            {
                title: 'Task 1 - To Do',
                description: 'First task to do',
                status: 'To Do',
                priority: 8, // High priority (was 'High')
                tags: 'feature,frontend',
                owner: testUser1._id,
                assignee: [testUser2._id],
                project: testProject._id,
                dueDate: futureDueDate1, // Future date
                createdAt: baseDate
            },
            {
                title: 'Task 2 - In Progress',
                description: 'Second task in progress',
                status: 'In Progress',
                priority: 5, // Medium priority (was 'Medium')
                tags: 'backend,api',
                owner: testUser1._id,
                assignee: [testUser1._id],
                project: testProject._id,
                dueDate: futureDueDate2, // Future date
                createdAt: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000) // +1 day
            },
            {
                title: 'Task 3 - Blocked',
                description: 'Third task blocked',
                status: 'Blocked',
                priority: 3, // Low priority (was 'Low')
                tags: 'testing',
                owner: testUser2._id,
                assignee: [testUser1._id],
                project: testProject._id,
                createdAt: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000) // +2 days
            },
            {
                title: 'Task 4 - Done',
                description: 'Fourth task completed',
                status: 'Completed',
                priority: 9, // High priority (was 'High')
                owner: testUser2._id,
                assignee: [testUser2._id],
                project: testProject._id,
                // No dueDate for completed task
                createdAt: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000) // +3 days
            },
            {
                title: 'Task 5 - Outside Date Range',
                description: 'Task outside date range',
                status: 'To Do',
                priority: 6, // Default priority
                owner: testUser1._id,
                project: testProject._id,
                createdAt: new Date('2024-03-01') // Outside our test range
            },
            {
                title: 'Task 6 - User Task',
                description: 'Task for user',
                status: 'Completed',
                priority: 7,
                owner: testUser1._id,
                assignee: [testUser1._id],
                project: testProject._id, // Project is now required
                createdAt: baseDate
            }
        ]);

        // Clear mocks
        vi.clearAllMocks();
    });

    describe('generateProjectTaskCompletionReportData', () => {
        // Test case ID: RGE-016
        it('should generate project report data successfully', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-02-28');

            const reportData = await reportService.generateProjectTaskCompletionReportData(
                testProject._id.toString(),
                startDate,
                endDate
            );

            expect(reportData).toBeDefined();
            expect(reportData.data).toBeDefined();
            expect(reportData.aggregates).toBeDefined();
            expect(reportData.metadata).toBeDefined();

            // Check metadata
            expect(reportData.metadata.type).toBe('project');
            expect(reportData.metadata.projectName).toBe('Test Project');
            expect(reportData.metadata.projectOwner).toBe('testuser1@example.com');
            expect(reportData.metadata.projectId).toBe(testProject._id.toString());

            // Check aggregates - should include 5 project tasks within date range (excluding task 5)
            expect(reportData.aggregates.total).toBe(5);
            expect(reportData.aggregates['To Do']).toBe(1);
            expect(reportData.aggregates['In Progress']).toBe(1);
            expect(reportData.aggregates['Blocked']).toBe(1);
            expect(reportData.aggregates['Completed']).toBe(2);

            // Check data structure
            expect(reportData.data['To Do']).toHaveLength(1);
            expect(reportData.data['In Progress']).toHaveLength(1);
            expect(reportData.data['Blocked']).toHaveLength(1);
            expect(reportData.data['Completed']).toHaveLength(2);

            // Verify task data format
            const todoTask = reportData.data['To Do'][0];
            expect(todoTask).toHaveProperty('id');
            expect(todoTask).toHaveProperty('title', 'Task 1 - To Do');
            expect(todoTask).toHaveProperty('deadline');
            expect(todoTask).toHaveProperty('priority', '8'); // Priority is formatted as string in report
            expect(todoTask).toHaveProperty('tags', 'feature,frontend');
            expect(todoTask).toHaveProperty('owner', 'testuser1@example.com');
            expect(todoTask).toHaveProperty('assignee', 'testuser2@example.com');
            expect(todoTask).toHaveProperty('project', 'Test Project');
        });

        // Test case ID: RGE-010
        it('should throw error for non-existent project', async () => {
            const fakeProjectId = new mongoose.Types.ObjectId();
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-02-28');

            await expect(reportService.generateProjectTaskCompletionReportData(
                fakeProjectId.toString(),
                startDate,
                endDate
            )).rejects.toThrow('Project not found');
        });

        // Test case ID: RGE-013
        it('should return empty data for date range with no tasks', async () => {
            const startDate = new Date('2025-01-01');
            const endDate = new Date('2025-02-28');

            const reportData = await reportService.generateProjectTaskCompletionReportData(
                testProject._id.toString(),
                startDate,
                endDate
            );

            expect(reportData.aggregates.total).toBe(0);
            expect(reportData.data['To Do']).toHaveLength(0);
            expect(reportData.data['In Progress']).toHaveLength(0);
            expect(reportData.data['Blocked']).toHaveLength(0);
            expect(reportData.data['Completed']).toHaveLength(0);
        });

        it('should filter tasks correctly by date range', async () => {
            const startDate = new Date('2024-01-16'); // Includes task 2 (created 2024-01-16)
            const endDate = new Date('2024-01-16');   // Only includes task 2 (same day)

            const reportData = await reportService.generateProjectTaskCompletionReportData(
                testProject._id.toString(),
                startDate,
                endDate
            );

            expect(reportData.aggregates.total).toBe(1);
            expect(reportData.data['In Progress']).toHaveLength(1);
            expect(reportData.data['In Progress'][0].title).toBe('Task 2 - In Progress');
        });
    });

    describe('generateUserTaskCompletionReportData', () => {
        // Test case ID: RGE-017
        it('should generate user report data for tasks owned or assigned', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-02-28');

            const reportData = await reportService.generateUserTaskCompletionReportData(
                testUser1._id.toString(),
                startDate,
                endDate
            );

            expect(reportData).toBeDefined();
            expect(reportData.metadata.type).toBe('user');
            expect(reportData.metadata.username).toBe('testuser1@example.com');
            expect(reportData.metadata.userId).toBe(testUser1._id.toString());

            // testUser1 is owner of tasks 1,2 and assignee of task 3 + standalone task 6
            // Within date range: tasks 1,2,3,6 = 4 tasks
            expect(reportData.aggregates.total).toBe(4);
        });

        // Test case ID: RGE-017
        it('should include tasks where user is owner', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-02-28');

            const reportData = await reportService.generateUserTaskCompletionReportData(
                testUser1._id.toString(),
                startDate,
                endDate
            );

            // Should include task 1 (owned), task 2 (owned), task 3 (assigned), task 6 (owned)
            const allTasks = [
                ...reportData.data['To Do'],
                ...reportData.data['In Progress'],
                ...reportData.data['Blocked'],
                ...reportData.data['Completed']
            ];

            const taskTitles = allTasks.map(task => task.title);
            expect(taskTitles).toContain('Task 1 - To Do');
            expect(taskTitles).toContain('Task 2 - In Progress');
            expect(taskTitles).toContain('Task 3 - Blocked');
            expect(taskTitles).toContain('Task 6 - User Task');
        });

        // Test case ID: RGE-017
        it('should include tasks where user is assignee', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-02-28');

            const reportData = await reportService.generateUserTaskCompletionReportData(
                testUser2._id.toString(),
                startDate,
                endDate
            );

            // testUser2 is assignee of task 1, owner of task 3, and owner+assignee of task 4
            expect(reportData.aggregates.total).toBe(3);
        });

        // Test case ID: RGE-011
        it('should throw error for non-existent user', async () => {
            const fakeUserId = new mongoose.Types.ObjectId();
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-02-28');

            await expect(reportService.generateUserTaskCompletionReportData(
                fakeUserId.toString(),
                startDate,
                endDate
            )).rejects.toThrow('User not found');
        });
    });

    describe('processTasksForReport', () => {
        // Test case ID: RGE-018
        it('should format tasks correctly', async () => {
            const tasks = await Task.find({ project: testProject._id })
                .populate('owner', 'username')
                .populate('assignee', 'username')
                .populate('project', 'name')
                .limit(2);

            const reportData = reportService.processTasksForReport(tasks, 'project', {
                projectId: testProject._id.toString(),
                projectName: 'Test Project',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-02-28')
            });

            expect(reportData.data).toBeDefined();
            expect(reportData.aggregates).toBeDefined();
            expect(reportData.metadata).toBeDefined();

            // Check a formatted task
            const firstTask = Object.values(reportData.data)
                .find(statusTasks => statusTasks.length > 0)[0];
            
            expect(firstTask).toHaveProperty('id');
            expect(firstTask).toHaveProperty('title');
            expect(firstTask).toHaveProperty('deadline');
            expect(firstTask).toHaveProperty('priority');
            expect(firstTask).toHaveProperty('owner');
            expect(firstTask).toHaveProperty('assignee');
            expect(firstTask).toHaveProperty('project');
            expect(firstTask).toHaveProperty('createdAt');
        });

        // Test case ID: RGE-018
        it('should handle tasks with null/undefined fields', async () => {
            // Create a minimal task
            const minimalTask = await Task.create({
                title: 'Minimal Task',
                owner: testUser1._id,
                status: 'To Do',
                priority: 5, // Required field with default value
                project: testProject._id, // Required field
                createdAt: new Date('2024-01-15')
                // No assignee, dueDate, tags, or description
            });

            await minimalTask.populate('owner', 'username');
            await minimalTask.populate('project', 'name');

            const reportData = reportService.processTasksForReport([minimalTask], 'user', {
                userId: testUser1._id.toString(),
                username: 'testuser1@example.com',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-02-28')
            });

            const task = reportData.data['To Do'][0];
            expect(task.deadline).toBe('No deadline');
            expect(task.priority).toBe('5'); // Priority is a number, but formatted as string in report
            expect(task.tags).toBe('No tags'); // Empty string becomes 'No tags'
            expect(task.description).toBe('No description'); // Empty string becomes 'No description'
            expect(task.assignee).toBe('Unassigned');
            expect(task.project).toBe('Test Project'); // Now has a project
        });
    });

    describe('generateExcelReport', () => {
        // Test case ID: RGE-020
        it('should generate Excel buffer with correct structure', async () => {
            const mockReportData = {
                data: {
                    'To Do': [{
                        id: '123',
                        title: 'Test Task',
                        deadline: '01-02-2024',
                        priority: '8',
                        tags: 'test',
                        owner: 'testuser@example.com',
                        assignee: 'testuser2@example.com',
                        project: 'Test Project',
                        createdAt: '15-01-2024',
                        description: 'Test description'
                    }],
                    'In Progress': [],
                    'Blocked': [],
                    'Completed': []
                },
                aggregates: {
                    'To Do': 1,
                    'In Progress': 0,
                    'Blocked': 0,
                    'Completed': 0,
                    total: 1
                },
                metadata: {
                    type: 'project',
                    projectName: 'Test Project',
                    projectOwner: 'testuser@example.com',
                    generatedAt: '15-01-2024 at 10:00',
                    dateRange: {
                        startDate: '01-01-2024',
                        endDate: '28-02-2024'
                    }
                }
            };

            const buffer = await reportService.generateExcelReport(mockReportData);

            expect(buffer).toBeInstanceOf(Buffer);
            expect(xlsx.utils.book_new).toHaveBeenCalled();
            expect(xlsx.utils.aoa_to_sheet).toHaveBeenCalled();
            expect(xlsx.utils.book_append_sheet).toHaveBeenCalled();
            expect(xlsx.write).toHaveBeenCalledWith(
                expect.any(Object),
                { type: 'buffer', bookType: 'xlsx' }
            );
        });
    });

    describe('generatePdfReport', () => {
        // Test case ID: RGE-019
        it('should generate PDF buffer using puppeteer', async () => {
            const mockReportData = {
                data: {
                    'To Do': [{
                        id: '123',
                        title: 'Test Task',
                        deadline: '01-02-2024',
                        priority: '8',
                        tags: 'test',
                        owner: 'testuser@example.com',
                        assignee: 'testuser2@example.com',
                        project: 'Test Project',
                        createdAt: '15-01-2024',
                        description: 'Test description'
                    }],
                    'In Progress': [],
                    'Blocked': [],
                    'Completed': []
                },
                aggregates: {
                    'To Do': 1,
                    'In Progress': 0,
                    'Blocked': 0,
                    'Completed': 0,
                    total: 1
                },
                metadata: {
                    type: 'project',
                    projectName: 'Test Project',
                    projectOwner: 'testuser@example.com',
                    generatedAt: '15-01-2024 at 10:00',
                    dateRange: {
                        startDate: '01-01-2024',
                        endDate: '28-02-2024'
                    }
                }
            };

            const buffer = await reportService.generatePdfReport(mockReportData);

            expect(buffer).toBeInstanceOf(Buffer);
            expect(puppeteer.launch).toHaveBeenCalledWith({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        });

        // Test case ID: RGE-019
        it('should close browser even if PDF generation fails', async () => {
            const mockBrowser = {
                newPage: vi.fn().mockResolvedValue({
                    setContent: vi.fn().mockRejectedValue(new Error('Page error')),
                    pdf: vi.fn()
                }),
                close: vi.fn().mockResolvedValue()
            };

            puppeteer.launch.mockResolvedValueOnce(mockBrowser);

            const mockReportData = {
                data: { 'To Do': [], 'In Progress': [], 'Blocked': [], 'Completed': [] },
                aggregates: { 'To Do': 0, 'In Progress': 0, 'Blocked': 0, 'Completed': 0, total: 0 },
                metadata: { type: 'project', generatedAt: '15-01-2024', dateRange: {} }
            };

            await expect(reportService.generatePdfReport(mockReportData)).rejects.toThrow('Page error');
            expect(mockBrowser.close).toHaveBeenCalled();
        });
    });

    describe('generateReportHTML', () => {
        it('should generate HTML for project report', () => {
            const mockReportData = {
                data: {
                    'To Do': [{
                        id: '123',
                        title: 'Test Task',
                        deadline: '01-02-2024',
                        priority: '8',
                        tags: 'test',
                        owner: 'testuser@example.com',
                        assignee: 'testuser2@example.com',
                        project: 'Test Project',
                        createdAt: '15-01-2024',
                        description: 'Test description'
                    }],
                    'In Progress': [],
                    'Blocked': [],
                    'Completed': []
                },
                aggregates: {
                    'To Do': 1,
                    'In Progress': 0,
                    'Blocked': 0,
                    'Completed': 0,
                    total: 1
                },
                metadata: {
                    type: 'project',
                    projectName: 'Test Project',
                    projectOwner: 'testuser@example.com',
                    generatedAt: '15-01-2024 at 10:00',
                    dateRange: {
                        startDate: '01-01-2024',
                        endDate: '28-02-2024'
                    }
                }
            };

            const html = reportService.generateReportHTML(mockReportData);

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Task Completion Report - Project: Test Project');
            expect(html).toContain('Test Task');
            expect(html).toContain('testuser@example.com');
            expect(html).toContain('8');
            expect(html).toContain('Test description');
        });

        it('should generate HTML for user report', () => {
            const mockReportData = {
                data: {
                    'To Do': [],
                    'In Progress': [],
                    'Blocked': [],
                    'Completed': [{
                        id: '456',
                        title: 'Done Task',
                        deadline: 'No deadline',
                        priority: '5',
                        tags: 'No tags',
                        owner: 'testuser@example.com',
                        assignee: 'Unassigned',
                        project: 'No project',
                        createdAt: '15-01-2024',
                        description: 'Completed task'
                    }]
                },
                aggregates: {
                    'To Do': 0,
                    'In Progress': 0,
                    'Blocked': 0,
                    'Completed': 1,
                    total: 1
                },
                metadata: {
                    type: 'user',
                    username: 'testuser@example.com',
                    generatedAt: '15-01-2024 at 10:00',
                    dateRange: {
                        startDate: '01-01-2024',
                        endDate: '28-02-2024'
                    }
                }
            };

            const html = reportService.generateReportHTML(mockReportData);

            expect(html).toContain('Task Completion Report - User: testuser@example.com');
            expect(html).toContain('Done Task');
            expect(html).toContain('No project');
            expect(html).toContain('Unassigned');
        });
    });

    describe('Date formatting utilities', () => {
        it('should format date correctly', () => {
            const date = new Date('2024-01-15');
            const formatted = reportService.formatDate(date);
            expect(formatted).toBe('15-01-2024');
        });

        it('should format date time correctly', () => {
            const date = new Date('2024-01-15T10:30:00.000Z');
            const formatted = reportService.formatDateTime(date);
            expect(formatted).toMatch(/15-01-2024 at \d{2}:\d{2}/);
        });
    });

    // =============================================================================
    // LOGGED TIME REPORT TESTS - Comprehensive Coverage
    // =============================================================================
    describe('Logged Time Report - Data Accuracy and Formatting', () => {
        let adminUser, staffUser, testProject;

        beforeEach(async () => {
            // Clean up
            await Task.deleteMany({});
            await User.deleteMany({});
            await Project.deleteMany({});
            
            // Create test users
            adminUser = await User.create({
                username: 'admin@test.com',
                roles: ['admin'],
                department: 'it',
                hashed_password: 'pass123'
            });
            
            staffUser = await User.create({
                username: 'staff@test.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'pass456'
            });
            
            // Create test project
            testProject = await Project.create({
                name: 'Logged Time Test Project',
                description: 'Project for testing logged time',
                owner: adminUser._id
            });
        });

        // LTR-010: Data Accuracy - Logged Time Values from timeTaken Field
        it('LTR-010: should correctly retrieve timeTaken field values for tasks', async () => {
            // Create tasks with specific timeTaken values
            const task1 = await Task.create({
                title: 'Task with 90 min',
                status: 'To Do',
                priority: 5,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 90,
                dueDate: new Date(Date.now() + 86400000)
            });

            const task2 = await Task.create({
                title: 'Task with 200 min',
                status: 'Completed',
                priority: 7,
                owner: staffUser._id,
                assignee: [adminUser._id],
                project: testProject._id,
                timeTaken: 200,
                dueDate: new Date(Date.now() + 86400000)
            });

            const task3 = await Task.create({
                title: 'Task with 1500 min',
                status: 'In Progress',
                priority: 8,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 1500,
                dueDate: new Date(Date.now() + 86400000)
            });

            const reportData = await reportService.generateProjectLoggedTimeReportData(testProject._id.toString());

            // Verify tasks are in the report
            const allTasks = [
                ...reportData.data['To Do'],
                ...reportData.data['Completed'],
                ...reportData.data['In Progress'],
                ...reportData.data['Blocked']
            ];

            expect(allTasks).toHaveLength(3);

            // Find each task and verify logged time
            const task1Data = allTasks.find(t => t.title === 'Task with 90 min');
            const task2Data = allTasks.find(t => t.title === 'Task with 200 min');
            const task3Data = allTasks.find(t => t.title === 'Task with 1500 min');

            expect(task1Data).toBeDefined();
            expect(task2Data).toBeDefined();
            expect(task3Data).toBeDefined();

            expect(task1Data.loggedTime).toBe('1 hour 30 min'); // 90 min
            expect(task2Data.loggedTime).toBe('3 hours 20 min'); // 200 min
            expect(task3Data.loggedTime).toBe('1 day 1 hour'); // 1500 min = 25 hours

            // Verify total logged time (1790 min = 29 hours 50 min = 1 day 5 hours 50 min)
            expect(reportData.aggregates.totalLoggedTime).toBe('1 day 5 hours 50 min');
        });

        // LTR-011: Data Accuracy - Subtask Logged Time Values
        it('LTR-011: should correctly retrieve timeTaken field values for subtasks', async () => {
            const Subtask = mongoose.model('Subtask');
            
            const task1 = await Task.create({
                title: 'Parent Task',
                status: 'In Progress',
                priority: 5,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 100,
                dueDate: new Date(Date.now() + 86400000)
            });

            const subtask1 = await Subtask.create({
                title: 'Subtask with 30 min',
                status: 'Completed',
                priority: 5,
                ownerId: adminUser._id,
                assigneeId: staffUser._id,
                parentTaskId: task1._id,
                projectId: testProject._id,
                timeTaken: 30
            });

            const subtask2 = await Subtask.create({
                title: 'Subtask with 45 min',
                status: 'To Do',
                priority: 6,
                ownerId: staffUser._id,
                assigneeId: adminUser._id,
                parentTaskId: task1._id,
                projectId: testProject._id,
                timeTaken: 45
            });

            const reportData = await reportService.generateProjectLoggedTimeReportData(testProject._id.toString());

            const allTasks = [
                ...reportData.data['To Do'],
                ...reportData.data['Completed'],
                ...reportData.data['In Progress'],
                ...reportData.data['Blocked']
            ];

            // Should have 1 task + 2 subtasks = 3 items
            expect(allTasks).toHaveLength(3);

            const subtask1Data = allTasks.find(t => t.title === 'Subtask with 30 min');
            const subtask2Data = allTasks.find(t => t.title === 'Subtask with 45 min');

            expect(subtask1Data).toBeDefined();
            expect(subtask2Data).toBeDefined();

            expect(subtask1Data.loggedTime).toBe('30 min');
            expect(subtask2Data.loggedTime).toBe('45 min');

            // Total = 100 + 30 + 45 = 175 minutes = 2 hours 55 min
            expect(reportData.aggregates.totalLoggedTime).toBe('2 hours 55 min');
        });

        // LTR-012: Data Accuracy - Zero vs Non-Zero Logged Time
        it('LTR-012: should handle both zero and non-zero timeTaken values correctly', async () => {
            const taskZero = await Task.create({
                title: 'Task with 0 min',
                status: 'To Do',
                priority: 5,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 0,
                dueDate: new Date(Date.now() + 86400000)
            });

            const taskNonZero = await Task.create({
                title: 'Task with 120 min',
                status: 'Completed',
                priority: 7,
                owner: staffUser._id,
                assignee: [adminUser._id],
                project: testProject._id,
                timeTaken: 120,
                dueDate: new Date(Date.now() + 86400000)
            });

            const reportData = await reportService.generateProjectLoggedTimeReportData(testProject._id.toString());

            const allTasks = [
                ...reportData.data['To Do'],
                ...reportData.data['Completed'],
                ...reportData.data['In Progress'],
                ...reportData.data['Blocked']
            ];

            const zeroTask = allTasks.find(t => t.title === 'Task with 0 min');
            const nonZeroTask = allTasks.find(t => t.title === 'Task with 120 min');

            expect(zeroTask.loggedTime).toBe('0 min');
            expect(nonZeroTask.loggedTime).toBe('2 hours');
            expect(reportData.aggregates.totalLoggedTime).toBe('2 hours');
        });

        // LTR-013: Formatting - Time Display in Minutes
        it('LTR-013: should format time < 60 minutes as "X min"', async () => {
            await Task.create({
                title: 'Task 45 min',
                status: 'To Do',
                priority: 5,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 45,
                dueDate: new Date(Date.now() + 86400000)
            });

            const reportData = await reportService.generateProjectLoggedTimeReportData(testProject._id.toString());
            const task = reportData.data['To Do'][0];

            expect(task.loggedTime).toBe('45 min');
        });

        // LTR-014: Formatting - Time Display in Hours
        it('LTR-014: should format time between 60 and 480 minutes as "X.XX hr"', async () => {
            await Task.create({
                title: 'Task 200 min',
                status: 'In Progress',
                priority: 5,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 200,
                dueDate: new Date(Date.now() + 86400000)
            });

            const reportData = await reportService.generateProjectLoggedTimeReportData(testProject._id.toString());
            const task = reportData.data['In Progress'][0];

            expect(task.loggedTime).toBe('3 hours 20 min'); // 200 min
        });

        // LTR-015: Formatting - Time Display in Days
        it('LTR-015: should format time >= 480 minutes as "X.XX day"', async () => {
            await Task.create({
                title: 'Task 1500 min',
                status: 'Completed',
                priority: 5,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 1500,
                dueDate: new Date(Date.now() + 86400000)
            });

            const reportData = await reportService.generateProjectLoggedTimeReportData(testProject._id.toString());
            const task = reportData.data['Completed'][0];

            expect(task.loggedTime).toBe('1 day 1 hour'); // 1500 min = 25 hours
        });

        // Additional: Verify archived tasks are excluded
        it('should exclude archived tasks from logged time report', async () => {
            await Task.create({
                title: 'Active Task',
                status: 'To Do',
                priority: 5,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 100,
                archived: false,
                dueDate: new Date(Date.now() + 86400000)
            });

            await Task.create({
                title: 'Archived Task',
                status: 'Completed',
                priority: 5,
                owner: adminUser._id,
                assignee: [staffUser._id],
                project: testProject._id,
                timeTaken: 200,
                archived: true,
                dueDate: new Date(Date.now() + 86400000)
            });

            const reportData = await reportService.generateProjectLoggedTimeReportData(testProject._id.toString());
            
            const allTasks = [
                ...reportData.data['To Do'],
                ...reportData.data['Completed'],
                ...reportData.data['In Progress'],
                ...reportData.data['Blocked']
            ];

            expect(allTasks).toHaveLength(1);
            expect(allTasks[0].title).toBe('Active Task');
            expect(reportData.aggregates.totalLoggedTime).toBe('1 hour 40 min'); // Only 100 min
        });

        // Test formatLoggedTime utility directly
        describe('formatLoggedTime utility', () => {
            it('should format < 60 minutes correctly', () => {
                expect(reportService.formatLoggedTime(0)).toBe('0 min');
                expect(reportService.formatLoggedTime(30)).toBe('30 min');
                expect(reportService.formatLoggedTime(59)).toBe('59 min');
            });

            it('should format 60-1439 minutes as hours and minutes', () => {
                expect(reportService.formatLoggedTime(60)).toBe('1 hour');
                expect(reportService.formatLoggedTime(90)).toBe('1 hour 30 min');
                expect(reportService.formatLoggedTime(120)).toBe('2 hours');
                expect(reportService.formatLoggedTime(200)).toBe('3 hours 20 min');
                expect(reportService.formatLoggedTime(1439)).toBe('23 hours 59 min');
            });

            it('should format >= 1440 minutes as days, hours, and minutes', () => {
                expect(reportService.formatLoggedTime(1440)).toBe('1 day');
                expect(reportService.formatLoggedTime(1500)).toBe('1 day 1 hour');
                expect(reportService.formatLoggedTime(1525)).toBe('1 day 1 hour 25 min');
                expect(reportService.formatLoggedTime(2880)).toBe('2 days');
                expect(reportService.formatLoggedTime(3665)).toBe('2 days 13 hours 5 min');
                expect(reportService.formatLoggedTime(10000)).toBe('6 days 22 hours 40 min');
            });
        });
    });
});
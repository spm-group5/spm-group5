/**
 * Team Summary Report Test Data Seed Script
 * 
 * Purpose: Populate MongoDB with reproducible test data for team summary report testing
 * 
 * This script creates:
 * - Admin user (reports-test-admin@example.com - dedicated test account)
 * - Staff user (for authorization testing)
 * - 5 team member users across different departments
 * - Multiple projects for different test scenarios
 * - Tasks with various statuses, dates, priorities, assignees and owners
 * 
 * Note: Uses dedicated test admin account (reports-test-admin@example.com) to avoid
 * conflicts with existing system accounts like SkibidiSigma^3
 * 
 * Usage:
 * - Import and call seedTeamSummaryTestData() in beforeEach/beforeAll
 * - Returns object with all created users, projects, and tasks
 * - All data is timestamped for specific date range testing
 */

import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import Subtask from '../models/subtask.model.js';
import bcrypt from 'bcrypt';

/**
 * Seed test data for team summary report tests
 * @returns {Promise<Object>} Object containing all seeded users, projects, and tasks
 */
export async function seedTeamSummaryTestData() {
    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Subtask.deleteMany({});

    // ============================================================
    // USERS
    // ============================================================
    
    // Admin user for reports testing (dedicated test account)
    const adminUser = await User.create({
        username: 'reports-test-admin@example.com',
        roles: ['admin'],
        department: 'it',
        hashed_password: 'test-admin-password' // Will be hashed by pre-save hook
    });

    // Staff user for authorization testing
    const staffUser = await User.create({
        username: 'staffuser@example.com',
        roles: ['staff'],
        department: 'hr',
        hashed_password: 'password123' // Will be hashed by pre-save hook
    });

    // Team members across different departments
    const teamMember1 = await User.create({
        username: 'john.hr@example.com',
        roles: ['staff'],
        department: 'hr',
        hashed_password: 'password123'
    });

    const teamMember2 = await User.create({
        username: 'jane.it@example.com',
        roles: ['manager'],
        department: 'it',
        hashed_password: 'password123'
    });

    const teamMember3 = await User.create({
        username: 'bob.sales@example.com',
        roles: ['staff'],
        department: 'sales',
        hashed_password: 'password123'
    });

    const teamMember4 = await User.create({
        username: 'alice.engineering@example.com',
        roles: ['staff'],
        department: 'engineering',
        hashed_password: 'password123'
    });

    const teamMember5 = await User.create({
        username: 'charlie.finance@example.com',
        roles: ['manager'],
        department: 'finance',
        hashed_password: 'password123'
    });

    // ============================================================
    // PROJECTS
    // ============================================================

    // Main test project for team summary reports
    const mainProject = await Project.create({
        name: 'Team Summary Test Project',
        description: 'Main project for team summary report testing',
        owner: adminUser._id,
        members: [teamMember1._id, teamMember2._id, teamMember3._id, teamMember4._id, teamMember5._id],
        status: 'In Progress',
        createdAt: new Date('2024-01-01')
    });

    // Project with no tasks in specified date range (for TSR-018)
    const emptyProject = await Project.create({
        name: 'Empty Period Test Project',
        description: 'Project with tasks outside test date range',
        owner: adminUser._id,
        members: [teamMember1._id],
        status: 'In Progress',
        createdAt: new Date('2024-01-01')
    });

    // Non-existent project ID for testing (just generate valid ObjectId)
    const mongoose = await import('mongoose');
    const nonExistentProjectId = new mongoose.default.Types.ObjectId();

    // ============================================================
    // TASKS FOR MAIN PROJECT
    // ============================================================

    // TSR-009: Weekly timeframe (2024-01-01 to 2024-01-07)
    const weeklyTasks = await Task.create([
        {
            title: 'Week Task 1 - To Do',
            description: 'First weekly task',
            status: 'To Do',
            priority: 8,
            owner: teamMember1._id,
            assignee: [teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-01T10:00:00Z')
        },
        {
            title: 'Week Task 2 - In Progress',
            description: 'Second weekly task',
            status: 'In Progress',
            priority: 6,
            owner: teamMember2._id,
            assignee: [teamMember3._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-03T14:30:00Z')
        },
        {
            title: 'Week Task 3 - Done',
            description: 'Third weekly task',
            status: 'Completed',
            priority: 5,
            owner: teamMember3._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-05T09:15:00Z')
        },
        {
            title: 'Week Task 4 - In Progress',
            description: 'Fourth weekly task',
            status: 'In Progress',
            priority: 7,
            owner: teamMember4._id,
            assignee: [teamMember5._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-07T16:45:00Z')
        },
        {
            title: 'Week Task 5 - To Do',
            description: 'Fifth weekly task',
            status: 'To Do',
            priority: 4,
            owner: teamMember5._id,
            assignee: [teamMember4._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-07T23:59:00Z')
        }
    ]);

    // TSR-010, TSR-014: Monthly timeframe (2024-01-01 to 2024-01-31)
    const monthlyTasks = await Task.create([
        // To Do tasks (3 total)
        {
            title: 'Month Task 1 - To Do',
            description: 'Monthly to do task 1',
            status: 'To Do',
            priority: 9,
            owner: teamMember1._id,
            assignee: [teamMember2._id, teamMember3._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-10T10:00:00Z')
        },
        {
            title: 'Month Task 2 - To Do',
            description: 'Monthly to do task 2',
            status: 'To Do',
            priority: 6,
            owner: teamMember2._id,
            assignee: [teamMember4._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-15T14:00:00Z')
        },
        {
            title: 'Month Task 3 - To Do',
            description: 'Monthly to do task 3',
            status: 'To Do',
            priority: 5,
            owner: teamMember3._id,
            assignee: [teamMember5._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-20T09:00:00Z')
        },
        // In Progress tasks (4 total)
        {
            title: 'Month Task 4 - In Progress',
            description: 'Monthly in progress task 1',
            status: 'In Progress',
            priority: 8,
            owner: teamMember1._id,
            assignee: [teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-12T11:00:00Z')
        },
        {
            title: 'Month Task 5 - In Progress',
            description: 'Monthly in progress task 2',
            status: 'In Progress',
            priority: 7,
            owner: teamMember3._id,
            assignee: [teamMember4._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-18T13:30:00Z')
        },
        {
            title: 'Month Task 6 - In Progress',
            description: 'Monthly in progress task 3',
            status: 'In Progress',
            priority: 6,
            owner: teamMember4._id,
            assignee: [teamMember5._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-22T15:45:00Z')
        },
        {
            title: 'Month Task 7 - In Progress',
            description: 'Monthly in progress task 4',
            status: 'In Progress',
            priority: 5,
            owner: teamMember5._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-25T10:15:00Z')
        },
        // Done tasks (3 total)
        {
            title: 'Month Task 8 - Done',
            description: 'Monthly done task 1',
            status: 'Completed',
            priority: 8,
            owner: teamMember2._id,
            assignee: [teamMember3._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-14T12:00:00Z')
        },
        {
            title: 'Month Task 9 - Done',
            description: 'Monthly done task 2',
            status: 'Completed',
            priority: 7,
            owner: teamMember4._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-28T16:30:00Z')
        },
        {
            title: 'Month Task 10 - Done',
            description: 'Monthly done task 3',
            status: 'Completed',
            priority: 4,
            owner: teamMember5._id,
            assignee: [teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-30T14:45:00Z')
        }
    ]);

    // TSR-011: Week boundary testing (tasks on and outside week range)
    const weekBoundaryTasks = await Task.create([
        {
            title: 'Boundary Task 1 - Within Week',
            description: 'Task on first day of week',
            status: 'To Do',
            priority: 5,
            owner: teamMember1._id,
            assignee: [teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-01T00:00:00Z')
        },
        {
            title: 'Boundary Task 2 - Within Week',
            description: 'Task in middle of week',
            status: 'In Progress',
            priority: 6,
            owner: teamMember2._id,
            assignee: [teamMember3._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-05T12:00:00Z')
        },
        {
            title: 'Boundary Task 3 - Within Week',
            description: 'Task on last day of week',
            status: 'Completed',
            priority: 7,
            owner: teamMember3._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-07T23:59:59Z')
        },
        {
            title: 'Boundary Task 4 - Outside Week',
            description: 'Task after week ends',
            status: 'To Do',
            priority: 5,
            owner: teamMember4._id,
            assignee: [teamMember5._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-08T00:00:01Z')
        },
        {
            title: 'Boundary Task 5 - Outside Week',
            description: 'Task much later',
            status: 'In Progress',
            priority: 6,
            owner: teamMember5._id,
            assignee: [teamMember4._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-10T10:00:00Z')
        }
    ]);

    // TSR-012: Month boundary testing
    const monthBoundaryTasks = await Task.create([
        {
            title: 'Month Boundary 1 - January',
            description: 'Task in middle of January',
            status: 'To Do',
            priority: 5,
            owner: teamMember1._id,
            assignee: [teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
            title: 'Month Boundary 2 - January',
            description: 'Task at end of January',
            status: 'In Progress',
            priority: 6,
            owner: teamMember2._id,
            assignee: [teamMember3._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-31T23:59:59Z')
        },
        {
            title: 'Month Boundary 3 - February',
            description: 'Task in February (excluded)',
            status: 'Completed',
            priority: 7,
            owner: teamMember3._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-02-01T00:00:01Z')
        },
        {
            title: 'Month Boundary 4 - February',
            description: 'Task later in February (excluded)',
            status: 'To Do',
            priority: 5,
            owner: teamMember4._id,
            assignee: [teamMember5._id],
            project: mainProject._id,
            createdAt: new Date('2024-02-15T12:00:00Z')
        }
    ]);

    // TSR-014: Task with Blocked status (should be excluded)
    const blockedTask = await Task.create({
        title: 'Blocked Task - Should Not Appear',
        description: 'This task is blocked and should not appear in report',
        status: 'Blocked',
        priority: 5,
        owner: teamMember1._id,
        assignee: [teamMember2._id],
        project: mainProject._id,
        createdAt: new Date('2024-01-15T10:00:00Z')
    });

    // TSR-019: Task with multiple assignees
    const multiAssigneeTask = await Task.create({
        title: 'Multi-Assignee Task',
        description: 'Task with 3 assignees',
        status: 'In Progress',
        priority: 8,
        owner: teamMember1._id,
        assignee: [teamMember2._id, teamMember3._id, teamMember4._id],
        project: mainProject._id,
        createdAt: new Date('2024-01-15T10:00:00Z')
    });

    // TSR-020: User is both owner and assignee
    const ownerAssigneeTask = await Task.create([
        {
            title: 'Owner-Assignee Task 1',
            description: 'User1 is both owner and assignee',
            status: 'To Do',
            priority: 6,
            owner: teamMember1._id,
            assignee: [teamMember1._id, teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
            title: 'Owner-Assignee Task 2',
            description: 'User1 is owner and sole assignee',
            status: 'In Progress',
            priority: 5,
            owner: teamMember1._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-16T11:00:00Z')
        }
    ]);

    // TSR-024: Integration test data (15 tasks across statuses)
    const integrationTasks = await Task.create([
        // 5 To Do tasks
        {
            title: 'Integration To Do 1',
            description: 'Integration test task',
            status: 'To Do',
            priority: 9,
            owner: teamMember1._id,
            assignee: [teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-05T09:00:00Z')
        },
        {
            title: 'Integration To Do 2',
            description: 'Integration test task',
            status: 'To Do',
            priority: 8,
            owner: teamMember2._id,
            assignee: [teamMember3._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-08T10:00:00Z')
        },
        {
            title: 'Integration To Do 3',
            description: 'Integration test task',
            status: 'To Do',
            priority: 7,
            owner: teamMember3._id,
            assignee: [teamMember4._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-11T11:00:00Z')
        },
        {
            title: 'Integration To Do 4',
            description: 'Integration test task',
            status: 'To Do',
            priority: 6,
            owner: teamMember4._id,
            assignee: [teamMember5._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-14T12:00:00Z')
        },
        {
            title: 'Integration To Do 5',
            description: 'Integration test task',
            status: 'To Do',
            priority: 5,
            owner: teamMember5._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-17T13:00:00Z')
        },
        // 6 In Progress tasks
        {
            title: 'Integration In Progress 1',
            description: 'Integration test task',
            status: 'In Progress',
            priority: 8,
            owner: teamMember1._id,
            assignee: [teamMember3._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-06T09:30:00Z')
        },
        {
            title: 'Integration In Progress 2',
            description: 'Integration test task',
            status: 'In Progress',
            priority: 7,
            owner: teamMember2._id,
            assignee: [teamMember4._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-09T10:30:00Z')
        },
        {
            title: 'Integration In Progress 3',
            description: 'Integration test task',
            status: 'In Progress',
            priority: 6,
            owner: teamMember3._id,
            assignee: [teamMember5._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-12T11:30:00Z')
        },
        {
            title: 'Integration In Progress 4',
            description: 'Integration test task',
            status: 'In Progress',
            priority: 5,
            owner: teamMember4._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-15T12:30:00Z')
        },
        {
            title: 'Integration In Progress 5',
            description: 'Integration test task',
            status: 'In Progress',
            priority: 7,
            owner: teamMember5._id,
            assignee: [teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-18T13:30:00Z')
        },
        {
            title: 'Integration In Progress 6',
            description: 'Integration test task',
            status: 'In Progress',
            priority: 6,
            owner: teamMember1._id,
            assignee: [teamMember4._id, teamMember5._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-21T14:30:00Z')
        },
        // 4 Done tasks
        {
            title: 'Integration Done 1',
            description: 'Integration test task',
            status: 'Completed',
            priority: 9,
            owner: teamMember2._id,
            assignee: [teamMember1._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-07T09:45:00Z')
        },
        {
            title: 'Integration Done 2',
            description: 'Integration test task',
            status: 'Completed',
            priority: 8,
            owner: teamMember3._id,
            assignee: [teamMember2._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-10T10:45:00Z')
        },
        {
            title: 'Integration Done 3',
            description: 'Integration test task',
            status: 'Completed',
            priority: 7,
            owner: teamMember4._id,
            assignee: [teamMember3._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-13T11:45:00Z')
        },
        {
            title: 'Integration Done 4',
            description: 'Integration test task',
            status: 'Completed',
            priority: 6,
            owner: teamMember5._id,
            assignee: [teamMember4._id],
            project: mainProject._id,
            createdAt: new Date('2024-01-16T12:45:00Z')
        }
    ]);

    // TSR-018: Tasks for empty project (outside date range)
    const emptyProjectTasks = await Task.create([
        {
            title: 'February Task 1',
            description: 'Task in February (outside test range)',
            status: 'To Do',
            priority: 5,
            owner: teamMember1._id,
            assignee: [teamMember2._id],
            project: emptyProject._id,
            createdAt: new Date('2024-02-15T10:00:00Z')
        },
        {
            title: 'March Task 1',
            description: 'Task in March (outside test range)',
            status: 'In Progress',
            priority: 6,
            owner: teamMember2._id,
            assignee: [teamMember3._id],
            project: emptyProject._id,
            createdAt: new Date('2024-03-10T10:00:00Z')
        }
    ]);

    // ============================================================
    // SUBTASKS FOR MAIN PROJECT (TSR-025)
    // ============================================================
    
    // Subtasks for weekly timeframe testing
    const weeklySubtasks = await Subtask.create([
        {
            title: 'Week Subtask 1 - To Do',
            description: 'Weekly subtask in To Do status',
            status: 'To Do',
            priority: 7,
            ownerId: teamMember1._id,
            assigneeId: teamMember2._id,
            parentTaskId: weeklyTasks[0]._id,
            projectId: mainProject._id,
            createdAt: new Date('2024-01-02T11:00:00Z')
        },
        {
            title: 'Week Subtask 2 - In Progress',
            description: 'Weekly subtask in progress',
            status: 'In Progress',
            priority: 6,
            ownerId: teamMember3._id,
            assigneeId: teamMember4._id,
            parentTaskId: weeklyTasks[1]._id,
            projectId: mainProject._id,
            createdAt: new Date('2024-01-04T10:30:00Z')
        }
    ]);

    // Subtasks for monthly timeframe testing
    const monthlySubtasks = await Subtask.create([
        {
            title: 'Month Subtask 1 - To Do',
            description: 'Monthly subtask to do',
            status: 'To Do',
            priority: 8,
            ownerId: teamMember2._id,
            assigneeId: teamMember3._id,
            parentTaskId: monthlyTasks[0]._id,
            projectId: mainProject._id,
            createdAt: new Date('2024-01-11T09:00:00Z')
        },
        {
            title: 'Month Subtask 2 - In Progress',
            description: 'Monthly subtask in progress',
            status: 'In Progress',
            priority: 7,
            ownerId: teamMember4._id,
            assigneeId: teamMember5._id,
            parentTaskId: monthlyTasks[3]._id,
            projectId: mainProject._id,
            createdAt: new Date('2024-01-14T13:00:00Z')
        },
        {
            title: 'Month Subtask 3 - Completed',
            description: 'Monthly subtask completed',
            status: 'Completed',
            priority: 6,
            ownerId: teamMember5._id,
            assigneeId: teamMember1._id,
            parentTaskId: monthlyTasks[6]._id,
            projectId: mainProject._id,
            createdAt: new Date('2024-01-17T15:30:00Z')
        }
    ]);

    // Blocked subtask (should be excluded from reports)
    const blockedSubtask = await Subtask.create({
        title: 'Blocked Subtask',
        description: 'Subtask in blocked status',
        status: 'Blocked',
        priority: 5,
        ownerId: teamMember1._id,
        assigneeId: teamMember2._id,
        parentTaskId: monthlyTasks[0]._id,
        projectId: mainProject._id,
        createdAt: new Date('2024-01-19T10:00:00Z')
    });

    // Return all seeded data for use in tests
    return {
        users: {
            adminUser,
            staffUser,
            teamMember1,
            teamMember2,
            teamMember3,
            teamMember4,
            teamMember5
        },
        projects: {
            mainProject,
            emptyProject,
            nonExistentProjectId
        },
        tasks: {
            weeklyTasks,
            monthlyTasks,
            weekBoundaryTasks,
            monthBoundaryTasks,
            blockedTask,
            multiAssigneeTask,
            ownerAssigneeTask,
            integrationTasks,
            emptyProjectTasks
        },
        subtasks: {
            weeklySubtasks,
            monthlySubtasks,
            blockedSubtask
        }
    };
}

/**
 * Clean up all test data
 */
export async function cleanupTeamSummaryTestData() {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
}

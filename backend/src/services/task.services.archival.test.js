import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import taskService from './task.services.js';

describe('Task Service - Archival with Notifications (TDD)', () => {
    let testManager, testAdmin, testStaff, testProject;

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database connection not ready');
        }

        // Create test users with different roles
        testManager = await User.create({
            username: 'manager@example.com',
            roles: ['manager'],
            department: 'it',
            hashed_password: 'password123'
        });

        testAdmin = await User.create({
            username: 'admin@example.com',
            roles: ['admin'],
            department: 'it',
            hashed_password: 'password123'
        });

        testStaff = await User.create({
            username: 'staff@example.com',
            roles: ['staff'],
            department: 'it',
            hashed_password: 'password123'
        });

        testProject = await Project.create({
            name: 'Test Project',
            owner: testManager._id
        });
    });

    afterEach(async () => {
        await Task.deleteMany({});
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Project.deleteMany({});
    });

    // NOTIF-ARCHIVE-001: Basic archival functionality
    describe('archiveTask', () => {
        it('should archive task and set archivedAt timestamp', async () => {
            const task = await Task.create({
                title: 'Task to archive',
                owner: testManager._id,
                project: testProject._id,
                assignee: [testStaff._id]
            });

            const archivedTask = await taskService.archiveTask(task._id, testManager._id);

            expect(archivedTask.archived).toBe(true);
            expect(archivedTask.archivedAt).toBeDefined();
            expect(archivedTask.archivedAt).toBeInstanceOf(Date);
            expect(new Date() - archivedTask.archivedAt).toBeLessThan(5000); // Within 5 seconds
        });

        it('should return archived task with populated fields', async () => {
            const task = await Task.create({
                title: 'Task with populated fields',
                owner: testManager._id,
                project: testProject._id,
                assignee: [testStaff._id]
            });

            const archivedTask = await taskService.archiveTask(task._id, testManager._id);

            expect(archivedTask.owner).toBeDefined();
            expect(archivedTask.project).toBeDefined();
            expect(archivedTask.assignee).toBeDefined();
            expect(archivedTask.assignee.length).toBeGreaterThan(0);
        });

        it('should archive task with multiple assignees', async () => {
            const assignee2 = await User.create({
                username: 'staff2@example.com',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            });

            const task = await Task.create({
                title: 'Multi-assignee task',
                owner: testManager._id,
                project: testProject._id,
                assignee: [testStaff._id, assignee2._id]
            });

            const archivedTask = await taskService.archiveTask(task._id, testManager._id);

            expect(archivedTask.archived).toBe(true);
            expect(archivedTask.assignee.length).toBe(2);
        });

        // NOTIF-ARCHIVE-005: Boundary case
        it('should archive task with no assignees', async () => {
            const task = await Task.create({
                title: 'Unassigned task',
                owner: testManager._id,
                project: testProject._id,
                assignee: []
            });

            const archivedTask = await taskService.archiveTask(task._id, testManager._id);

            expect(archivedTask.archived).toBe(true);
            expect(archivedTask.assignee).toHaveLength(0);
        });
    });

    // NOTIF-ARCHIVE-004: Permission checks
    describe('archiveTask - Authorization', () => {
        it('should allow task owner to archive task', async () => {
            const task = await Task.create({
                title: 'Owner task',
                owner: testManager._id,
                project: testProject._id,
                assignee: [testStaff._id]
            });

            await expect(
                taskService.archiveTask(task._id, testManager._id)
            ).resolves.toBeDefined();
        });

        it('should allow assignee to archive task', async () => {
            const task = await Task.create({
                title: 'Assignee task',
                owner: testManager._id,
                project: testProject._id,
                assignee: [testStaff._id]
            });

            await expect(
                taskService.archiveTask(task._id, testStaff._id)
            ).resolves.toBeDefined();
        });

        it('should reject archival by user who is neither owner nor assignee', async () => {
            const unauthorizedUser = await User.create({
                username: 'unauthorized@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password123'
            });

            const task = await Task.create({
                title: 'Protected task',
                owner: testManager._id,
                project: testProject._id,
                assignee: [testStaff._id]
            });

            await expect(
                taskService.archiveTask(task._id, unauthorizedUser._id)
            ).rejects.toThrow('You do not have permission to archive this task');
        });

        it('should reject archival of non-existent task', async () => {
            const fakeTaskId = new mongoose.Types.ObjectId();

            await expect(
                taskService.archiveTask(fakeTaskId, testManager._id)
            ).rejects.toThrow('Task not found');
        });
    });

    describe('unarchiveTask', () => {
        it('should unarchive a previously archived task', async () => {
            const task = await Task.create({
                title: 'Archived task',
                owner: testManager._id,
                project: testProject._id,
                archived: true,
                archivedAt: new Date()
            });

            const unarchivedTask = await taskService.unarchiveTask(task._id, testManager._id);

            expect(unarchivedTask.archived).toBe(false);
            expect(unarchivedTask.archivedAt).toBeNull();
        });

        it('should reject unarchival by unauthorized user', async () => {
            const unauthorizedUser = await User.create({
                username: 'unauthorized2@example.com',
                roles: ['staff'],
                department: 'hr',
                hashed_password: 'password123'
            });

            const task = await Task.create({
                title: 'Archived task',
                owner: testManager._id,
                project: testProject._id,
                archived: true
            });

            await expect(
                taskService.unarchiveTask(task._id, unauthorizedUser._id)
            ).rejects.toThrow('permission');
        });

        it('should reject unarchival when parent project is archived', async () => {
            const archivedProject = await Project.create({
                name: 'Archived Project',
                owner: testManager._id,
                archived: true,
                archivedAt: new Date()
            });

            const task = await Task.create({
                title: 'Task in archived project',
                owner: testManager._id,
                project: archivedProject._id,
                archived: true,
                archivedAt: new Date()
            });

            await expect(
                taskService.unarchiveTask(task._id, testManager._id)
            ).rejects.toThrow('Cannot unarchive task while its project is archived');
        });

        it('should allow unarchival when parent project is not archived', async () => {
            const activeProject = await Project.create({
                name: 'Active Project',
                owner: testManager._id,
                archived: false
            });

            const task = await Task.create({
                title: 'Task in active project',
                owner: testManager._id,
                project: activeProject._id,
                archived: true,
                archivedAt: new Date()
            });

            const unarchivedTask = await taskService.unarchiveTask(task._id, testManager._id);

            expect(unarchivedTask.archived).toBe(false);
            expect(unarchivedTask.archivedAt).toBeNull();
        });
    });
});
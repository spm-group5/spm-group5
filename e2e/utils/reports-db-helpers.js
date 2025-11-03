/**
 * Reports E2E Test Database Helpers
 * 
 * This file provides database setup and cleanup functions for reports E2E tests.
 * 
 * Key Principles:
 * - Uses SAME test database as backend unit tests and auth E2E tests
 * - ALL entities use 'e2e-reports-*' prefix for safe cleanup
 * - Cleanup ONLY deletes prefixed entities (regex matching)
 * - Creates realistic data relationships (users → projects → tasks → subtasks)
 * - Uses UTC dates for all timestamps
 * - Password hashing handled by User model pre-save hook
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../../backend/src/models/user.model.js';
import Project from '../../backend/src/models/project.model.js';
import Task from '../../backend/src/models/task.model.js';
import Subtask from '../../backend/src/models/subtask.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load TEST environment variables (same as auth E2E tests)
dotenv.config({ 
  path: path.join(__dirname, '../../backend/environments/.env.test') 
});

/**
 * Connect to TEST database
 */
export async function connectToTestDB() {
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Already connected to TEST database');
    return;
  }
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to TEST database for Reports E2E tests');
}

/**
 * Cleanup: Delete ONLY e2e-reports-* prefixed entities
 * Safe to run multiple times (idempotent)
 */
export async function cleanupE2EReportsData() {
  await connectToTestDB();
  
  console.log('🧹 Cleaning up E2E Reports test data...');
  
  // Delete in correct order (referential integrity)
  // 1. Subtasks first (references tasks)
  const subtasksDeleted = await Subtask.deleteMany({ 
    title: /^e2e-reports-/i 
  });
  
  // 2. Tasks (references projects and users)
  const tasksDeleted = await Task.deleteMany({ 
    title: /^e2e-reports-/i 
  });
  
  // 3. Projects (references users)
  const projectsDeleted = await Project.deleteMany({ 
    name: /^e2e-reports-/i 
  });
  
  // 4. Users last
  const usersDeleted = await User.deleteMany({ 
    username: /^e2e-reports-/i 
  });
  
  console.log(`✅ Cleaned up: ${usersDeleted.deletedCount} users, ${projectsDeleted.deletedCount} projects, ${tasksDeleted.deletedCount} tasks, ${subtasksDeleted.deletedCount} subtasks`);
  
  return {
    users: usersDeleted.deletedCount,
    projects: projectsDeleted.deletedCount,
    tasks: tasksDeleted.deletedCount,
    subtasks: subtasksDeleted.deletedCount
  };
}

/**
 * Create 5 test users with e2e-reports-* prefix
 * Passwords will be hashed by User model pre-save hook
 */
export async function createE2EReportsUsers() {
  console.log('📝 Creating E2E Reports test users...');
  
  const users = await User.create([
    {
      username: 'e2e-reports-admin@test.com',
      roles: ['admin'],
      department: 'hr',  // HR has admin privileges per business rules
      hashed_password: 'Test@123'  // Plain text - pre-save hook will hash
    },
    {
      username: 'e2e-reports-manager@test.com',
      roles: ['manager'],
      department: 'sales',
      hashed_password: 'Test@123'
    },
    {
      username: 'e2e-reports-staff-eng@test.com',
      roles: ['staff'],
      department: 'engineering',
      hashed_password: 'Test@123'
    },
    {
      username: 'e2e-reports-staff-finance@test.com',
      roles: ['staff'],
      department: 'finance',
      hashed_password: 'Test@123'
    },
    {
      username: 'e2e-reports-staff-consultancy@test.com',
      roles: ['staff'],
      department: 'consultancy',
      hashed_password: 'Test@123'
    }
  ]);
  
  console.log(`✅ Created ${users.length} E2E Reports test users`);
  
  // Verify password was hashed
  const adminUser = users[0];
  if (adminUser.hashed_password.startsWith('$2a$') || adminUser.hashed_password.startsWith('$2b$')) {
    console.log('✅ Verified admin user password was hashed by pre-save hook');
  } else {
    console.warn('⚠️  WARNING: Password may not have been hashed!');
  }
  
  return {
    admin: users[0],
    manager: users[1],
    staffEng: users[2],
    staffFinance: users[3],
    staffConsultancy: users[4]
  };
}

/**
 * Create 3 test projects with e2e-reports-* prefix
 */
export async function createE2EReportsProjects(users) {
  console.log('📝 Creating E2E Reports test projects...');
  
  const projects = await Project.create([
    // Main project - most tests use this
    {
      name: 'e2e-reports-Main Project',
      description: 'Main project with comprehensive test data for reports',
      owner: users.admin._id,
      members: [users.admin._id, users.manager._id, users.staffEng._id, users.staffFinance._id],
      status: 'In Progress',
      priority: 8,
      tags: ['testing', 'reports'],
      archived: false,
      createdAt: new Date('2024-01-01T00:00:00Z')
    },
    
    // Minimal project - for edge cases
    {
      name: 'e2e-reports-Minimal Project',
      description: 'Project with minimal tasks for testing empty scenarios',
      owner: users.manager._id,
      members: [users.manager._id],
      status: 'To Do',
      archived: false,
      createdAt: new Date('2024-02-01T00:00:00Z')
    },
    
    // Archived project - should NOT appear in reports
    {
      name: 'e2e-reports-Archived Project',
      description: 'Archived project that should not appear in any reports',
      owner: users.admin._id,
      members: [],
      status: 'Completed',
      archived: true,
      archivedAt: new Date('2024-01-15T00:00:00Z'),
      createdAt: new Date('2023-12-01T00:00:00Z')
    }
  ]);
  
  console.log(`✅ Created ${projects.length} E2E Reports test projects`);
  
  return {
    mainProject: projects[0],
    minimalProject: projects[1],
    archivedProject: projects[2]
  };
}

/**
 * Create 15+ test tasks with specific dates for date range testing
 * Tasks use UTC timestamps and hash-delimited tags
 */
export async function createE2EReportsTasks(users, projects) {
  console.log('📝 Creating E2E Reports test tasks...');
  
  const tasks = await Task.create([
    // ========== WEEK 1 (Jan 1-7, 2024) - 5 tasks ==========
    {
      title: 'e2e-reports-Task Jan 1 Completed',
      description: 'Completed task from Jan 1',
      owner: users.admin._id,
      assignee: [users.staffEng._id],
      project: projects.mainProject._id,
      status: 'Completed',
      priority: 8,
      tags: 'backend#testing',  // Hash-delimited
      timeTaken: 120,  // 2 hours in minutes
      archived: false,
      createdAt: new Date('2024-01-01T10:00:00Z')
    },
    
    {
      title: 'e2e-reports-Task Jan 3 In Progress',
      description: 'In progress task with multiple assignees',
      owner: users.manager._id,
      assignee: [users.staffFinance._id, users.staffEng._id],
      project: projects.mainProject._id,
      status: 'In Progress',
      priority: 6,
      tags: 'frontend',
      timeTaken: 300,  // 5 hours
      archived: false,
      createdAt: new Date('2024-01-03T14:00:00Z')
    },
    
    {
      title: 'e2e-reports-Task Jan 5 To Do',
      description: 'To do task with no time logged',
      owner: users.staffEng._id,
      assignee: [],
      project: projects.mainProject._id,
      status: 'To Do',
      priority: 5,
      tags: '',  // No tags
      timeTaken: 0,
      archived: false,
      createdAt: new Date('2024-01-05T09:00:00Z')
    },
    
    {
      title: 'e2e-reports-Task Jan 6 Blocked',
      description: 'Blocked task',
      owner: users.admin._id,
      assignee: [users.manager._id],
      project: projects.mainProject._id,
      status: 'Blocked',
      priority: 9,
      tags: 'urgent#blocked',
      timeTaken: 45,  // 45 minutes
      archived: false,
      createdAt: new Date('2024-01-06T11:00:00Z')
    },
    
    {
      title: 'e2e-reports-Task Jan 7 Completed',
      description: 'Completed on last day of week',
      owner: users.staffFinance._id,
      assignee: [users.staffConsultancy._id],
      project: projects.mainProject._id,
      status: 'Completed',
      priority: 7,
      tags: 'api#integration',
      timeTaken: 180,  // 3 hours
      archived: false,
      createdAt: new Date('2024-01-07T16:00:00Z')
    },
    
    // ========== WEEK 2 (Jan 8-14) - 3 tasks (boundary testing) ==========
    {
      title: 'e2e-reports-Task Jan 8 Completed',
      description: 'First day after week 1 (boundary)',
      owner: users.manager._id,
      assignee: [users.staffEng._id],
      project: projects.mainProject._id,
      status: 'Completed',
      priority: 6,
      tags: 'backend',
      timeTaken: 240,  // 4 hours
      archived: false,
      createdAt: new Date('2024-01-08T08:00:00Z')
    },
    
    {
      title: 'e2e-reports-Task Jan 15 In Progress',
      description: 'Mid-month task',
      owner: users.admin._id,
      assignee: [users.staffFinance._id],
      project: projects.mainProject._id,
      status: 'In Progress',
      priority: 5,
      tags: 'database#migration',
      timeTaken: 150,  // 2.5 hours
      archived: false,
      createdAt: new Date('2024-01-15T10:00:00Z')
    },
    
    {
      title: 'e2e-reports-Task Jan 20 To Do',
      description: 'Late month to-do task',
      owner: users.staffEng._id,
      assignee: [],
      project: projects.mainProject._id,
      status: 'To Do',
      priority: 4,
      tags: 'documentation',
      timeTaken: 0,
      archived: false,
      createdAt: new Date('2024-01-20T13:00:00Z')
    },
    
    // ========== LATE JANUARY - 2 tasks (month boundary testing) ==========
    {
      title: 'e2e-reports-Task Jan 31 Completed',
      description: 'Last day of January (month boundary)',
      owner: users.staffFinance._id,
      assignee: [users.manager._id],
      project: projects.mainProject._id,
      status: 'Completed',
      priority: 8,
      tags: 'testing#qa',
      timeTaken: 360,  // 6 hours
      archived: false,
      createdAt: new Date('2024-01-31T23:59:00Z')
    },
    
    {
      title: 'e2e-reports-Task Feb 1 To Do',
      description: 'First day of February (outside January)',
      owner: users.admin._id,
      assignee: [],
      project: projects.mainProject._id,
      status: 'To Do',
      priority: 5,
      tags: '',
      timeTaken: 0,
      archived: false,
      createdAt: new Date('2024-02-01T09:00:00Z')
    },
    
    // ========== ENGINEERING STAFF TASKS - 3 tasks (user-specific reports) ==========
    {
      title: 'e2e-reports-Engineering Task 1',
      description: 'Task owned by engineering staff',
      owner: users.staffEng._id,
      assignee: [users.staffEng._id],
      project: projects.mainProject._id,
      status: 'Completed',
      priority: 7,
      tags: 'engineering#backend',
      timeTaken: 200,  // 3h 20m
      archived: false,
      createdAt: new Date('2024-01-10T10:00:00Z')
    },
    
    {
      title: 'e2e-reports-Engineering Task 2',
      description: 'Another engineering task in progress',
      owner: users.staffEng._id,
      assignee: [],
      project: projects.mainProject._id,
      status: 'In Progress',
      priority: 6,
      tags: 'engineering',
      timeTaken: 90,  // 1h 30m
      archived: false,
      createdAt: new Date('2024-01-12T14:00:00Z')
    },
    
    {
      title: 'e2e-reports-Engineering Task 3',
      description: 'Engineering task as assignee (not owner)',
      owner: users.admin._id,
      assignee: [users.staffEng._id],
      project: projects.mainProject._id,
      status: 'To Do',
      priority: 5,
      tags: 'engineering#frontend',
      timeTaken: 0,
      archived: false,
      createdAt: new Date('2024-01-14T09:00:00Z')
    },
    
    // ========== MINIMAL PROJECT TASKS - 2 tasks ==========
    {
      title: 'e2e-reports-Minimal Task 1',
      description: 'Task in minimal project',
      owner: users.manager._id,
      assignee: [],
      project: projects.minimalProject._id,
      status: 'To Do',
      priority: 5,
      tags: '',
      timeTaken: 0,
      archived: false,
      createdAt: new Date('2024-02-15T10:00:00Z')
    },
    
    {
      title: 'e2e-reports-Minimal Task 2',
      description: 'Completed task in minimal project',
      owner: users.manager._id,
      assignee: [users.manager._id],
      project: projects.minimalProject._id,
      status: 'Completed',
      priority: 6,
      tags: 'minimal',
      timeTaken: 60,  // 1 hour
      archived: false,
      createdAt: new Date('2024-02-20T11:00:00Z')
    },
    
    // ========== ARCHIVED TASK - should NOT appear in reports ==========
    {
      title: 'e2e-reports-Archived Task',
      description: 'This task is archived and should not appear in any reports',
      owner: users.admin._id,
      assignee: [],
      project: projects.archivedProject._id,
      status: 'Completed',
      priority: 5,
      tags: 'archived',
      timeTaken: 100,
      archived: true,
      archivedAt: new Date('2024-01-15T00:00:00Z'),
      createdAt: new Date('2024-01-10T10:00:00Z')
    }
  ]);
  
  console.log(`✅ Created ${tasks.length} E2E Reports test tasks`);
  
  return {
    week1Tasks: tasks.slice(0, 5),
    week2Tasks: tasks.slice(5, 8),
    lateJanTasks: tasks.slice(8, 10),
    engineeringTasks: tasks.slice(10, 13),
    minimalProjectTasks: tasks.slice(13, 15),
    archivedTask: tasks[15],
    allTasks: tasks
  };
}

/**
 * Create 5+ test subtasks linked to parent tasks
 */
export async function createE2EReportsSubtasks(users, projects, tasks) {
  console.log('📝 Creating E2E Reports test subtasks...');
  
  const subtasks = await Subtask.create([
    // Subtask for first completed task (Jan 1)
    {
      title: 'e2e-reports-Subtask 1-1',
      description: 'Subtask for completed task',
      parentTaskId: tasks.week1Tasks[0]._id,  // Task Jan 1 Completed
      projectId: projects.mainProject._id,
      ownerId: users.admin._id,
      assigneeId: [users.staffEng._id],
      status: 'Completed',
      priority: 7,
      tags: 'subtask#backend',
      timeTaken: 45,  // 45 minutes
      archived: false,
      createdAt: new Date('2024-01-01T11:00:00Z')
    },
    
    // Subtask for in-progress task (Jan 3)
    {
      title: 'e2e-reports-Subtask 2-1',
      description: 'Subtask for in-progress task',
      parentTaskId: tasks.week1Tasks[1]._id,  // Task Jan 3 In Progress
      projectId: projects.mainProject._id,
      ownerId: users.manager._id,
      assigneeId: [users.staffFinance._id],
      status: 'In Progress',
      priority: 6,
      tags: 'subtask#frontend',
      timeTaken: 120,  // 2 hours
      archived: false,
      createdAt: new Date('2024-01-03T15:00:00Z')
    },
    
    // Another subtask for same in-progress task
    {
      title: 'e2e-reports-Subtask 2-2',
      description: 'Second subtask for in-progress task',
      parentTaskId: tasks.week1Tasks[1]._id,  // Task Jan 3 In Progress
      projectId: projects.mainProject._id,
      ownerId: users.staffFinance._id,
      assigneeId: [],
      status: 'To Do',
      priority: 5,
      tags: '',
      timeTaken: 0,
      archived: false,
      createdAt: new Date('2024-01-04T09:00:00Z')
    },
    
    // Subtask for engineering task
    {
      title: 'e2e-reports-Engineering Subtask 1',
      description: 'Subtask for engineering task',
      parentTaskId: tasks.engineeringTasks[0]._id,  // Engineering Task 1
      projectId: projects.mainProject._id,
      ownerId: users.staffEng._id,
      assigneeId: [users.staffEng._id],
      status: 'Completed',
      priority: 7,
      tags: 'engineering#subtask',
      timeTaken: 90,  // 1.5 hours
      archived: false,
      createdAt: new Date('2024-01-10T11:00:00Z')
    },
    
    // Archived subtask - should NOT appear in reports
    {
      title: 'e2e-reports-Archived Subtask',
      description: 'Archived subtask that should not appear in reports',
      parentTaskId: tasks.archivedTask._id,
      projectId: projects.archivedProject._id,
      ownerId: users.admin._id,
      assigneeId: [],
      status: 'Completed',
      priority: 5,
      tags: 'archived',
      timeTaken: 30,
      archived: true,
      archivedAt: new Date('2024-01-15T00:00:00Z'),
      createdAt: new Date('2024-01-10T12:00:00Z')
    }
  ]);
  
  console.log(`✅ Created ${subtasks.length} E2E Reports test subtasks`);
  
  return {
    subtask1: subtasks[0],
    subtask2: subtasks[1],
    subtask3: subtasks[2],
    engineeringSubtask: subtasks[3],
    archivedSubtask: subtasks[4],
    allSubtasks: subtasks
  };
}

/**
 * Master setup function - creates all test data in correct order
 */
export async function setupE2EReportsData() {
  await connectToTestDB();
  
  console.log('🚀 Setting up E2E Reports test data...');
  console.log('');
  
  // Clean first (idempotent - safe to run if no data exists)
  await cleanupE2EReportsData();
  console.log('');
  
  // Create in order: Users → Projects → Tasks → Subtasks
  const users = await createE2EReportsUsers();
  console.log('');
  
  const projects = await createE2EReportsProjects(users);
  console.log('');
  
  const tasks = await createE2EReportsTasks(users, projects);
  console.log('');
  
  const subtasks = await createE2EReportsSubtasks(users, projects, tasks);
  console.log('');
  
  console.log('✅ E2E Reports test data setup complete!');
  console.log('');
  console.log('Summary:');
  console.log(`  - ${Object.keys(users).length} users`);
  console.log(`  - ${Object.keys(projects).length} projects`);
  console.log(`  - ${tasks.allTasks.length} tasks`);
  console.log(`  - ${subtasks.allSubtasks.length} subtasks`);
  console.log('');
  
  return { users, projects, tasks, subtasks };
}

// Export for individual testing
export default {
  connectToTestDB,
  cleanupE2EReportsData,
  createE2EReportsUsers,
  createE2EReportsProjects,
  createE2EReportsTasks,
  createE2EReportsSubtasks,
  setupE2EReportsData
};

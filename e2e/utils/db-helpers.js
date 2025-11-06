/**
 * E2E Test Database Helpers
 * 
 * Manages test data lifecycle for E2E tests:
 * 1. Create fresh test data before tests
 * 2. Clean up after tests complete
 * 
 * Business Rules Enforced:
 * - No "it" department usage
 * - All HR users must have "admin" role
 * - Email format required for usernames
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load TEST environment variables (same as backend uses)
const envPath = join(__dirname, '../../backend/environments/.env.test');
dotenv.config({ path: envPath });

// Import models from backend
const backendPath = join(__dirname, '../../backend/src/models');
const User = (await import(join(backendPath, 'user.model.js'))).default;
const Project = (await import(join(backendPath, 'project.model.js'))).default;
const Task = (await import(join(backendPath, 'task.model.js'))).default;
const Subtask = (await import(join(backendPath, 'subtask.model.js'))).default;

// Use the SAME MongoDB URI as the backend test environment
const MONGO_URI = process.env.MONGO_URI;

/**
 * Connect to TEST database (same as backend uses)
 */
export async function connectTestDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to TEST database');
  }
}

/**
 * Create E2E test users following business rules:
 * 1. No "it" department (excluded from usage)
 * 2. All HR users must have "admin" in roles
 * 3. Email format required for username
 * 
 * Note: Passwords are passed as plain text - the User model's pre-save hook will hash them
 * 
 * @returns {Promise<Array>} Array of created users
 */
export async function createE2EUsers() {
  await connectTestDB();
  
  console.log('📝 Creating E2E test users...');
  
  // Create users with PLAIN TEXT passwords - the pre-save hook will hash them
  const users = await User.create([
    // Admin user in HR (business rule: all HR users must be admin)
    {
      username: 'e2e-admin@test.com',
      roles: ['admin', 'manager'],
      department: 'hr', // Business rule: HR users must have admin role
      hashed_password: 'Test@123' // Plain text - will be hashed by pre-save hook
    },
    // Manager user in Engineering
    {
      username: 'e2e-manager@test.com',
      roles: ['manager'],
      department: 'engineering',
      hashed_password: 'Test@123'
    },
    // Staff user in Sales
    {
      username: 'e2e-staff@test.com',
      roles: ['staff'],
      department: 'sales',
      hashed_password: 'Test@123'
    },
    // Additional staff for testing assignments (Consultancy)
    {
      username: 'e2e-staff2@test.com',
      roles: ['staff'],
      department: 'consultancy',
      hashed_password: 'Test@123'
    },
    // Manager in Finance for diversity
    {
      username: 'e2e-finance-manager@test.com',
      roles: ['manager'],
      department: 'finance',
      hashed_password: 'Test@123'
    }
  ]);
  
  // Verify users were created properly
  const adminUser = await User.findOne({ username: 'e2e-admin@test.com' });
  if (adminUser) {
    console.log(`✅ Verified admin user exists with password hash: ${adminUser.hashed_password.substring(0, 20)}...`);
  }
  
  console.log(`✅ Created ${users.length} E2E test users`);
  return users;
}

/**
 * Create test project with members
 * 
 * @param {Object} owner - User who owns the project
 * @param {Array} members - Array of user objects who are project members
 * @returns {Promise<Object>} Created project
 */
export async function createTestProject(owner, members = []) {
  await connectTestDB();
  
  const project = await Project.create({
    name: 'E2E Test Project',
    description: 'Project for E2E testing - auto-generated',
    owner: owner._id,
    members: members.map(m => m._id),
    status: 'In Progress',
    createdAt: new Date()
  });
  
  console.log(`✅ Created test project: ${project.name}`);
  return project;
}

/**
 * Create test tasks for a project
 * 
 * @param {Object} project - Project to create tasks for
 * @param {Array} users - Array of users for assigning tasks
 * @returns {Promise<Array>} Array of created tasks
 */
export async function createTestTasks(project, users) {
  await connectTestDB();
  
  const tasks = await Task.create([
    {
      title: 'E2E Test Task 1 - To Do',
      description: 'First test task for E2E testing',
      status: 'To Do',
      priority: 8,
      owner: users[0]._id,
      assignee: [users[1]._id],
      project: project._id,
      createdAt: new Date()
    },
    {
      title: 'E2E Test Task 2 - In Progress',
      description: 'Second test task currently in progress',
      status: 'In Progress',
      priority: 5,
      owner: users[1]._id,
      assignee: [users[2]._id],
      project: project._id,
      createdAt: new Date()
    },
    {
      title: 'E2E Test Task 3 - Completed',
      description: 'Third test task that is completed',
      status: 'Completed',
      priority: 6,
      owner: users[2]._id,
      assignee: [users[0]._id],
      project: project._id,
      createdAt: new Date()
    }
  ]);
  
  console.log(`✅ Created ${tasks.length} test tasks`);
  return tasks;
}

/**
 * Clean up ALL E2E test data
 * Call this in afterAll or afterEach hooks
 * 
 * Identifies E2E data by naming patterns:
 * - Users: e2e-*@test.com
 * - Projects: E2E Test*
 * - Tasks: E2E Test*
 */
export async function cleanupE2EData() {
  await connectTestDB();
  
  console.log('🧹 Cleaning up E2E test data...');
  
  // Delete all E2E test data using naming patterns
  const deletedUsers = await User.deleteMany({ 
    username: /^e2e-.*@test\.com$/ 
  });
  
  const deletedProjects = await Project.deleteMany({ 
    name: /^E2E Test/ 
  });
  
  const deletedTasks = await Task.deleteMany({ 
    title: /^E2E Test/ 
  });
  
  const deletedSubtasks = await Subtask.deleteMany({ 
    title: /^E2E Test/ 
  });
  
  console.log(`✅ Cleaned up: ${deletedUsers.deletedCount} users, ${deletedProjects.deletedCount} projects, ${deletedTasks.deletedCount} tasks, ${deletedSubtasks.deletedCount} subtasks`);
}

/**
 * Disconnect from database
 */
export async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('✅ Disconnected from E2E test database');
  }
}

/**
 * Complete setup: create all test data
 * Convenience function to set up everything at once
 * 
 * @returns {Promise<Object>} Object with users, project, and tasks
 */
export async function setupCompleteTestData() {
  const users = await createE2EUsers();
  const project = await createTestProject(users[0], users.slice(1));
  const tasks = await createTestTasks(project, users);
  
  return {
    users,
    project,
    tasks
  };
}

/**
 * Get E2E test users from database
 * @returns {Promise<Object>} Object with user references by role
 */
export async function getE2EUsers() {
  await connectTestDB();
  
  const admin = await User.findOne({ username: 'e2e-admin@test.com' });
  const manager = await User.findOne({ username: 'e2e-manager@test.com' });
  const staff = await User.findOne({ username: 'e2e-staff@test.com' });
  const staff2 = await User.findOne({ username: 'e2e-staff2@test.com' });
  const financeManager = await User.findOne({ username: 'e2e-finance-manager@test.com' });
  
  return {
    admin,
    manager,
    staff,
    staff2,
    financeManager
  };
}

/**
 * Get project by name
 * @param {string} projectName - Name of the project
 * @returns {Promise<Object>} Project document
 */
export async function getProjectByName(projectName) {
  await connectTestDB();
  return await Project.findOne({ name: projectName });
}

/**
 * Get task by title
 * @param {string} taskTitle - Title of the task
 * @returns {Promise<Object>} Task document
 */
export async function getTaskByTitle(taskTitle) {
  await connectTestDB();
  return await Task.findOne({ title: taskTitle }).populate('assignee').populate('owner');
}

/**
 * Verify user is in project members
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user is a member
 */
export async function isUserProjectMember(projectId, userId) {
  await connectTestDB();
  const project = await Project.findById(projectId);
  if (!project) return false;
  return project.members.some(memberId => String(memberId) === String(userId));
}

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of notifications
 */
export async function getUserNotifications(userId) {
  await connectTestDB();
  const Notification = (await import(join(dirname(fileURLToPath(import.meta.url)), '../../backend/src/models/notification.model.js'))).default;
  return await Notification.find({ user: userId }).sort({ createdAt: -1 });
}

/**
 * Count unread notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
export async function countUnreadNotifications(userId) {
  await connectTestDB();
  const Notification = (await import(join(dirname(fileURLToPath(import.meta.url)), '../../backend/src/models/notification.model.js'))).default;
  return await Notification.countDocuments({ user: userId, read: false });
}

/**
 * Wait for notification to be created
 * Polls database for notification containing specific text
 * @param {string} userId - User ID to check
 * @param {string} messagePattern - Text pattern to match in notification message
 * @param {number} timeout - Timeout in milliseconds (default 5000)
 * @returns {Promise<Object>} Notification document
 */
export async function waitForNotification(userId, messagePattern, timeout = 5000) {
  await connectTestDB();
  const Notification = (await import(join(dirname(fileURLToPath(import.meta.url)), '../../backend/src/models/notification.model.js'))).default;
  
  const startTime = Date.now();
  const regex = new RegExp(messagePattern, 'i');
  
  while (Date.now() - startTime < timeout) {
    const notification = await Notification.findOne({
      user: userId,
      message: regex
    }).sort({ createdAt: -1 });
    
    if (notification) {
      return notification;
    }
    
    // Wait 200ms before checking again
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  throw new Error(`Notification matching "${messagePattern}" not found within ${timeout}ms`);
}

/**
 * Get all tasks for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of tasks
 */
export async function getProjectTasks(projectId) {
  await connectTestDB();
  return await Task.find({ project: projectId });
}

/**
 * Count archived tasks in a project
 * @param {string} projectId - Project ID
 * @returns {Promise<number>} Count of archived tasks
 */
export async function countArchivedTasks(projectId) {
  await connectTestDB();
  return await Task.countDocuments({ project: projectId, archived: true });
}

/**
 * Create project with specific owner and members
 * @param {string} projectName - Project name
 * @param {Object} owner - Owner user document
 * @param {Array} members - Array of member user documents
 * @returns {Promise<Object>} Created project
 */
export async function createProjectWithMembers(projectName, owner, members = []) {
  await connectTestDB();
  
  const project = await Project.create({
    name: projectName,
    description: `E2E Test Project - ${projectName}`,
    owner: owner._id,
    members: members.map(m => m._id),
    status: 'In Progress',
    createdAt: new Date()
  });
  
  console.log(`✅ Created project: ${project.name} with ${members.length} members`);
  return project;
}

// Test utilities for TaskCard component tests
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { TaskContext } from '../../../context/TaskContext';
import { ProjectContext } from '../../../context/ProjectContext';
import { NotificationContext } from '../../../context/NotificationContext';
import { SubtaskProvider } from '../../../context/SubtaskContext';
import { vi } from 'vitest';

/**
 * Test users matching backend fixtures
 */
export const testUsers = {
  manager: {
    _id: 'manager-id',
    username: 'manager@company.com',
    roles: ['manager'],
    department: 'it'
  },
  staff1: {
    _id: 'staff1-id',
    username: 'staff1@company.com',
    roles: ['staff'],
    department: 'it'
  },
  staff2: {
    _id: 'staff2-id',
    username: 'staff2@company.com',
    roles: ['staff'],
    department: 'hr'
  },
  staff3: {
    _id: 'staff3-id',
    username: 'staff3@company.com',
    roles: ['staff'],
    department: 'sales'
  }
};

/**
 * Test task fixtures
 */
export const testTasks = {
  'T-610': {
    _id: 'task-610',
    title: 'T-610: Implement user authentication',
    description: 'Build JWT-based authentication system',
    priority: 8,
    status: 'In Progress',
    tags: 'authentication, security',
    owner: 'manager-id',
    assignee: ['manager-id', 'staff1-id'],
    project: 'project-1',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'T-610-1': {
    _id: 'task-610-1',
    title: 'T-610-1: Design auth flow',
    description: 'Subtask: Create authentication flow diagrams',
    priority: 6,
    status: 'To Do',
    tags: 'design, planning',
    owner: 'staff1-id',
    assignee: ['staff1-id'],
    project: 'project-1',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'T-611': {
    _id: 'task-611',
    title: 'T-611: Database optimization',
    description: 'Optimize slow queries',
    priority: 7,
    status: 'To Do',
    tags: 'database, performance',
    owner: 'manager-id',
    assignee: ['manager-id'],
    project: 'project-1',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'T-611-1': {
    _id: 'task-611-1',
    title: 'T-611-1: Index analysis',
    description: 'Subtask: Analyze current indexes',
    priority: 5,
    status: 'To Do',
    tags: 'database, analysis',
    owner: 'staff2-id',
    assignee: ['staff2-id'],
    project: 'project-1',
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'T-612': {
    _id: 'task-612',
    title: 'T-612: API documentation',
    description: 'Write comprehensive API docs',
    priority: 5,
    status: 'To Do',
    tags: 'documentation',
    owner: 'manager-id',
    assignee: ['manager-id'],
    project: 'project-1',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'T-613': {
    _id: 'task-613',
    title: 'T-613: Bug fix - login redirect',
    description: 'Fix redirect loop on login',
    priority: 9,
    status: 'Blocked',
    tags: 'bug, urgent',
    owner: 'manager-id',
    assignee: ['manager-id'],
    project: 'project-1',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'T-614': {
    _id: 'task-614',
    title: 'T-614: Implement notifications',
    description: 'Build notification system',
    priority: 6,
    status: 'To Do',
    tags: 'feature, notifications',
    owner: 'manager-id',
    assignee: ['manager-id'],
    project: 'project-1',
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

/**
 * Render component with authentication context
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {string} options.role - User role ('manager' or 'staff')
 * @param {Object} options.user - Custom user object
 * @param {Object} options.authContextValue - Custom auth context value
 * @param {Object} options.taskContextValue - Custom task context value
 * @param {Object} options.projectContextValue - Custom project context value
 * @returns {Object} Render result with utilities
 */
export function renderWithAuth(ui, options = {}) {
  const {
    role = 'staff',
    user,
    authContextValue,
    taskContextValue,
    projectContextValue,
    notificationContextValue,
    ...renderOptions
  } = options;

  // Determine user based on role
  let authUser;
  if (user) {
    authUser = user;
  } else if (role === 'manager') {
    authUser = testUsers.manager;
  } else {
    authUser = testUsers.staff1;
  }

  // Default auth context
  const defaultAuthContext = {
    user: authUser,
    isAuthenticated: true,
    loading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    checkAuthStatus: vi.fn()
  };

  // Default task context
  const defaultTaskContext = {
    tasks: [],
    loading: false,
    error: null,
    fetchTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    archiveTask: vi.fn(),
    unarchiveTask: vi.fn()
  };

  // Default project context
  const defaultProjectContext = {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
    fetchProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn()
  };

  // Default notification context
  const defaultNotificationContext = {
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn()
  };

  const finalAuthContext = { ...defaultAuthContext, ...authContextValue };
  const finalTaskContext = { ...defaultTaskContext, ...taskContextValue };
  const finalProjectContext = { ...defaultProjectContext, ...projectContextValue };
  const finalNotificationContext = { ...defaultNotificationContext, ...notificationContextValue };

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <AuthContext.Provider value={finalAuthContext}>
          <NotificationContext.Provider value={finalNotificationContext}>
            <ProjectContext.Provider value={finalProjectContext}>
              <TaskContext.Provider value={finalTaskContext}>
                <SubtaskProvider>
                  {children}
                </SubtaskProvider>
              </TaskContext.Provider>
            </ProjectContext.Provider>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    user: authUser,
    authContext: finalAuthContext,
    taskContext: finalTaskContext,
    projectContext: finalProjectContext,
    notificationContext: finalNotificationContext
  };
}

/**
 * Render component as Manager
 */
export function renderAsManager(ui, options = {}) {
  return renderWithAuth(ui, { ...options, role: 'manager', user: testUsers.manager });
}

/**
 * Render component as Staff
 */
export function renderAsStaff(ui, options = {}) {
  return renderWithAuth(ui, { ...options, role: 'staff', user: testUsers.staff1 });
}

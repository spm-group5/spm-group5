/**
 * Test Suite: DashboardPage
 *
 * Purpose: Validates the DashboardPage component display and functionality
 *
 * Test Coverage:
 * - Page rendering with Header
 * - Task statistics display
 * - Project count display
 * - Recent tasks section
 * - Quick actions section
 * - Loading states
 * - Empty states
 * - Data fetching on mount
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { AuthContext } from '../context/AuthContext';
import { TaskContext } from '../context/TaskContext';
import { ProjectContext } from '../context/ProjectContext';

const mockFetchTasks = vi.fn();
const mockFetchProjects = vi.fn();

const mockTasks = [
  {
    _id: '1',
    title: 'Task 1',
    status: 'To Do',
    createdAt: '2025-01-01'
  },
  {
    _id: '2',
    title: 'Task 2',
    status: 'In Progress',
    dueDate: '2025-12-31',
    createdAt: '2025-01-02'
  },
  {
    _id: '3',
    title: 'Task 3',
    status: 'Done',
    createdAt: '2025-01-03'
  },
  {
    _id: '4',
    title: 'Task 4',
    status: 'In Progress',
    createdAt: '2025-01-04'
  }
];

const mockProjects = [
  { _id: 'proj1', name: 'Project 1' },
  { _id: 'proj2', name: 'Project 2' }
];

const renderWithContexts = (authValue, taskValue, projectValue) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        <TaskContext.Provider value={taskValue}>
          <ProjectContext.Provider value={projectValue}>
            <DashboardPage />
          </ProjectContext.Provider>
        </TaskContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    mockFetchTasks.mockClear();
    mockFetchProjects.mockClear();
  });

  describe('Page Rendering', () => {
    it('renders Header component', () => {
      const authValue = { user: { name: 'John Doe' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('displays welcome message with user name', () => {
      const authValue = { user: { name: 'John Doe' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText(/Welcome back, John Doe!/i)).toBeInTheDocument();
    });

    it('displays welcome message with email when name not available', () => {
      const authValue = { user: { email: 'john@example.com' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText(/Welcome back, john@example.com!/i)).toBeInTheDocument();
    });

    it('displays subtitle message', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText("Here's what's happening with your tasks and projects.")).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('displays total tasks count', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('displays in progress tasks count', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays completed tasks count', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('displays total projects count', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText('Total Projects')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays zero counts when no data', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: [],
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: [],
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      // Check for 0 being displayed (multiple zeros will exist)
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });
  });

  describe('Recent Tasks Section', () => {
    it('displays Recent Tasks heading', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByRole('heading', { name: 'Recent Tasks' })).toBeInTheDocument();
    });

    it('displays View All button linking to tasks page', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      const viewAllButton = screen.getByRole('button', { name: 'View All' });
      expect(viewAllButton.closest('a')).toHaveAttribute('href', '/tasks');
    });

    it('displays recent tasks', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('displays task status badges', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('displays due date when available', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText(/Due Dec 31/i)).toBeInTheDocument();
    });

    it('limits recent tasks to 5 items', () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        _id: `task-${i}`,
        title: `Task ${i}`,
        status: 'To Do',
        createdAt: `2025-01-${i + 1}`
      }));

      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: manyTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);

      // Should only show 5 tasks
      expect(screen.getByText('Task 9')).toBeInTheDocument();
      expect(screen.getByText('Task 8')).toBeInTheDocument();
      expect(screen.queryByText('Task 0')).not.toBeInTheDocument();
    });

    it('displays empty message when no tasks', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: [],
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByText('No tasks yet. Create your first task!')).toBeInTheDocument();
    });
  });

  describe('Quick Actions Section', () => {
    it('displays Quick Actions heading', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(screen.getByRole('heading', { name: 'Quick Actions' })).toBeInTheDocument();
    });

    it('displays Create Task button linking to tasks page', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      const createTaskButton = screen.getByRole('button', { name: 'Create Task' });
      expect(createTaskButton.closest('a')).toHaveAttribute('href', '/tasks');
    });

    it('displays Create Project button linking to projects page', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      const createProjectButton = screen.getByRole('button', { name: 'Create Project' });
      expect(createProjectButton.closest('a')).toHaveAttribute('href', '/projects');
    });

    it('Create Task button has correct styling', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      const createTaskButton = screen.getByRole('button', { name: 'Create Task' });
      expect(createTaskButton.className).toMatch(/primary/);
      expect(createTaskButton.className).toMatch(/large/);
    });

    it('Create Project button has correct styling', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      const createProjectButton = screen.getByRole('button', { name: 'Create Project' });
      expect(createProjectButton.className).toMatch(/secondary/);
      expect(createProjectButton.className).toMatch(/large/);
    });
  });

  describe('Loading State', () => {
    it('displays loading spinner when tasks are loading', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: [],
        loading: true,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: [],
        loading: false,
        fetchProjects: mockFetchProjects
      };

      const { container } = renderWithContexts(authValue, taskValue, projectValue);
      expect(container.querySelector('[class*="spinner"]')).toBeInTheDocument();
    });

    it('displays loading spinner when projects are loading', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: [],
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: [],
        loading: true,
        fetchProjects: mockFetchProjects
      };

      const { container } = renderWithContexts(authValue, taskValue, projectValue);
      expect(container.querySelector('[class*="spinner"]')).toBeInTheDocument();
    });

    it('does not show loading when data is already loaded', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: true,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      const { container } = renderWithContexts(authValue, taskValue, projectValue);
      expect(container.querySelector('[class*="spinner"]')).not.toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('fetches tasks on mount', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(mockFetchTasks).toHaveBeenCalled();
    });

    it('fetches projects on mount', () => {
      const authValue = { user: { name: 'John' } };
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        fetchTasks: mockFetchTasks
      };
      const projectValue = {
        projects: mockProjects,
        loading: false,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(authValue, taskValue, projectValue);
      expect(mockFetchProjects).toHaveBeenCalled();
    });
  });
});

/**
 * Test Suite: TasksPage
 *
 * Purpose: Validates the TasksPage component for managing tasks
 *
 * Test Coverage:
 * - Page rendering with Header
 * - Task list display
 * - Create task flow
 * - Edit task flow
 * - Delete task flow
 * - Form display toggling
 * - Empty state handling
 * - Loading state handling
 * - Error handling
 * - Projects fetching for form dropdown
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import TasksPage from './TasksPage';
import { AuthContext } from '../context/AuthContext';
import { TaskContext } from '../context/TaskContext';
import { ProjectContext } from '../context/ProjectContext';

const mockFetchTasks = vi.fn();
const mockCreateTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockArchiveTask = vi.fn();
const mockUnarchiveTask = vi.fn();
const mockFetchProjects = vi.fn();

const mockTasks = [
  {
    _id: 'task1',
    title: 'Task Alpha',
    description: 'Description for Alpha',
    status: 'To Do',
    priority: 5,
    dueDate: '2025-12-31',
    tags: 'frontend#react',
    createdAt: '2024-01-01',
    project: { _id: 'proj1', name: 'Project 1' }
  },
  {
    _id: 'task2',
    title: 'Task Beta',
    description: 'Description for Beta',
    status: 'In Progress',
    priority: 8,
    dueDate: '2025-11-15',
    tags: 'backend#api',
    createdAt: '2024-01-15',
    project: { _id: 'proj2', name: 'Project 2' }
  },
  {
    _id: 'task3',
    title: 'Task Gamma',
    description: 'Description for Gamma',
    status: 'To Do',
    priority: 3,
    dueDate: '2025-10-10',
    tags: 'frontend#testing',
    createdAt: '2024-02-01',
    project: { _id: 'proj1', name: 'Project 1' }
  }
];

const mockProjects = [
  { _id: 'proj1', name: 'Project 1', status: 'Active', members: [] },
  { _id: 'proj2', name: 'Project 2', status: 'Active', members: [] }
];

const renderWithContexts = (taskValue, projectValue) => {
  const authValue = { user: { name: 'John Doe' } };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        <TaskContext.Provider value={taskValue}>
          <ProjectContext.Provider value={projectValue}>
            <TasksPage />
          </ProjectContext.Provider>
        </TaskContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('TasksPage', () => {
  beforeEach(() => {
    mockFetchTasks.mockClear();
    mockCreateTask.mockClear();
    mockUpdateTask.mockClear();
    mockArchiveTask.mockClear();
    mockUnarchiveTask.mockClear();
    mockFetchProjects.mockClear();
  });

  describe('Page Rendering', () => {
    it('renders Header component', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('displays page heading', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    });

    it('displays New Task button', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByRole('button', { name: 'New Task' })).toBeInTheDocument();
    });
  });

  describe('Task List Display', () => {
    it('displays all tasks', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByText('Task Alpha')).toBeInTheDocument();
      expect(screen.getByText('Task Beta')).toBeInTheDocument();
      expect(screen.getByText('Task Gamma')).toBeInTheDocument();
    });

    it('renders TaskCard for each task', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: vi.fn(),
        unarchiveTask: vi.fn()
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Check that Edit and Archive buttons are visible in collapsed view
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      const archiveButtons = screen.getAllByRole('button', { name: 'Archive' });

      expect(editButtons.length).toBeGreaterThanOrEqual(mockTasks.length);
      expect(archiveButtons.length).toBeGreaterThanOrEqual(mockTasks.length);
    });
  });

  describe('Create Task Flow', () => {
    it('shows form when New Task button is clicked', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const newTaskButton = screen.getByRole('button', { name: 'New Task' });
      await user.click(newTaskButton);

      expect(screen.getByRole('heading', { name: 'Create New Task' })).toBeInTheDocument();
    });

    it('hides task list when form is shown', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const newTaskButton = screen.getByRole('button', { name: 'New Task' });
      await user.click(newTaskButton);

      expect(screen.queryByText('Task Alpha')).not.toBeInTheDocument();
    });

    it('calls createTask when form is submitted', async () => {
      const user = userEvent.setup();
      mockCreateTask.mockResolvedValue({ success: true });

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      const { container } = renderWithContexts(taskValue, projectValue);
      const newTaskButton = screen.getByRole('button', { name: 'New Task' });
      await user.click(newTaskButton);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'New Test Task');

      // Find project select by name attribute
      const projectSelect = container.querySelector('select[name="project"]');
      await user.selectOptions(projectSelect, 'proj1');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalled();
      });
    });

    it('hides form after successful creation', async () => {
      const user = userEvent.setup();
      mockCreateTask.mockResolvedValue({ success: true });

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      const { container } = renderWithContexts(taskValue, projectValue);
      const newTaskButton = screen.getByRole('button', { name: 'New Task' });
      await user.click(newTaskButton);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'New Test Task');

      // Find project select by name attribute
      const projectSelect = container.querySelector('select[name="project"]');
      await user.selectOptions(projectSelect, 'proj1');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Create New Task' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Task Flow', () => {
    it('shows form with task data when Edit is clicked', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Get first Edit button (buttons visible in collapsed view)
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      expect(screen.getByRole('heading', { name: 'Edit Task' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Task Beta')).toBeInTheDocument();
    });

    it('calls updateTask when edited form is submitted', async () => {
      const user = userEvent.setup();
      mockUpdateTask.mockResolvedValue({ success: true });

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Get first Edit button
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      // First task is now Task Beta (task2)
      await user.click(editButtons[0]);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      const submitButton = screen.getByRole('button', { name: 'Update Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          'task2',
          expect.objectContaining({ title: 'Updated Task' })
        );
      });
    });

    it('hides form after successful update', async () => {
      const user = userEvent.setup();
      mockUpdateTask.mockResolvedValue({ success: true });

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Get first Edit button
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      const submitButton = screen.getByRole('button', { name: 'Update Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Edit Task' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Archive Task Flow', () => {
    it('shows modal when Archive is clicked', async () => {
      const user = userEvent.setup();

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Get first Archive button (visible in collapsed view)
      const archiveButtons = screen.getAllByRole('button', { name: 'Archive' });
      await user.click(archiveButtons[0]);

      // Check modal is displayed
      expect(screen.getByText('Archive Task')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to archive this task/)).toBeInTheDocument();
    });

    it('calls archiveTask when confirmed in modal', async () => {
      const user = userEvent.setup();
      mockArchiveTask.mockResolvedValue({ success: true });

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Click first Archive button (visible in collapsed view)
      const archiveButtons = screen.getAllByRole('button', { name: 'Archive' });
      await user.click(archiveButtons[0]);

      // Click confirm in modal
      const confirmButtons = screen.getAllByRole('button', { name: 'Archive' });
      const modalConfirmButton = confirmButtons[confirmButtons.length - 1]; // Last Archive button is in modal
      await user.click(modalConfirmButton);

      await waitFor(() => {
        // First task shown is Task Beta (task2) - priority 8
        expect(mockArchiveTask).toHaveBeenCalledWith('task2');
      });
    });

    it('does not archive when cancelled in modal', async () => {
      const user = userEvent.setup();

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Click first Archive button (visible in collapsed view)
      const archiveButtons = screen.getAllByRole('button', { name: 'Archive' });
      await user.click(archiveButtons[0]);

      // Click cancel in modal
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockArchiveTask).not.toHaveBeenCalled();
    });

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Click first Archive button (visible in collapsed view)
      const archiveButtons = screen.getAllByRole('button', { name: 'Archive' });
      await user.click(archiveButtons[0]);

      // Modal should be visible
      expect(screen.getByText('Archive Task')).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText('Archive Task')).not.toBeInTheDocument();
      });
      expect(mockArchiveTask).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('hides form and returns to list when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const newTaskButton = screen.getByRole('button', { name: 'New Task' });
      await user.click(newTaskButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(screen.queryByRole('heading', { name: 'Create New Task' })).not.toBeInTheDocument();
      expect(screen.getByText('Task Alpha')).toBeInTheDocument();
    });

    it('clears editing state when Cancel is clicked during edit', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);

      // Click first Edit button (visible in collapsed view)
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Click New Task and verify it's in create mode, not edit
      const newTaskButton = screen.getByRole('button', { name: 'New Task' });
      await user.click(newTaskButton);

      expect(screen.getByRole('heading', { name: 'Create New Task' })).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no tasks', () => {
      const taskValue = {
        tasks: [],
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first task to get started!')).toBeInTheDocument();
    });

    it('empty state has Create Task button', () => {
      const taskValue = {
        tasks: [],
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const createButtons = screen.getAllByRole('button', { name: 'Create Task' });
      expect(createButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('displays loading spinner when loading and no tasks', () => {
      const taskValue = {
        tasks: [],
        loading: true,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      const { container } = renderWithContexts(taskValue, projectValue);
      expect(container.querySelector('[class*="spinner"]')).toBeInTheDocument();
    });

    it('does not show spinner when tasks are already loaded', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: true,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      const { container } = renderWithContexts(taskValue, projectValue);
      expect(container.querySelector('[class*="spinner"]')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error exists', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: 'Failed to load tasks',
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByText('Error: Failed to load tasks')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('fetches tasks on mount', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(mockFetchTasks).toHaveBeenCalled();
    });

    it('fetches projects on mount', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(mockFetchProjects).toHaveBeenCalled();
    });
  });

  describe('Sorting Functionality', () => {
    it('displays sort dropdown when tasks exist', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByLabelText(/Sort by:/i)).toBeInTheDocument();
    });

    it('sorts by priority by default (highest first)', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const taskTitles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
      expect(taskTitles[0]).toBe('Task Beta'); // Priority 8
      expect(taskTitles[1]).toBe('Task Alpha'); // Priority 5
      expect(taskTitles[2]).toBe('Task Gamma'); // Priority 3
    });

    it('changes sort order when dropdown value changes', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const sortSelect = screen.getByLabelText(/Sort by:/i);
      await user.selectOptions(sortSelect, 'dueDate');

      const taskTitles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
      expect(taskTitles[0]).toBe('Task Gamma'); // 2025-10-10
      expect(taskTitles[1]).toBe('Task Beta'); // 2025-11-15
      expect(taskTitles[2]).toBe('Task Alpha'); // 2025-12-31
    });
  });

  describe('Filtering Functionality', () => {
    it('displays tag filter dropdown when tasks have tags', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByLabelText(/Filter by tag:/i)).toBeInTheDocument();
    });

    it('displays project filter dropdown when tasks exist', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByLabelText(/Filter by project:/i)).toBeInTheDocument();
    });

    it('filters tasks by tag', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const tagFilter = screen.getByLabelText(/Filter by tag:/i);
      await user.selectOptions(tagFilter, 'frontend');

      expect(screen.getByText('Task Alpha')).toBeInTheDocument();
      expect(screen.getByText('Task Gamma')).toBeInTheDocument();
      expect(screen.queryByText('Task Beta')).not.toBeInTheDocument();
    });

    it('filters tasks by project', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const projectFilter = screen.getByLabelText(/Filter by project:/i);
      await user.selectOptions(projectFilter, 'Project 1');

      expect(screen.getByText('Task Alpha')).toBeInTheDocument();
      expect(screen.getByText('Task Gamma')).toBeInTheDocument();
      expect(screen.queryByText('Task Beta')).not.toBeInTheDocument();
    });

    it('shows clear filters button when filters are applied', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const tagFilter = screen.getByLabelText(/Filter by tag:/i);
      await user.selectOptions(tagFilter, 'frontend');

      expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeInTheDocument();
    });

    it('clears filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const tagFilter = screen.getByLabelText(/Filter by tag:/i);
      await user.selectOptions(tagFilter, 'frontend');

      const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
      await user.click(clearButton);

      expect(screen.getByText('Task Alpha')).toBeInTheDocument();
      expect(screen.getByText('Task Beta')).toBeInTheDocument();
      expect(screen.getByText('Task Gamma')).toBeInTheDocument();
    });

    it('shows empty state when no tasks match filters', async () => {
      const user = userEvent.setup();
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        archiveTask: mockArchiveTask,
        unarchiveTask: mockUnarchiveTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const tagFilter = screen.getByLabelText(/Filter by tag:/i);
      // Filter for a tag that exists but combine with a project that doesn't have that tag
      await user.selectOptions(tagFilter, 'backend');

      const projectFilter = screen.getByLabelText(/Filter by project:/i);
      await user.selectOptions(projectFilter, 'Project 1');

      expect(screen.getByText('No tasks match your filters')).toBeInTheDocument();
    });
  });
});

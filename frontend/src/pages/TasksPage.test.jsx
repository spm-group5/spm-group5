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
const mockDeleteTask = vi.fn();
const mockFetchProjects = vi.fn();

const mockTasks = [
  {
    _id: 'task1',
    title: 'Task Alpha',
    description: 'Description for Alpha',
    status: 'To Do',
    priority: 5,
    dueDate: '2025-12-31',
    project: { _id: 'proj1', name: 'Project 1' }
  },
  {
    _id: 'task2',
    title: 'Task Beta',
    description: 'Description for Beta',
    status: 'In Progress',
    priority: 8,
    project: null
  }
];

const mockProjects = [
  { _id: 'proj1', name: 'Project 1' },
  { _id: 'proj2', name: 'Project 2' }
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

// Mock window.confirm
global.confirm = vi.fn();

describe('TasksPage', () => {
  beforeEach(() => {
    mockFetchTasks.mockClear();
    mockCreateTask.mockClear();
    mockUpdateTask.mockClear();
    mockDeleteTask.mockClear();
    mockFetchProjects.mockClear();
    global.confirm.mockClear();
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(screen.getByText('Task Alpha')).toBeInTheDocument();
      expect(screen.getByText('Task Beta')).toBeInTheDocument();
    });

    it('renders TaskCard for each task', () => {
      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      expect(editButtons).toHaveLength(2);
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const newTaskButton = screen.getByRole('button', { name: 'New Task' });
      await user.click(newTaskButton);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'New Test Task');

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
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const newTaskButton = screen.getByRole('button', { name: 'New Task' });
      await user.click(newTaskButton);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'New Test Task');

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
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      expect(screen.getByRole('heading', { name: 'Edit Task' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Task Alpha')).toBeInTheDocument();
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
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      const submitButton = screen.getByRole('button', { name: 'Update Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          'task1',
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
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      const submitButton = screen.getByRole('button', { name: 'Update Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Edit Task' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Task Flow', () => {
    it('shows confirmation dialog when Delete is clicked', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(true);

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?');
    });

    it('calls deleteTask when confirmed', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(true);
      mockDeleteTask.mockResolvedValue({ success: true });

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteTask).toHaveBeenCalledWith('task1');
      });
    });

    it('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(false);

      const taskValue = {
        tasks: mockTasks,
        loading: false,
        error: null,
        fetchTasks: mockFetchTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteButtons[0]);

      expect(mockDeleteTask).not.toHaveBeenCalled();
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
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
        deleteTask: mockDeleteTask
      };

      const projectValue = {
        projects: mockProjects,
        fetchProjects: mockFetchProjects
      };

      renderWithContexts(taskValue, projectValue);
      expect(mockFetchProjects).toHaveBeenCalled();
    });
  });
});

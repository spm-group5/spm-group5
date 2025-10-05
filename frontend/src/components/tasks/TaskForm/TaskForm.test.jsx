/**
 * Test Suite: TaskForm Component
 *
 * Purpose: Validates the TaskForm component for creating and editing tasks
 *
 * Test Coverage:
 * - Form rendering in create and edit modes
 * - Form field validation
 * - Priority field constraints
 * - Form submission
 * - Cancel functionality
 * - Loading states
 * - Status and project dropdown options
 * - Date handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskForm from './TaskForm';
import { ProjectContext } from '../../../context/ProjectContext';

const mockProjects = [
  { _id: 'proj1', name: 'Project Alpha' },
  { _id: 'proj2', name: 'Project Beta' },
  { _id: 'proj3', name: 'Project Gamma' }
];

const renderWithContext = (component) => {
  return render(
    <ProjectContext.Provider value={{ projects: mockProjects }}>
      {component}
    </ProjectContext.Provider>
  );
};

describe('TaskForm Component', () => {
  describe('Create Mode', () => {
    it('renders form in create mode when no task is provided', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'Create New Task' })).toBeInTheDocument();
    });

    it('renders all form fields in create mode', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Due Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Project/i)).toBeInTheDocument();
    });

    it('has default values in create mode', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      const statusSelect = screen.getByLabelText(/Status/i);
      const priorityInput = screen.getByLabelText(/Priority/i);

      expect(titleInput).toHaveValue('');
      expect(statusSelect).toHaveValue('To Do');
      expect(priorityInput).toHaveValue(5);
    });

    it('displays Create Task button in create mode', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const mockTask = {
      _id: '123',
      title: 'Existing Task',
      description: 'Existing description',
      status: 'In Progress',
      priority: 8,
      dueDate: '2025-12-31',
      project: { _id: 'proj1', name: 'Project Alpha' }
    };

    it('renders form in edit mode when task is provided', () => {
      renderWithContext(<TaskForm task={mockTask} onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'Edit Task' })).toBeInTheDocument();
    });

    it('populates form fields with task data', () => {
      renderWithContext(<TaskForm task={mockTask} onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      const statusSelect = screen.getByLabelText(/Status/i);
      const priorityInput = screen.getByLabelText(/Priority/i);
      const dueDateInput = screen.getByLabelText(/Due Date/i);
      const projectSelect = screen.getByLabelText(/Project/i);

      expect(titleInput).toHaveValue('Existing Task');
      expect(descriptionInput).toHaveValue('Existing description');
      expect(statusSelect).toHaveValue('In Progress');
      expect(priorityInput).toHaveValue(8);
      expect(dueDateInput).toHaveValue('2025-12-31');
      expect(projectSelect).toHaveValue('proj1');
    });

    it('displays Update Task button in edit mode', () => {
      renderWithContext(<TaskForm task={mockTask} onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Update Task' })).toBeInTheDocument();
    });
  });

  describe('Title Validation', () => {
    it('shows error when title is empty', async () => {
      const user = userEvent.setup();
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('shows error when title is less than 3 characters', async () => {
      const user = userEvent.setup();
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'AB');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Title must be at least 3 characters long')).toBeInTheDocument();
      });
    });

    it('accepts valid title with 3 or more characters', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Valid Task Title');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('marks title as required field', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const titleLabel = screen.getByLabelText(/Title/i).closest('div');
      expect(titleLabel).toContainHTML('*');
    });
  });

  describe('Priority Field', () => {
    it('has number input type', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const priorityInput = screen.getByLabelText(/Priority/i);
      expect(priorityInput).toHaveAttribute('type', 'number');
    });

    it('has min value of 1', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const priorityInput = screen.getByLabelText(/Priority/i);
      expect(priorityInput).toHaveAttribute('min', '1');
    });

    it('has max value of 10', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const priorityInput = screen.getByLabelText(/Priority/i);
      expect(priorityInput).toHaveAttribute('max', '10');
    });

    it('shows error when priority is less than 1', async () => {
      const user = userEvent.setup();
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      const priorityInput = screen.getByLabelText(/Priority/i);

      await user.clear(titleInput);
      await user.type(titleInput, 'Test Task');
      await user.clear(priorityInput);
      await user.type(priorityInput, '0');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Priority must be between 1 and 10')).toBeInTheDocument();
      });
    });

    it('shows error when priority is greater than 10', async () => {
      const user = userEvent.setup();
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      const priorityInput = screen.getByLabelText(/Priority/i);

      await user.clear(titleInput);
      await user.type(titleInput, 'Test Task');
      await user.clear(priorityInput);
      await user.type(priorityInput, '11');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Priority must be between 1 and 10')).toBeInTheDocument();
      });
    });

    it('accepts priority value of 1', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      const priorityInput = screen.getByLabelText(/Priority/i);

      await user.type(titleInput, 'Test Task');
      await user.clear(priorityInput);
      await user.type(priorityInput, '1');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 1 })
        );
      });
    });

    it('accepts priority value of 10', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      const priorityInput = screen.getByLabelText(/Priority/i);

      await user.type(titleInput, 'Test Task');
      await user.clear(priorityInput);
      await user.type(priorityInput, '10');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 10 })
        );
      });
    });

    it('marks priority as required field', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const priorityLabel = screen.getByLabelText(/Priority/i).closest('div');
      expect(priorityLabel).toContainHTML('*');
    });
  });

  describe('Status Dropdown', () => {
    it('includes To Do option', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const statusSelect = screen.getByLabelText(/Status/i);
      expect(statusSelect).toContainHTML('<option value="To Do">To Do</option>');
    });

    it('includes In Progress option', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const statusSelect = screen.getByLabelText(/Status/i);
      expect(statusSelect).toContainHTML('<option value="In Progress">In Progress</option>');
    });

    it('includes Done option', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const statusSelect = screen.getByLabelText(/Status/i);
      expect(statusSelect).toContainHTML('<option value="Done">Done</option>');
    });

    it('allows changing status', async () => {
      const user = userEvent.setup();
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const statusSelect = screen.getByLabelText(/Status/i);
      await user.selectOptions(statusSelect, 'Done');

      expect(statusSelect).toHaveValue('Done');
    });
  });

  describe('Project Dropdown', () => {
    it('includes No Project option', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const projectSelect = screen.getByLabelText(/Project/i);
      expect(projectSelect).toContainHTML('<option value="">No Project</option>');
    });

    it('displays all available projects', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByRole('option', { name: 'Project Alpha' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Project Beta' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Project Gamma' })).toBeInTheDocument();
    });

    it('allows selecting a project', async () => {
      const user = userEvent.setup();
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const projectSelect = screen.getByLabelText(/Project/i);
      await user.selectOptions(projectSelect, 'proj2');

      expect(projectSelect).toHaveValue('proj2');
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with form data when submitted', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      const statusSelect = screen.getByLabelText(/Status/i);
      const priorityInput = screen.getByLabelText(/Priority/i);

      await user.type(titleInput, 'New Task');
      await user.type(descriptionInput, 'Task description');
      await user.selectOptions(statusSelect, 'In Progress');
      await user.clear(priorityInput);
      await user.type(priorityInput, '7');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          title: 'New Task',
          description: 'Task description',
          status: 'In Progress',
          priority: 7,
          dueDate: null,
          project: ''
        });
      });
    });

    it('converts priority to integer', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      const priorityInput = screen.getByLabelText(/Priority/i);

      await user.type(titleInput, 'Test Task');
      await user.clear(priorityInput);
      await user.type(priorityInput, '8');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 8 })
        );
        expect(typeof onSubmit.mock.calls[0][0].priority).toBe('number');
      });
    });

    it('submits form with null dueDate when not provided', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Task Without Date');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ dueDate: null })
        );
      });
    });

    it('shows Creating... text when submitting in create mode', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = vi.fn(() => new Promise(resolve => { resolveSubmit = resolve; }));

      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Test Task');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument();
      });
    });

    it('shows Updating... text when submitting in edit mode', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = vi.fn(() => new Promise(resolve => { resolveSubmit = resolve; }));

      const mockTask = {
        title: 'Existing Task',
        status: 'To Do',
        priority: 5
      };

      renderWithContext(<TaskForm task={mockTask} onSubmit={onSubmit} onCancel={vi.fn()} />);

      const submitButton = screen.getByRole('button', { name: 'Update Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Updating...' })).toBeInTheDocument();
      });
    });

    it('disables buttons during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = vi.fn(() => new Promise(resolve => { resolveSubmit = resolve; }));

      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Test Task');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('renders Cancel button', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('Cancel button has correct variant', () => {
      renderWithContext(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toHaveClass('secondary');
    });
  });

  describe('Optional Fields', () => {
    it('description field is optional', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Task Without Description');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('due date field is optional', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Task Without Date');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('project field is optional', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithContext(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Standalone Task');

      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ project: '' })
        );
      });
    });
  });
});

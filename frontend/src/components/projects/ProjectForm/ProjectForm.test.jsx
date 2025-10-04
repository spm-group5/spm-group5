/**
 * Test Suite: ProjectForm Component
 *
 * Purpose: Validates the ProjectForm component for creating and editing projects
 *
 * Test Coverage:
 * - Form rendering in create and edit modes
 * - Form field validation
 * - Form submission
 * - Cancel functionality
 * - Loading states
 * - Status dropdown options
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectForm from './ProjectForm';

describe('ProjectForm Component', () => {
  describe('Create Mode', () => {
    it('renders form in create mode when no project is provided', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'Create New Project' })).toBeInTheDocument();
    });

    it('renders all form fields in create mode', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    });

    it('has empty default values in create mode', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      const statusSelect = screen.getByLabelText(/Status/i);

      expect(nameInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
      expect(statusSelect).toHaveValue('Active');
    });

    it('displays Create Project button in create mode', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const mockProject = {
      _id: '123',
      name: 'Existing Project',
      description: 'Existing description',
      status: 'Completed'
    };

    it('renders form in edit mode when project is provided', () => {
      render(<ProjectForm project={mockProject} onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'Edit Project' })).toBeInTheDocument();
    });

    it('populates form fields with project data', () => {
      render(<ProjectForm project={mockProject} onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      const statusSelect = screen.getByLabelText(/Status/i);

      expect(nameInput).toHaveValue('Existing Project');
      expect(descriptionInput).toHaveValue('Existing description');
      expect(statusSelect).toHaveValue('Completed');
    });

    it('displays Update Project button in edit mode', () => {
      render(<ProjectForm project={mockProject} onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Update Project' })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when project name is empty', async () => {
      const user = userEvent.setup();
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeInTheDocument();
      });
    });

    it('shows error when project name is less than 3 characters', async () => {
      const user = userEvent.setup();
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'AB');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project name must be at least 3 characters long')).toBeInTheDocument();
      });
    });

    it('accepts valid project name with 3 or more characters', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'Valid Project Name');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('marks project name as required field', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Status Dropdown', () => {
    it('includes Active option', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const statusSelect = screen.getByLabelText(/Status/i);
      expect(statusSelect).toContainHTML('<option value="Active">Active</option>');
    });

    it('includes Completed option', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const statusSelect = screen.getByLabelText(/Status/i);
      expect(statusSelect).toContainHTML('<option value="Completed">Completed</option>');
    });

    it('includes Archived option', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const statusSelect = screen.getByLabelText(/Status/i);
      expect(statusSelect).toContainHTML('<option value="Archived">Archived</option>');
    });

    it('allows changing status', async () => {
      const user = userEvent.setup();
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const statusSelect = screen.getByLabelText(/Status/i);
      await user.selectOptions(statusSelect, 'Archived');

      expect(statusSelect).toHaveValue('Archived');
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with form data when submitted', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      const statusSelect = screen.getByLabelText(/Status/i);

      await user.type(nameInput, 'New Project');
      await user.type(descriptionInput, 'Project description');
      await user.selectOptions(statusSelect, 'Active');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'New Project',
          description: 'Project description',
          status: 'Active'
        });
      });
    });

    it('submits form with empty description', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'Project Without Description');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Project Without Description',
            description: ''
          })
        );
      });
    });

    it('shows Creating... text when submitting in create mode', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = vi.fn(() => new Promise(resolve => { resolveSubmit = resolve; }));

      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'Test Project');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument();
      });
    });

    it('shows Updating... text when submitting in edit mode', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = vi.fn(() => new Promise(resolve => { resolveSubmit = resolve; }));

      const mockProject = {
        name: 'Existing Project',
        description: 'Description',
        status: 'Active'
      };

      render(<ProjectForm project={mockProject} onSubmit={onSubmit} onCancel={vi.fn()} />);

      const submitButton = screen.getByRole('button', { name: 'Update Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Updating...' })).toBeInTheDocument();
      });
    });

    it('disables buttons during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = vi.fn(() => new Promise(resolve => { resolveSubmit = resolve; }));

      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'Test Project');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('renders Cancel button', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<ProjectForm onSubmit={vi.fn()} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('Cancel button has correct variant', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton.className).toMatch(/secondary/);
    });
  });

  describe('Form Fields', () => {
    it('description field is optional', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ProjectForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'Project Name Only');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('description field has correct placeholder', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const descriptionInput = screen.getByLabelText(/Description/i);
      expect(descriptionInput).toHaveAttribute('placeholder', 'Project description (optional)');
    });

    it('description textarea has 4 rows', () => {
      render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      const descriptionInput = screen.getByLabelText(/Description/i);
      expect(descriptionInput).toHaveAttribute('rows', '4');
    });
  });
});

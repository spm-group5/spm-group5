/**
 * Test Suite: ProjectsPage
 *
 * Purpose: Validates the ProjectsPage component for managing projects
 *
 * Test Coverage:
 * - Page rendering with Header
 * - Project list display
 * - Create project flow
 * - Edit project flow
 * - Delete project flow
 * - Form display toggling
 * - Empty state handling
 * - Loading state handling
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ProjectsPage from './ProjectsPage';
import { AuthContext } from '../context/AuthContext';
import { ProjectContext } from '../context/ProjectContext';

const mockFetchProjects = vi.fn();
const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();

const mockProjects = [
  {
    _id: 'proj1',
    name: 'Project Alpha',
    description: 'Description for Alpha',
    status: 'Active',
    members: [{ _id: '1' }, { _id: '2' }],
    owner: { name: 'John Doe' }
  },
  {
    _id: 'proj2',
    name: 'Project Beta',
    description: 'Description for Beta',
    status: 'Completed',
    members: [{ _id: '1' }],
    owner: { name: 'Jane Smith' }
  }
];

const renderWithContext = (projectValue) => {
  const authValue = { user: { name: 'John Doe' } };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        <ProjectContext.Provider value={projectValue}>
          <ProjectsPage />
        </ProjectContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

// Mock window.confirm
global.confirm = vi.fn();

describe('ProjectsPage', () => {
  beforeEach(() => {
    mockFetchProjects.mockClear();
    mockCreateProject.mockClear();
    mockUpdateProject.mockClear();
    mockDeleteProject.mockClear();
    global.confirm.mockClear();
  });

  describe('Page Rendering', () => {
    it('renders Header component', () => {
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('displays page heading', () => {
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    });

    it('displays New Project button', () => {
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
    });
  });

  describe('Project List Display', () => {
    it('displays all projects', () => {
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('renders ProjectCard for each project', () => {
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      expect(editButtons).toHaveLength(2);
    });
  });

  describe('Create Project Flow', () => {
    it('shows form when New Project button is clicked', async () => {
      const user = userEvent.setup();
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const newProjectButton = screen.getByRole('button', { name: 'New Project' });
      await user.click(newProjectButton);

      expect(screen.getByRole('heading', { name: 'Create New Project' })).toBeInTheDocument();
    });

    it('hides project list when form is shown', async () => {
      const user = userEvent.setup();
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const newProjectButton = screen.getByRole('button', { name: 'New Project' });
      await user.click(newProjectButton);

      expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument();
    });

    it('calls createProject when form is submitted', async () => {
      const user = userEvent.setup();
      mockCreateProject.mockResolvedValue({ success: true });

      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const newProjectButton = screen.getByRole('button', { name: 'New Project' });
      await user.click(newProjectButton);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'New Test Project');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalled();
      });
    });

    it('hides form after successful creation', async () => {
      const user = userEvent.setup();
      mockCreateProject.mockResolvedValue({ success: true });

      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const newProjectButton = screen.getByRole('button', { name: 'New Project' });
      await user.click(newProjectButton);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'New Test Project');

      const submitButton = screen.getByRole('button', { name: 'Create Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Create New Project' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Project Flow', () => {
    it('shows form with project data when Edit is clicked', async () => {
      const user = userEvent.setup();
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      expect(screen.getByRole('heading', { name: 'Edit Project' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Project Alpha')).toBeInTheDocument();
    });

    it('calls updateProject when edited form is submitted', async () => {
      const user = userEvent.setup();
      mockUpdateProject.mockResolvedValue({ success: true });

      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Project');

      const submitButton = screen.getByRole('button', { name: 'Update Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith(
          'proj1',
          expect.objectContaining({ name: 'Updated Project' })
        );
      });
    });

    it('hides form after successful update', async () => {
      const user = userEvent.setup();
      mockUpdateProject.mockResolvedValue({ success: true });

      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      const submitButton = screen.getByRole('button', { name: 'Update Project' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Edit Project' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Project Flow', () => {
    it('shows confirmation dialog when Delete is clicked', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(true);

      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this project?');
    });

    it('calls deleteProject when confirmed', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(true);
      mockDeleteProject.mockResolvedValue({ success: true });

      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteProject).toHaveBeenCalledWith('proj1');
      });
    });

    it('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(false);

      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteButtons[0]);

      expect(mockDeleteProject).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('hides form and returns to list when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const newProjectButton = screen.getByRole('button', { name: 'New Project' });
      await user.click(newProjectButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(screen.queryByRole('heading', { name: 'Create New Project' })).not.toBeInTheDocument();
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    it('clears editing state when Cancel is clicked during edit', async () => {
      const user = userEvent.setup();
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Click New Project and verify it's in create mode, not edit
      const newProjectButton = screen.getByRole('button', { name: 'New Project' });
      await user.click(newProjectButton);

      expect(screen.getByRole('heading', { name: 'Create New Project' })).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no projects', () => {
      const projectValue = {
        projects: [],
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first project to get started!')).toBeInTheDocument();
    });

    it('empty state has Create Project button', () => {
      const projectValue = {
        projects: [],
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      const createButtons = screen.getAllByRole('button', { name: 'Create Project' });
      expect(createButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('displays loading spinner when loading and no projects', () => {
      const projectValue = {
        projects: [],
        loading: true,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      const { container } = renderWithContext(projectValue);
      expect(container.querySelector('[class*="spinner"]')).toBeInTheDocument();
    });

    it('does not show spinner when projects are already loaded', () => {
      const projectValue = {
        projects: mockProjects,
        loading: true,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      const { container } = renderWithContext(projectValue);
      expect(container.querySelector('[class*="spinner"]')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error exists', () => {
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: 'Failed to load projects',
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      expect(screen.getByText('Error: Failed to load projects')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('fetches projects on mount', () => {
      const projectValue = {
        projects: mockProjects,
        loading: false,
        error: null,
        fetchProjects: mockFetchProjects,
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      };

      renderWithContext(projectValue);
      expect(mockFetchProjects).toHaveBeenCalled();
    });
  });
});

/**
 * Test Suite: ProjectCard Component
 *
 * Purpose: Validates the ProjectCard component display and interactions
 *
 * Test Coverage:
 * - Project information rendering
 * - Status badge display with different statuses
 * - Member count display
 * - Owner information display
 * - Edit and Delete button interactions
 * - Conditional description rendering
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectCard from './ProjectCard';

const mockProject = {
  _id: '123',
  name: 'Test Project',
  description: 'This is a test project description',
  status: 'Active',
  members: [{ _id: '1' }, { _id: '2' }, { _id: '3' }],
  owner: {
    name: 'John Doe',
    email: 'john@example.com'
  }
};

describe('ProjectCard Component', () => {
  describe('Basic Rendering', () => {
    it('renders project name', () => {
      render(<ProjectCard project={mockProject} />);
      expect(screen.getByRole('heading', { name: 'Test Project' })).toBeInTheDocument();
    });

    it('renders project description when provided', () => {
      render(<ProjectCard project={mockProject} />);
      expect(screen.getByText('This is a test project description')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      const projectWithoutDescription = { ...mockProject, description: '' };
      const { container } = render(<ProjectCard project={projectWithoutDescription} />);
      const description = container.querySelector('.description');
      expect(description).not.toBeInTheDocument();
    });

    it('does not render description when undefined', () => {
      const projectWithoutDescription = { ...mockProject, description: undefined };
      const { container } = render(<ProjectCard project={projectWithoutDescription} />);
      const description = container.querySelector('.description');
      expect(description).not.toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('displays Active status badge', () => {
      const activeProject = { ...mockProject, status: 'Active' };
      render(<ProjectCard project={activeProject} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('displays Completed status badge', () => {
      const completedProject = { ...mockProject, status: 'Completed' };
      render(<ProjectCard project={completedProject} />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('displays Archived status badge', () => {
      const archivedProject = { ...mockProject, status: 'Archived' };
      render(<ProjectCard project={archivedProject} />);
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('applies correct class for Active status', () => {
      const activeProject = { ...mockProject, status: 'Active' };
      const { container } = render(<ProjectCard project={activeProject} />);
      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('statusActive');
    });

    it('applies correct class for Completed status', () => {
      const completedProject = { ...mockProject, status: 'Completed' };
      const { container } = render(<ProjectCard project={completedProject} />);
      const badge = screen.getByText('Completed');
      expect(badge).toHaveClass('statusCompleted');
    });

    it('applies correct class for Archived status', () => {
      const archivedProject = { ...mockProject, status: 'Archived' };
      const { container } = render(<ProjectCard project={archivedProject} />);
      const badge = screen.getByText('Archived');
      expect(badge).toHaveClass('statusArchived');
    });

    it('defaults to Active class for unknown status', () => {
      const unknownProject = { ...mockProject, status: 'Unknown' };
      const { container } = render(<ProjectCard project={unknownProject} />);
      const badge = screen.getByText('Unknown');
      expect(badge).toHaveClass('statusActive');
    });
  });

  describe('Metadata Display', () => {
    it('displays member count', () => {
      render(<ProjectCard project={mockProject} />);
      expect(screen.getByText('Members:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays 0 members when members array is empty', () => {
      const projectNoMembers = { ...mockProject, members: [] };
      render(<ProjectCard project={projectNoMembers} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays 0 members when members is undefined', () => {
      const projectNoMembers = { ...mockProject, members: undefined };
      render(<ProjectCard project={projectNoMembers} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays owner name when available', () => {
      render(<ProjectCard project={mockProject} />);
      expect(screen.getByText('Owner:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays owner email when name is not available', () => {
      const projectEmailOnly = {
        ...mockProject,
        owner: { email: 'owner@example.com' }
      };
      render(<ProjectCard project={projectEmailOnly} />);
      expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    });

    it('displays Unknown when owner data is missing', () => {
      const projectNoOwner = { ...mockProject, owner: {} };
      render(<ProjectCard project={projectNoOwner} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders Edit button', () => {
      render(<ProjectCard project={mockProject} />);
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    it('renders Delete button', () => {
      render(<ProjectCard project={mockProject} />);
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('calls onEdit with project when Edit button is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(<ProjectCard project={mockProject} onEdit={onEdit} />);

      const editButton = screen.getByRole('button', { name: 'Edit' });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(mockProject);
    });

    it('calls onDelete with project ID when Delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(<ProjectCard project={mockProject} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('123');
    });

    it('Edit button has correct variant and size', () => {
      render(<ProjectCard project={mockProject} />);
      const editButton = screen.getByRole('button', { name: 'Edit' });
      expect(editButton).toHaveClass('secondary');
      expect(editButton).toHaveClass('small');
    });

    it('Delete button has correct variant and size', () => {
      render(<ProjectCard project={mockProject} />);
      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      expect(deleteButton).toHaveClass('danger');
      expect(deleteButton).toHaveClass('small');
    });
  });

  describe('Card Properties', () => {
    it('renders as hoverable card', () => {
      const { container } = render(<ProjectCard project={mockProject} />);
      const card = container.querySelector('.card');
      expect(card).toHaveClass('hoverable');
    });

    it('applies project card class', () => {
      const { container } = render(<ProjectCard project={mockProject} />);
      expect(container.querySelector('.projectCard')).toBeInTheDocument();
    });
  });

  describe('Complete Project Card Structure', () => {
    it('renders all elements together', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(
        <ProjectCard
          project={mockProject}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      // Header section
      expect(screen.getByRole('heading', { name: 'Test Project' })).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Description
      expect(screen.getByText('This is a test project description')).toBeInTheDocument();

      // Metadata
      expect(screen.getByText('Members:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Owner:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();

      // Actions
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });
});

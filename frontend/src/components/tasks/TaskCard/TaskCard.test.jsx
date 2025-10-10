/**
 * Test Suite: TaskCard Component
 *
 * Purpose: Validates the TaskCard component display and interactions
 *
 * Test Coverage:
 * - Task information rendering
 * - Status badge display with different statuses
 * - Priority badge display with different priority levels
 * - Due date formatting and display
 * - Project information display
 * - Edit and Delete button interactions
 * - Conditional description rendering
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCard from './TaskCard';

const mockTask = {
  _id: '123',
  title: 'Test Task',
  description: 'This is a test task description',
  status: 'To Do',
  priority: 7,
  dueDate: '2025-12-31',
  owner: {
    _id: 'user123',
    username: 'testuser',
    name: 'Test User'
  },
  assignee: [],
  project: {
    _id: 'proj123',
    name: 'Test Project'
  }
};

describe('TaskCard Component', () => {
  describe('Basic Rendering', () => {
    it('renders task title', () => {
      render(<TaskCard task={mockTask} />);
      expect(screen.getByRole('heading', { name: 'Test Task' })).toBeInTheDocument();
    });

    it('does not show description when collapsed', () => {
      render(<TaskCard task={mockTask} />);
      expect(screen.queryByText('This is a test task description')).not.toBeInTheDocument();
    });

    it('shows description when expanded', async () => {
      const user = userEvent.setup();
      render(<TaskCard task={mockTask} />);

      // Click to expand - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      expect(screen.getByText('This is a test task description')).toBeInTheDocument();
    });

    it('does not render description section when no description and expanded', async () => {
      const user = userEvent.setup();
      const taskWithoutDescription = { ...mockTask, description: '' };
      const { container } = render(<TaskCard task={taskWithoutDescription} />);

      // Click to expand - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      const description = container.querySelector('.descriptionSection');
      expect(description).not.toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('displays To Do status badge', () => {
      const todoTask = { ...mockTask, status: 'To Do' };
      render(<TaskCard task={todoTask} />);
      expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    it('displays In Progress status badge', () => {
      const inProgressTask = { ...mockTask, status: 'In Progress' };
      render(<TaskCard task={inProgressTask} />);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('displays Done status badge', () => {
      const doneTask = { ...mockTask, status: 'Done' };
      render(<TaskCard task={doneTask} />);
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('applies correct class for To Do status', () => {
      const todoTask = { ...mockTask, status: 'To Do' };
      render(<TaskCard task={todoTask} />);
      const badge = screen.getByText('To Do');
      expect(badge.className).toMatch(/statusTodo/);
    });

    it('applies correct class for In Progress status', () => {
      const inProgressTask = { ...mockTask, status: 'In Progress' };
      render(<TaskCard task={inProgressTask} />);
      const badge = screen.getByText('In Progress');
      expect(badge.className).toMatch(/statusInProgress/);
    });

    it('applies correct class for Done status', () => {
      const doneTask = { ...mockTask, status: 'Done' };
      render(<TaskCard task={doneTask} />);
      const badge = screen.getByText('Done');
      expect(badge.className).toMatch(/statusDone/);
    });

    it('defaults to To Do class for unknown status', () => {
      const unknownTask = { ...mockTask, status: 'Unknown' };
      render(<TaskCard task={unknownTask} />);
      const badge = screen.getByText('Unknown');
      expect(badge.className).toMatch(/statusTodo/);
    });
  });

  describe('Priority Badge', () => {
    it('displays priority value', () => {
      render(<TaskCard task={mockTask} />);
      expect(screen.getByText('P7')).toBeInTheDocument();
    });

    it('displays low priority (1-4)', () => {
      const lowPriorityTask = { ...mockTask, priority: 3 };
      render(<TaskCard task={lowPriorityTask} />);
      expect(screen.getByText('P3')).toBeInTheDocument();
    });

    it('displays medium priority (5-7)', () => {
      const mediumPriorityTask = { ...mockTask, priority: 6 };
      render(<TaskCard task={mediumPriorityTask} />);
      expect(screen.getByText('P6')).toBeInTheDocument();
    });

    it('displays high priority (8-10)', () => {
      const highPriorityTask = { ...mockTask, priority: 9 };
      render(<TaskCard task={highPriorityTask} />);
      expect(screen.getByText('P9')).toBeInTheDocument();
    });

    it('applies low priority class for priority < 5', () => {
      const lowPriorityTask = { ...mockTask, priority: 2 };
      render(<TaskCard task={lowPriorityTask} />);
      const badge = screen.getByText('P2');
      expect(badge.className).toMatch(/priorityLow/);
    });

    it('applies medium priority class for priority 5-7', () => {
      const mediumPriorityTask = { ...mockTask, priority: 5 };
      render(<TaskCard task={mediumPriorityTask} />);
      const badge = screen.getByText('P5');
      expect(badge.className).toMatch(/priorityMedium/);
    });

    it('applies high priority class for priority >= 8', () => {
      const highPriorityTask = { ...mockTask, priority: 8 };
      render(<TaskCard task={highPriorityTask} />);
      const badge = screen.getByText('P8');
      expect(badge.className).toMatch(/priorityHigh/);
    });

    it('applies medium priority class for priority 7', () => {
      const prioritySevenTask = { ...mockTask, priority: 7 };
      render(<TaskCard task={prioritySevenTask} />);
      const badge = screen.getByText('P7');
      expect(badge.className).toMatch(/priorityMedium/);
    });
  });

  describe('Due Date Display', () => {
    it('displays formatted due date', () => {
      render(<TaskCard task={mockTask} />);
      expect(screen.getByText('Due:')).toBeInTheDocument();
      expect(screen.getByText('Dec 31, 2025')).toBeInTheDocument();
    });

    it('displays No due date when dueDate is null', () => {
      const taskNoDueDate = { ...mockTask, dueDate: null };
      render(<TaskCard task={taskNoDueDate} />);
      expect(screen.getByText('No due date')).toBeInTheDocument();
    });

    it('displays No due date when dueDate is undefined', () => {
      const taskNoDueDate = { ...mockTask, dueDate: undefined };
      render(<TaskCard task={taskNoDueDate} />);
      expect(screen.getByText('No due date')).toBeInTheDocument();
    });

    it('displays Invalid date for malformed date', () => {
      const taskInvalidDate = { ...mockTask, dueDate: 'invalid-date' };
      render(<TaskCard task={taskInvalidDate} />);
      expect(screen.getByText('Invalid date')).toBeInTheDocument();
    });

    it('formats different date correctly', () => {
      const taskDifferentDate = { ...mockTask, dueDate: '2025-06-15' };
      render(<TaskCard task={taskDifferentDate} />);
      expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument();
    });
  });

  describe('Project Display', () => {
    it('displays project name in compact view', () => {
      render(<TaskCard task={mockTask} />);
      expect(screen.getByText(/Project:/)).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('displays N/A when project is null in compact view', () => {
      const taskNoProject = { ...mockTask, project: null };
      render(<TaskCard task={taskNoProject} />);
      expect(screen.getByText(/N\/A/)).toBeInTheDocument();
    });

    it('displays N/A when project is undefined in compact view', () => {
      const taskNoProject = { ...mockTask, project: undefined };
      render(<TaskCard task={taskNoProject} />);
      expect(screen.getByText(/N\/A/)).toBeInTheDocument();
    });

    it('displays project ID when name is not populated', () => {
      const taskProjectId = { ...mockTask, project: 'project-id-123' };
      render(<TaskCard task={taskProjectId} />);
      expect(screen.getByText('project-id-123')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('does not show Edit button when collapsed', () => {
      render(<TaskCard task={mockTask} />);
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('does not show Delete button when collapsed', () => {
      render(<TaskCard task={mockTask} />);
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('shows Edit button when expanded', async () => {
      const user = userEvent.setup();
      render(<TaskCard task={mockTask} />);

      // Expand the card - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    it('shows Archive button when expanded', async () => {
      const user = userEvent.setup();
      render(<TaskCard task={mockTask} />);

      // Expand the card - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    });

    it('calls onEdit with task when Edit button is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(<TaskCard task={mockTask} onEdit={onEdit} />);

      // Expand the card first - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      const editButton = screen.getByRole('button', { name: 'Edit' });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(mockTask);
    });

    it('calls onArchive with task ID when Archive button is clicked', async () => {
      const user = userEvent.setup();
      const onArchive = vi.fn();
      render(<TaskCard task={mockTask} onArchive={onArchive} />);

      // Expand the card first - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      const archiveButton = screen.getByRole('button', { name: 'Archive' });
      await user.click(archiveButton);

      expect(onArchive).toHaveBeenCalledTimes(1);
      expect(onArchive).toHaveBeenCalledWith('123');
    });

    it('Edit button has correct variant and size when expanded', async () => {
      const user = userEvent.setup();
      render(<TaskCard task={mockTask} />);

      // Expand the card first - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      const editButton = screen.getByRole('button', { name: 'Edit' });
      expect(editButton.className).toMatch(/secondary/);
      expect(editButton.className).toMatch(/small/);
    });

    it('Archive button has correct variant and size when expanded', async () => {
      const user = userEvent.setup();
      render(<TaskCard task={mockTask} />);

      // Expand the card first - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      const archiveButton = screen.getByRole('button', { name: 'Archive' });
      expect(archiveButton.className).toMatch(/warning/);
      expect(archiveButton.className).toMatch(/small/);
    });
  });

  describe('Card Properties', () => {
    it('renders as hoverable card', () => {
      const { container } = render(<TaskCard task={mockTask} />);
      const card = container.querySelector('[class*="card"]');
      expect(card.className).toMatch(/hoverable/);
    });

    it('applies task card class', () => {
      const { container } = render(<TaskCard task={mockTask} />);
      const taskCard = container.querySelector('[class*="taskCard"]');
      expect(taskCard).toBeInTheDocument();
    });
  });

  describe('Complete Task Card Structure', () => {
    it('renders compact view by default', () => {
      render(<TaskCard task={mockTask} />);

      // Header section - always visible
      expect(screen.getByRole('heading', { name: 'Test Task' })).toBeInTheDocument();
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('P7')).toBeInTheDocument();

      // Compact info - always visible
      expect(screen.getByText(/Due:/)).toBeInTheDocument();
      expect(screen.getByText('Dec 31, 2025')).toBeInTheDocument();
      expect(screen.getByText(/Project:/)).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();

      // Description - not visible when collapsed
      expect(screen.queryByText('This is a test task description')).not.toBeInTheDocument();

      // Actions - not visible when collapsed
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    });

    it('renders all elements when expanded', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const onArchive = vi.fn();
      render(
        <TaskCard
          task={mockTask}
          onEdit={onEdit}
          onArchive={onArchive}
        />
      );

      // Expand the card - click the heading
      const heading = screen.getByRole('heading', { name: 'Test Task' });
      await user.click(heading);

      // Header section
      expect(screen.getByRole('heading', { name: 'Test Task' })).toBeInTheDocument();
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('P7')).toBeInTheDocument();

      // Description
      expect(screen.getByText('This is a test task description')).toBeInTheDocument();

      // Metadata (now includes Owner)
      expect(screen.getByText(/Owner:/)).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();

      // Actions
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    });

    it('renders minimal task without optional fields', () => {
      const minimalTask = {
        _id: '456',
        title: 'Minimal Task',
        status: 'Done',
        priority: 5,
        owner: { username: 'owner' },
        assignee: []
      };

      render(<TaskCard task={minimalTask} />);

      expect(screen.getByRole('heading', { name: 'Minimal Task' })).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('P5')).toBeInTheDocument();
      expect(screen.getByText('No due date')).toBeInTheDocument();
      expect(screen.getByText(/N\/A/)).toBeInTheDocument(); // Project shows N/A
    });
  });
});

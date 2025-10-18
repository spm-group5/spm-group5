import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubtaskForm from './SubtaskForm';

// Mock the common components
vi.mock('../../common/Card/Card', () => ({
  default: ({ children, className }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  )
}));

vi.mock('../../common/Button/Button', () => ({
  default: ({ children, type, onClick, variant }) => (
    <button
      data-testid="button"
      type={type}
      onClick={onClick}
      data-variant={variant}
    >
      {children}
    </button>
  )
}));

vi.mock('../../common/Input/Input', () => ({
  default: ({ label, name, type, value, onChange, error, required, placeholder, min, max }) => (
    <div data-testid="input-container">
      <label htmlFor={name}>
        {label}
        {required && <span data-testid="required-asterisk">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        data-error={!!error}
      />
      {error && <span data-testid="error-message">{error}</span>}
    </div>
  )
}));

describe('SubtaskForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    parentTaskId: 'parent-task-id',
    projectId: 'project-id',
    ownerId: 'owner-id'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders create form by default', () => {
      render(<SubtaskForm {...defaultProps} />);
      
      expect(screen.getByText('Create New Subtask')).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Time Taken')).toBeInTheDocument();
    });

    it('renders edit form when initialData is provided', () => {
      const initialData = {
        title: 'Existing Subtask',
        description: 'Existing description',
        status: 'In Progress',
        priority: 7,
        timeTaken: '1 hour'
      };

      render(<SubtaskForm {...defaultProps} initialData={initialData} />);
      
      expect(screen.getByText('Edit Subtask')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Subtask')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('In Progress')).toBeInTheDocument();
      expect(screen.getByDisplayValue('7')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1 hour')).toBeInTheDocument();
    });
  });

  describe('Required Fields', () => {
    it('marks title, status, and priority as required', () => {
      render(<SubtaskForm {...defaultProps} />);
      
      expect(screen.getByTestId('required-asterisk')).toBeInTheDocument();
      // Check that required asterisks are present for required fields
      const requiredAsterisks = screen.getAllByTestId('required-asterisk');
      expect(requiredAsterisks.length).toBeGreaterThan(0);
    });
  });

  describe('Priority Field', () => {
    it('has number input type for priority', () => {
      render(<SubtaskForm {...defaultProps} />);
      const priorityInput = screen.getByLabelText('Priority');
      expect(priorityInput).toHaveAttribute('type', 'number');
    });

    it('has min value of 1 for priority', () => {
      render(<SubtaskForm {...defaultProps} />);
      const priorityInput = screen.getByLabelText('Priority');
      expect(priorityInput).toHaveAttribute('min', '1');
    });

    it('has max value of 10 for priority', () => {
      render(<SubtaskForm {...defaultProps} />);
      const priorityInput = screen.getByLabelText('Priority');
      expect(priorityInput).toHaveAttribute('max', '10');
    });

    it('defaults to priority 5', () => {
      render(<SubtaskForm {...defaultProps} />);
      const priorityInput = screen.getByLabelText('Priority');
      expect(priorityInput).toHaveValue(5);
    });
  });

  describe('Recurring Subtask Fields', () => {
    it('renders recurring checkbox', () => {
      render(<SubtaskForm {...defaultProps} />);
      expect(screen.getByLabelText('Recurring Subtask')).toBeInTheDocument();
    });

    it('shows recurrence interval field when recurring is checked', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      const recurringCheckbox = screen.getByLabelText('Recurring Subtask');
      await user.click(recurringCheckbox);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Recurrence Interval (days)')).toBeInTheDocument();
      });
    });

    it('hides recurrence interval field when recurring is unchecked', () => {
      render(<SubtaskForm {...defaultProps} />);
      
      expect(screen.queryByLabelText('Recurrence Interval (days)')).not.toBeInTheDocument();
    });
  });

  describe('Time Taken Field', () => {
    it('renders time taken input field', () => {
      render(<SubtaskForm {...defaultProps} />);
      expect(screen.getByLabelText('Time Taken')).toBeInTheDocument();
    });

    it('has placeholder text for time taken', () => {
      render(<SubtaskForm {...defaultProps} />);
      const timeTakenInput = screen.getByLabelText('Time Taken');
      expect(timeTakenInput).toHaveAttribute('placeholder', 'e.g., 2 hours, 1 day, 30 minutes');
    });
  });

  describe('Form Validation', () => {
    it('shows error when title is empty', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Create Subtask' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('shows error when priority is invalid', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      const titleInput = screen.getByLabelText('Title');
      const priorityInput = screen.getByLabelText('Priority');
      
      await user.type(titleInput, 'Test Subtask');
      await user.clear(priorityInput);
      await user.type(priorityInput, '11');
      
      const submitButton = screen.getByRole('button', { name: 'Create Subtask' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Priority must be between 1 and 10')).toBeInTheDocument();
      });
    });

    it('shows error for recurring subtask without interval', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      const titleInput = screen.getByLabelText('Title');
      const recurringCheckbox = screen.getByLabelText('Recurring Subtask');
      
      await user.type(titleInput, 'Test Recurring Subtask');
      await user.click(recurringCheckbox);
      
      const submitButton = screen.getByRole('button', { name: 'Create Subtask' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Recurrence interval must be a positive number')).toBeInTheDocument();
      });
    });

    it('shows error for recurring subtask without due date', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      const titleInput = screen.getByLabelText('Title');
      const recurringCheckbox = screen.getByLabelText('Recurring Subtask');
      const intervalInput = screen.getByLabelText('Recurrence Interval (days)');
      
      await user.type(titleInput, 'Test Recurring Subtask');
      await user.click(recurringCheckbox);
      await user.type(intervalInput, '7');
      
      const submitButton = screen.getByRole('button', { name: 'Create Subtask' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Due date is required for recurring subtasks')).toBeInTheDocument();
      });
    });

    it('shows error when time taken exceeds max length', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      const titleInput = screen.getByLabelText('Title');
      const timeTakenInput = screen.getByLabelText('Time Taken');
      
      await user.type(titleInput, 'Test Subtask');
      await user.type(timeTakenInput, 'a'.repeat(101));
      
      const submitButton = screen.getByRole('button', { name: 'Create Subtask' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Time taken cannot exceed 100 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with correct data when form is valid', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      const titleInput = screen.getByLabelText('Title');
      const descriptionInput = screen.getByLabelText('Description');
      const priorityInput = screen.getByLabelText('Priority');
      const timeTakenInput = screen.getByLabelText('Time Taken');
      
      await user.type(titleInput, 'Test Subtask');
      await user.type(descriptionInput, 'Test Description');
      await user.clear(priorityInput);
      await user.type(priorityInput, '8');
      await user.type(timeTakenInput, '2 hours');
      
      const submitButton = screen.getByRole('button', { name: 'Create Subtask' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Subtask',
            description: 'Test Description',
            status: 'To Do',
            priority: 8,
            timeTaken: '2 hours',
            parentTaskId: 'parent-task-id',
            projectId: 'project-id',
            ownerId: 'owner-id'
          })
        );
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<SubtaskForm {...defaultProps} />);
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Create Subtask' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
      
      // Start typing in title field
      const titleInput = screen.getByLabelText('Title');
      await user.type(titleInput, 'T');
      
      await waitFor(() => {
        expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
      });
    });
  });
});

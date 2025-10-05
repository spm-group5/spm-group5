/**
 * Test Suite: Input Component
 *
 * Purpose: Validates the Input component functionality including labels, errors, and helper text
 *
 * Test Coverage:
 * - Input rendering with different props
 * - Label display and required indicator
 * - Error state and error message display
 * - Helper text display
 * - Custom className support
 * - Input value changes
 * - Different input types
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders input element', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with default value', () => {
      render(<Input defaultValue="Default text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('Default text');
    });

    it('renders with controlled value', () => {
      render(<Input value="Controlled value" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('Controlled value');
    });
  });

  describe('Label', () => {
    it('renders label when provided', () => {
      render(<Input label="Username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('does not render label when not provided', () => {
      const { container } = render(<Input />);
      const label = container.querySelector('label');
      expect(label).not.toBeInTheDocument();
    });

    it('associates label with input', () => {
      render(<Input label="Email" id="email-input" />);
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Email');
      expect(label.tagName).toBe('LABEL');
    });
  });

  describe('Required Indicator', () => {
    it('shows required asterisk when required is true', () => {
      render(<Input label="Name" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not show required asterisk when required is false', () => {
      const { container } = render(<Input label="Name" required={false} />);
      const asterisk = container.querySelector('.required');
      expect(asterisk).not.toBeInTheDocument();
    });

    it('does not show required asterisk by default', () => {
      const { container } = render(<Input label="Name" />);
      const asterisk = container.querySelector('.required');
      expect(asterisk).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when error prop is provided', () => {
      render(<Input label="Email" error="Invalid email format" />);
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    it('applies error class when error is present', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toMatch(/error/);
    });

    it('does not apply error class when no error', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('error');
    });

    it('error message has error styling', () => {
      const { container } = render(<Input error="Error text" />);
      const errorMessage = container.querySelector('.errorMessage');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Error text');
    });
  });

  describe('Helper Text', () => {
    it('displays helper text when provided', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('does not display helper text when error is present', () => {
      render(<Input helperText="Helper text" error="Error message" />);
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('displays helper text when no error', () => {
      render(<Input helperText="Helper text" />);
      expect(screen.getByText('Helper text')).toBeInTheDocument();
    });

    it('helper text has correct styling', () => {
      const { container } = render(<Input helperText="Help" />);
      const helperText = container.querySelector('.helperText');
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveTextContent('Help');
    });
  });

  describe('Input Types', () => {
    it('renders as text input by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders as email input', () => {
      render(<Input type="email" />);
      const input = document.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();
    });

    it('renders as password input', () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('renders as number input', () => {
      render(<Input type="number" />);
      const input = document.querySelector('input[type="number"]');
      expect(input).toBeInTheDocument();
    });

    it('renders as date input', () => {
      render(<Input type="date" />);
      const input = document.querySelector('input[type="date"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('allows user to type text', async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'Hello World');
      expect(input).toHaveValue('Hello World');
    });

    it('calls onChange handler when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'test');
      expect(handleChange).toHaveBeenCalled();
    });

    it('respects disabled state', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Custom Props', () => {
    it('applies custom className to input', () => {
      render(<Input className="custom-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input');
    });

    it('preserves default classes when custom className is provided', () => {
      render(<Input className="custom-input" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toMatch(/input/);
      expect(input).toHaveClass('custom-input');
    });

    it('forwards additional input attributes', () => {
      render(<Input maxLength={10} data-testid="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxlength', '10');
      expect(input).toHaveAttribute('data-testid', 'test-input');
    });
  });

  describe('Complete Input Structure', () => {
    it('renders with all props combined', () => {
      const { container } = render(
        <Input
          label="Email"
          required
          error="Invalid email"
          helperText="This should not show"
          placeholder="email@example.com"
          type="email"
          className="custom-input"
        />
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
      expect(screen.queryByText('This should not show')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();

      const input = container.querySelector('input[type="email"]');
      expect(input).toHaveClass('custom-input');
      expect(input.className).toMatch(/error/);
    });
  });
});

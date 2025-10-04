/**
 * Test Suite: Button Component
 *
 * Purpose: Validates the Button component functionality, variants, sizes, and interactions
 *
 * Test Coverage:
 * - Component rendering with different variants
 * - Component rendering with different sizes
 * - Disabled state behavior
 * - Click event handling
 * - Custom className support
 * - Different button types (button, submit, reset)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with children text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders with default variant (primary)', () => {
      render(<Button>Primary Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/primary/);
    });

    it('renders with secondary variant', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/secondary/);
    });

    it('renders with danger variant', () => {
      render(<Button variant="danger">Danger Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/danger/);
    });

    it('renders with ghost variant', () => {
      render(<Button variant="ghost">Ghost Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/ghost/);
    });

    it('renders with default size (medium)', () => {
      render(<Button>Medium Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/medium/);
    });

    it('renders with small size', () => {
      render(<Button size="small">Small Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/small/);
    });

    it('renders with large size', () => {
      render(<Button size="large">Large Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/large/);
    });
  });

  describe('Button Types', () => {
    it('renders with default type (button)', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('renders with submit type', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('renders with reset type', () => {
      render(<Button type="reset">Reset</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Disabled State', () => {
    it('renders as disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('applies disabled class when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/disabled/);
    });

    it('does not trigger onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Click Event Handling', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick handler multiple times on multiple clicks', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');

      await user.click(button);
      await user.click(button);
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('preserves default classes when custom className is provided', () => {
      render(<Button className="custom-class" variant="primary">Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/button/);
      expect(button.className).toMatch(/primary/);
      expect(button).toHaveClass('custom-class');
    });

    it('forwards additional props to button element', () => {
      render(<Button data-testid="custom-button" aria-label="Custom Label">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-testid', 'custom-button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
    });
  });

  describe('Combined Props', () => {
    it('renders correctly with multiple props combined', () => {
      const handleClick = vi.fn();
      render(
        <Button
          variant="danger"
          size="large"
          onClick={handleClick}
          className="custom-btn"
        >
          Delete
        </Button>
      );
      const button = screen.getByRole('button');

      expect(button.className).toMatch(/danger/);
      expect(button.className).toMatch(/large/);
      expect(button).toHaveClass('custom-btn');
      expect(button).toHaveTextContent('Delete');
    });
  });
});

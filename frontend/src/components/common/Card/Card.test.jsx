/**
 * Test Suite: Card Component
 *
 * Purpose: Validates the Card component and its sub-components (Header, Body, Footer)
 *
 * Test Coverage:
 * - Main Card component rendering
 * - Card.Header sub-component
 * - Card.Body sub-component
 * - Card.Footer sub-component
 * - Hoverable state
 * - Clickable state
 * - Custom className support
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from './Card';

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('renders children content', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('applies base card class', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      expect(card.className).toMatch(/card/);
    });

    it('renders with custom className', () => {
      const { container } = render(<Card className="custom-card">Content</Card>);
      const card = container.firstChild;
      expect(card.className).toMatch(/card/);
      expect(card).toHaveClass('custom-card');
    });
  });

  describe('Hoverable Prop', () => {
    it('applies hoverable class when hoverable is true', () => {
      const { container } = render(<Card hoverable>Content</Card>);
      const card = container.firstChild;
      expect(card.className).toMatch(/hoverable/);
    });

    it('does not apply hoverable class when hoverable is false', () => {
      const { container } = render(<Card hoverable={false}>Content</Card>);
      const card = container.firstChild;
      expect(card.className).not.toMatch(/hoverable/);
    });

    it('does not apply hoverable class by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      expect(card.className).not.toMatch(/hoverable/);
    });
  });

  describe('Click Handling', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);
      const card = container.firstChild;

      await user.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies clickable class when onClick is provided', () => {
      const handleClick = vi.fn();
      const { container } = render(<Card onClick={handleClick}>Content</Card>);
      const card = container.firstChild;
      expect(card.className).toMatch(/clickable/);
    });

    it('does not apply clickable class when onClick is not provided', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      expect(card.className).not.toMatch(/clickable/);
    });
  });

  describe('Card.Header Sub-component', () => {
    it('renders header content', () => {
      render(
        <Card>
          <Card.Header>Header Content</Card.Header>
        </Card>
      );
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('applies header class', () => {
      const { container } = render(
        <Card>
          <Card.Header>Header</Card.Header>
        </Card>
      );
      const header = container.querySelector('[class*="header"]');
      expect(header).toBeInTheDocument();
    });

    it('applies custom className to header', () => {
      const { container } = render(
        <Card>
          <Card.Header className="custom-header">Header</Card.Header>
        </Card>
      );
      const header = container.querySelector('[class*="header"]');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('Card.Body Sub-component', () => {
    it('renders body content', () => {
      render(
        <Card>
          <Card.Body>Body Content</Card.Body>
        </Card>
      );
      expect(screen.getByText('Body Content')).toBeInTheDocument();
    });

    it('applies body class', () => {
      const { container } = render(
        <Card>
          <Card.Body>Body</Card.Body>
        </Card>
      );
      const body = container.querySelector('[class*="body"]');
      expect(body).toBeInTheDocument();
    });

    it('applies custom className to body', () => {
      const { container } = render(
        <Card>
          <Card.Body className="custom-body">Body</Card.Body>
        </Card>
      );
      const body = container.querySelector('[class*="body"]');
      expect(body).toHaveClass('custom-body');
    });
  });

  describe('Card.Footer Sub-component', () => {
    it('renders footer content', () => {
      render(
        <Card>
          <Card.Footer>Footer Content</Card.Footer>
        </Card>
      );
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('applies footer class', () => {
      const { container } = render(
        <Card>
          <Card.Footer>Footer</Card.Footer>
        </Card>
      );
      const footer = container.querySelector('[class*="footer"]');
      expect(footer).toBeInTheDocument();
    });

    it('applies custom className to footer', () => {
      const { container } = render(
        <Card>
          <Card.Footer className="custom-footer">Footer</Card.Footer>
        </Card>
      );
      const footer = container.querySelector('[class*="footer"]');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Complete Card Structure', () => {
    it('renders all sub-components together', () => {
      render(
        <Card>
          <Card.Header>Title</Card.Header>
          <Card.Body>Content goes here</Card.Body>
          <Card.Footer>Actions</Card.Footer>
        </Card>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Content goes here')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders with all props combined', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <Card hoverable onClick={handleClick} className="custom-card">
          <Card.Header className="custom-header">Header</Card.Header>
          <Card.Body>Body</Card.Body>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toMatch(/card/);
      expect(card.className).toMatch(/hoverable/);
      expect(card.className).toMatch(/clickable/);
      expect(card).toHaveClass('custom-card');

      await user.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});

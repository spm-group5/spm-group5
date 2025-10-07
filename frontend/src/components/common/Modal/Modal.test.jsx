import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Test Modal',
    message: 'This is a test message',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('This is a test message')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('should render with custom button text', () => {
      render(
        <Modal
          {...defaultProps}
          confirmText="Archive"
          cancelText="Go Back"
        />
      );

      expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    });

    it('should render with default button text', () => {
      const { confirmText, cancelText, ...propsWithoutText } = defaultProps;
      render(<Modal {...propsWithoutText} />);

      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await user.click(confirmButton);

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      const { container } = render(<Modal {...defaultProps} />);

      const overlay = container.querySelector('[class*="overlay"]');
      await user.click(overlay);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const modal = screen.getByText('Test Modal').closest('[class*="modal"]');
      await user.click(modal);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should apply danger variant to confirm button', () => {
      render(<Modal {...defaultProps} variant="danger" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton.className).toMatch(/danger/);
    });

    it('should apply warning variant to confirm button', () => {
      render(<Modal {...defaultProps} variant="warning" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton.className).toMatch(/warning/);
    });

    it('should apply primary variant to confirm button', () => {
      render(<Modal {...defaultProps} variant="primary" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton.className).toMatch(/primary/);
    });

    it('should default to danger variant', () => {
      const { variant, ...propsWithoutVariant } = defaultProps;
      render(<Modal {...propsWithoutVariant} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton.className).toMatch(/danger/);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label on close button', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    it('should prevent body scroll when open', () => {
      render(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('unset');
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Content', () => {
    it('should display the provided title', () => {
      render(<Modal {...defaultProps} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should display the provided message', () => {
      render(<Modal {...defaultProps} message="Custom message content" />);

      expect(screen.getByText('Custom message content')).toBeInTheDocument();
    });

    it('should render long messages correctly', () => {
      const longMessage = 'This is a very long message that should still be displayed correctly in the modal. '.repeat(10);
      render(<Modal {...defaultProps} message={longMessage} />);

      // Check for partial text instead of exact match
      expect(screen.getByText(/This is a very long message/)).toBeInTheDocument();
    });
  });
});

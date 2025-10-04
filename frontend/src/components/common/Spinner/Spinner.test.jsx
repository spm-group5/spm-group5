/**
 * Test Suite: Spinner Component
 *
 * Purpose: Validates the Spinner component rendering with different sizes and centering options
 *
 * Test Coverage:
 * - Spinner rendering
 * - Different sizes (small, medium, large)
 * - Center positioning
 * - Custom className support
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Spinner from './Spinner';

describe('Spinner Component', () => {
  describe('Basic Rendering', () => {
    it('renders spinner element', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
    });

    it('renders circle element inside spinner', () => {
      const { container } = render(<Spinner />);
      const circle = container.querySelector('[class*="circle"]');
      expect(circle).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders with default size (medium)', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner.className).toMatch(/medium/);
    });

    it('renders with small size', () => {
      const { container } = render(<Spinner size="small" />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner.className).toMatch(/small/);
    });

    it('renders with medium size', () => {
      const { container } = render(<Spinner size="medium" />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner.className).toMatch(/medium/);
    });

    it('renders with large size', () => {
      const { container } = render(<Spinner size="large" />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner.className).toMatch(/large/);
    });
  });

  describe('Center Positioning', () => {
    it('does not apply center class by default', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner.className).not.toMatch(/center/);
    });

    it('applies center class when center is true', () => {
      const { container } = render(<Spinner center />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner.className).toMatch(/center/);
    });

    it('does not apply center class when center is false', () => {
      const { container } = render(<Spinner center={false} />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner.className).not.toMatch(/center/);
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(<Spinner className="custom-spinner" />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toHaveClass('custom-spinner');
    });

    it('preserves default classes when custom className is provided', () => {
      const { container } = render(<Spinner className="custom-spinner" size="large" />);
      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner.className).toMatch(/spinner/);
      expect(spinner.className).toMatch(/large/);
      expect(spinner).toHaveClass('custom-spinner');
    });
  });

  describe('Combined Props', () => {
    it('renders correctly with multiple props combined', () => {
      const { container } = render(
        <Spinner size="small" center className="loading-spinner" />
      );
      const spinner = container.querySelector('[class*="spinner"]');

      expect(spinner.className).toMatch(/spinner/);
      expect(spinner.className).toMatch(/small/);
      expect(spinner.className).toMatch(/center/);
      expect(spinner).toHaveClass('loading-spinner');
    });
  });

  describe('Structure Validation', () => {
    it('has correct nested structure', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('[class*="spinner"]');
      const circle = spinner?.querySelector('.circle');

      expect(spinner).toBeInTheDocument();
      expect(circle).toBeInTheDocument();
      expect(circle?.parentElement).toBe(spinner);
    });
  });
});

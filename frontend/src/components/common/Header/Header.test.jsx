/**
 * Test Suite: Header Component
 *
 * Purpose: Validates the Header navigation component functionality
 *
 * Test Coverage:
 * - Header rendering
 * - Navigation links display
 * - User information display
 * - Logout functionality
 * - Authentication context integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';
import { AuthContext } from '../../../context/AuthContext';

// Mock the AuthContext
const mockLogout = vi.fn();

const renderWithRouter = (component, authValue) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders the header element', () => {
      const authValue = {
        user: { name: 'John Doe', email: 'john@example.com' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders the logo/brand name', () => {
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      expect(screen.getByRole('heading', { name: 'TaskManager' })).toBeInTheDocument();
    });

    it('logo links to dashboard', () => {
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      const logoLink = screen.getByRole('heading', { name: 'TaskManager' }).closest('a');
      expect(logoLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Navigation Links', () => {
    it('renders Dashboard link', () => {
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('renders Tasks link', () => {
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      const tasksLink = screen.getByRole('link', { name: 'Tasks' });
      expect(tasksLink).toBeInTheDocument();
      expect(tasksLink).toHaveAttribute('href', '/tasks');
    });

    it('renders Projects link', () => {
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      const projectsLink = screen.getByRole('link', { name: 'Projects' });
      expect(projectsLink).toBeInTheDocument();
      expect(projectsLink).toHaveAttribute('href', '/projects');
    });

    it('renders all three navigation links', () => {
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Tasks' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('displays user name when available', () => {
      const authValue = {
        user: { name: 'John Doe', email: 'john@example.com' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays user email when name is not available', () => {
      const authValue = {
        user: { email: 'john@example.com' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('prefers user name over email when both are available', () => {
      const authValue = {
        user: { name: 'John Doe', email: 'john@example.com' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('renders logout button', () => {
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('calls logout function when logout button is clicked', async () => {
      const user = userEvent.setup();
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      const logoutButton = screen.getByRole('button', { name: 'Logout' });

      await user.click(logoutButton);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('logout button has correct variant and size', () => {
      const authValue = {
        user: { name: 'John Doe' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      // CSS modules hash the class names, so we check if the class name contains the pattern
      expect(logoutButton.className).toMatch(/ghost/);
      expect(logoutButton.className).toMatch(/small/);
    });
  });

  describe('Component Structure', () => {
    it('renders complete header structure', () => {
      const authValue = {
        user: { name: 'John Doe', email: 'john@example.com' },
        logout: mockLogout
      };

      renderWithRouter(<Header />, authValue);

      // Check all major sections are present
      expect(screen.getByRole('heading', { name: 'TaskManager' })).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
  });
});

/**
 * Test Suite: LoginPage
 *
 * Purpose: Validates the LoginPage component authentication flow
 *
 * Test Coverage:
 * - Page rendering
 * - Form field inputs
 * - Form validation
 * - Login submission
 * - Error handling
 * - Redirect on successful authentication
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthContext } from '../context/AuthContext';

const mockLogin = vi.fn();

const renderWithRouter = (component, authValue) => {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext.Provider value={authValue}>
        {component}
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockClear();
  });

  describe('Page Rendering', () => {
    it('renders login page', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      expect(screen.getByRole('heading', { name: 'Task Management System' })).toBeInTheDocument();
    });

    it('displays subtitle', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('renders login form', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('username field has correct type', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const usernameInput = screen.getByLabelText(/Username/i);
      expect(usernameInput).toHaveAttribute('type', 'text');
    });

    it('password field has correct type', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const passwordInput = screen.getByLabelText(/Password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('both fields show required indicator', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      // Check that required asterisks are visible
      const asterisks = screen.getAllByText('*');
      expect(asterisks.length).toBeGreaterThanOrEqual(2);
    });

    it('allows typing in username field', async () => {
      const user = userEvent.setup();
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const usernameInput = screen.getByLabelText(/Username/i);

      await user.type(usernameInput, 'testuser');
      expect(usernameInput).toHaveValue('testuser');
    });

    it('allows typing in password field', async () => {
      const user = userEvent.setup();
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(passwordInput, 'password123');
      expect(passwordInput).toHaveValue('password123');
    });
  });

  describe('Form Validation', () => {
    it('shows error when submitting empty form', async () => {
      const user = userEvent.setup();
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.click(submitButton);

      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows error when username is empty', async () => {
      const user = userEvent.setup();
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows error when password is empty', async () => {
      const user = userEvent.setup();
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const usernameInput = screen.getByLabelText(/Username/i);
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.type(usernameInput, 'testuser');
      await user.click(submitButton);

      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('clears form error when user starts typing', async () => {
      const user = userEvent.setup();
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const usernameInput = screen.getByLabelText(/Username/i);
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.click(submitButton);
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();

      await user.type(usernameInput, 't');
      expect(screen.queryByText('Please fill in all fields')).not.toBeInTheDocument();
    });
  });

  describe('Login Submission', () => {
    it('calls login with username and password', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ success: true });

      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const usernameInput = screen.getByLabelText(/Username/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
      });
    });

    it('displays error message on failed login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const usernameInput = screen.getByLabelText(/Username/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.type(usernameInput, 'wronguser');
      await user.type(passwordInput, 'wrongpass');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('displays error from AuthContext', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: 'Network error'
      };

      renderWithRouter(<LoginPage />, authValue);
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('prefers form error over context error', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Login failed'
      });

      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: 'Old error'
      };

      renderWithRouter(<LoginPage />, authValue);
      const usernameInput = screen.getByLabelText(/Username/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.type(usernameInput, 'user');
      await user.type(passwordInput, 'pass');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
        expect(screen.queryByText('Old error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading text when submitting', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: true,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument();
    });

    it('disables submit button when loading', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: true,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const submitButton = screen.getByRole('button', { name: 'Signing in...' });
      expect(submitButton).toBeDisabled();
    });

    it('shows Sign In text when not loading', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });
  });

  describe('Authentication Redirect', () => {
    it('redirects to dashboard when already authenticated', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: true,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);

      // When authenticated, the login form should not be rendered
      expect(screen.queryByLabelText(/Username/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    it('submit button has correct variant and size', () => {
      const authValue = {
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: null
      };

      renderWithRouter(<LoginPage />, authValue);
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      // CSS modules hash the class names, so we check if the class name contains the pattern
      expect(submitButton.className).toMatch(/primary/);
      expect(submitButton.className).toMatch(/large/);
    });
  });
});

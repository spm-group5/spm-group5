import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = !!user;

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getProfile();
      // Fix: Extract user data from the nested user object
      setUser(response.user || response.data || response);
    } catch (err) {
      setUser(null);
      // Silently handle 401 errors - user is not authenticated yet
      if (err.status === 401) {
        // Expected behavior: user is not authenticated, don't set error state
        return;
      }
      // Only set error for unexpected failures
      if (err.message !== 'Unauthorized') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.login({ username, password });
      const response = await apiService.getProfile();
      // Fix: Extract user data from the nested user object
      setUser(response.user || response.data || response);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.register(userData);
      setUser(response.data || response);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiService.logout();
    } catch (err) {
      setError(err.message);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    register,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
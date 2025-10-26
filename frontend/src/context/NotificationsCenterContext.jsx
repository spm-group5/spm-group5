import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext';

const NotificationCenterContext = createContext();

export function NotificationCenterProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getNotifications(filters);
      // api.request returns parsed JSON (service may return { success, data } or raw array)
      // normalize: if object with data use data, else use as-is
      const payload = (data && data.data) ? data.data : data;
      setNotifications(Array.isArray(payload) ? payload : []);
      return { success: true };
    } catch (err) {
      // Silently fail on 401 - user is not authenticated
      if (err.status === 401) {
        setNotifications([]);
        return { success: false, error: 'Not authenticated' };
      }
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, read: true } : n));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await fetchNotifications();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter(n => n._id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Only fetch notifications when authenticated and auth check is complete
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchNotifications();
    } else if (!isAuthenticated) {
      // Clear notifications when user logs out
      setNotifications([]);
    }
  }, [isAuthenticated, authLoading, fetchNotifications]);

  const value = {
    notifications,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteNotification
  };

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) throw new Error('useNotificationCenter must be used inside NotificationCenterProvider');
  return ctx;
}
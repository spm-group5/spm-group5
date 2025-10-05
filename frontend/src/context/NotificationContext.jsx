import { createContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, [removeNotification]); // Now removeNotification is defined above

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      addNotification, 
      removeNotification 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export { NotificationContext };
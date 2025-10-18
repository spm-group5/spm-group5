import { createContext, useContext, useState, useCallback } from 'react';
import apiService from '../services/api';

export const TaskContext = createContext();

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTasks(filters);
      setTasks(response.data || response);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = async (taskData) => {
    try {
      setError(null);
      const response = await apiService.createTask(taskData);
      const newTask = response.data || response;
      setTasks(prevTasks => [...prevTasks, newTask]);
      return { success: true, data: newTask };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateTask = async (taskId, taskData) => {
    try {
      setError(null);
      const response = await apiService.updateTask(taskId, taskData);
      const updatedTask = response.data || response;

      // Fetch the updated task again to ensure we have all populated fields
      const freshTaskResponse = await apiService.getTaskById(taskId);
      const freshTask = freshTaskResponse.data || freshTaskResponse;

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task._id === taskId ? freshTask : task
        )
      );
      return { success: true, data: freshTask };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const archiveTask = async (taskId) => {
    try {
      setError(null);
      const response = await apiService.archiveTask(taskId);
      const archivedTask = response.data || response;

      // Update task in state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task._id === taskId ? archivedTask : task
        )
      );
      return { success: true, data: archivedTask };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const unarchiveTask = async (taskId) => {
    try {
      setError(null);
      const response = await apiService.unarchiveTask(taskId);
      const unarchivedTask = response.data || response;

      // Update task in state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task._id === taskId ? unarchivedTask : task
        )
      );
      return { success: true, data: unarchivedTask };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const deleteTask = async (taskId) => {
    try {
      setError(null);
      await apiService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const getTaskById = async (taskId) => {
    try {
      setError(null);
      const response = await apiService.getTaskById(taskId);
      return { success: true, data: response.data || response };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  /**
   * Fetch tasks for a specific project
   *
   * Purpose: Retrieves all tasks belonging to a specific project
   *
   * Key Features:
   * - Fetches tasks only if user has viewing permissions
   * - Preserves error status codes for proper UI error handling
   * - Returns standardized response object
   *
   * Parameters:
   * - projectId: The ID of the project to fetch tasks for
   *
   * Returns:
   * - success: Boolean indicating if fetch was successful
   * - data: Array of tasks if successful
   * - error: Error message and status if failed
   */
  const fetchTasksByProject = useCallback(async (projectId) => {
    try {
      setError(null);
      const response = await apiService.getTasksByProject(projectId);
      return { success: true, data: response.data || response };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
        status: err.status
      };
    }
  }, []);

  const value = {
    tasks,
    loading,
    error,
    fetchTasks,
    fetchTasksByProject,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    archiveTask,
    unarchiveTask,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
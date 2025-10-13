import { createContext, useContext, useState, useCallback } from 'react';
import apiService from '../services/api.js';

const SubtaskContext = createContext();

export const useSubtasks = () => {
  const context = useContext(SubtaskContext);
  if (!context) {
    throw new Error('useSubtasks must be used within a SubtaskProvider');
  }
  return context;
};

export const SubtaskProvider = ({ children }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch subtasks by parent task ID
  const fetchSubtasksByParentTask = useCallback(async (parentTaskId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getSubtasksByParentTask(parentTaskId);
      if (response.success) {
        setSubtasks(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch subtasks');
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while fetching subtasks';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch subtasks by project ID
  const fetchSubtasksByProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getSubtasksByProject(projectId);
      if (response.success) {
        setSubtasks(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch subtasks');
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while fetching subtasks';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new subtask
  const createSubtask = useCallback(async (subtaskData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.createSubtask(subtaskData);
      if (response.success) {
        setSubtasks(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create subtask');
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while creating subtask';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a subtask
  const updateSubtask = useCallback(async (subtaskId, updateData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.updateSubtask(subtaskId, updateData);
      if (response.success) {
        setSubtasks(prev =>
          prev.map(subtask =>
            subtask._id === subtaskId ? response.data : subtask
          )
        );
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update subtask');
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while updating subtask';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete (archive) a subtask
  const deleteSubtask = useCallback(async (subtaskId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.deleteSubtask(subtaskId);
      if (response.success) {
        setSubtasks(prev => prev.filter(subtask => subtask._id !== subtaskId));
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete subtask');
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while deleting subtask';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    subtasks,
    loading,
    error,
    fetchSubtasksByParentTask,
    fetchSubtasksByProject,
    createSubtask,
    updateSubtask,
    deleteSubtask,
  };

  return (
    <SubtaskContext.Provider value={value}>
      {children}
    </SubtaskContext.Provider>
  );
};


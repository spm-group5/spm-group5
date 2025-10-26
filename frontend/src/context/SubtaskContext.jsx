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
      console.log('=== FETCHING SUBTASKS FOR PARENT TASK ===');
      console.log('Parent Task ID:', parentTaskId);
      
      const [activeResponse, archivedResponse] = await Promise.all([
        apiService.getSubtasksByParentTask(parentTaskId),
        apiService.getArchivedSubtasksByParentTask(parentTaskId)
      ]);
      
      console.log('Active response:', activeResponse);
      console.log('Archived response:', archivedResponse);
      
      if (activeResponse.success && archivedResponse.success) {
        const allSubtasks = [...activeResponse.data, ...archivedResponse.data];
        console.log('All subtasks (active + archived):', allSubtasks);
        console.log('Active subtasks count:', activeResponse.data.length);
        console.log('Archived subtasks count:', archivedResponse.data.length);
        
        // Log each subtask's details
        allSubtasks.forEach((subtask, index) => {
          console.log(`Subtask ${index + 1}:`, {
            title: subtask.title,
            timeTaken: subtask.timeTaken,
            parentTaskId: subtask.parentTaskId,
            archived: subtask.archived
          });
        });
        
        setSubtasks(allSubtasks);
        return allSubtasks;
      } else {
        throw new Error('Failed to fetch subtasks');
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

  // Archive a subtask
  const archiveSubtask = useCallback(async (subtaskId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.archiveSubtask(subtaskId);
      if (response.success) {
        setSubtasks(prev =>
          prev.map(subtask =>
            subtask._id === subtaskId 
              ? { ...subtask, archived: true, archivedAt: new Date() }
              : subtask
          )
        );
        return true;
      } else {
        throw new Error(response.message || 'Failed to archive subtask');
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while archiving subtask';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Unarchive a subtask
  const unarchiveSubtask = useCallback(async (subtaskId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.unarchiveSubtask(subtaskId);
      if (response.success) {
        setSubtasks(prev =>
          prev.map(subtask =>
            subtask._id === subtaskId 
              ? { ...subtask, archived: false, archivedAt: null }
              : subtask
          )
        );
        return true;
      } else {
        throw new Error(response.message || 'Failed to unarchive subtask');
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while unarchiving subtask';
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
    archiveSubtask,
    unarchiveSubtask,
  };

  return (
    <SubtaskContext.Provider value={value}>
      {children}
    </SubtaskContext.Provider>
  );
};


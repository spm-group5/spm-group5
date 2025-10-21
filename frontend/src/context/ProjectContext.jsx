import { createContext, useContext, useState, useCallback } from 'react';
import apiService from '../services/api';

export const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getProjects();
      setProjects(response.data || response);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = async (projectData) => {
    try {
      setError(null);
      const response = await apiService.createProject(projectData);
      const newProject = response.data || response;
      setProjects(prevProjects => [...prevProjects, newProject]);
      return { success: true, data: newProject };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateProject = async (projectId, projectData) => {
    try {
      setError(null);
      const response = await apiService.updateProject(projectId, projectData);
      const updatedProject = response.data || response;
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project._id === projectId ? updatedProject : project
        )
      );
      return { success: true, data: updatedProject };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const deleteProject = async (projectId) => {
    try {
      setError(null);
      await apiService.deleteProject(projectId);
      setProjects(prevProjects => prevProjects.filter(project => project._id !== projectId));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const archiveProject = async (projectId) => {
    try {
      setError(null);
      const response = await apiService.archiveProject(projectId);
      const archivedProject = response.data || response;
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project._id === projectId ? archivedProject : project
        )
      );
      return { success: true, data: archivedProject };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const unarchiveProject = async (projectId) => {
    try {
      setError(null);
      const response = await apiService.unarchiveProject(projectId);
      const unarchivedProject = response.data || response;
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project._id === projectId ? unarchivedProject : project
        )
      );
      return { success: true, data: unarchivedProject };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const getProjectById = async (projectId) => {
    try {
      setError(null);
      const response = await apiService.getProjectById(projectId);
      return { success: true, data: response.data || response };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const value = {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    getProjectById,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
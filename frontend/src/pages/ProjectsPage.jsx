import { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Spinner from '../components/common/Spinner/Spinner';
import ProjectCard from '../components/projects/ProjectCard/ProjectCard';
import ProjectForm from '../components/projects/ProjectForm/ProjectForm';
import styles from './ProjectsPage.module.css';

function ProjectsPage() {
  const { projects, loading, error, fetchProjects, createProject, updateProject, deleteProject } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      await deleteProject(projectId);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingProject) {
        await updateProject(editingProject._id, formData);
      } else {
        await createProject(formData);
      }
      setShowForm(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Error saving project:', err);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  if (loading && projects.length === 0) {
    return (
      <div>
        <Header />
        <div className="container flex justify-center items-center" style={{ minHeight: '400px' }}>
          <Spinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className={`container ${styles.page}`}>
        {showForm ? (
          <ProjectForm
            project={editingProject}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        ) : (
          <>
            <div className={styles.header}>
              <h1>Projects</h1>
              <Button variant="primary" onClick={handleCreateProject}>
                New Project
              </Button>
            </div>

            {error && (
              <div className={styles.error}>
                Error: {error}
              </div>
            )}

            {projects.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No projects yet</h3>
                <p>Create your first project to get started!</p>
                <Button variant="primary" onClick={handleCreateProject}>
                  Create Project
                </Button>
              </div>
            ) : (
              <div className={styles.projectGrid}>
                {projects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;
import { useState, useEffect, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Spinner from '../components/common/Spinner/Spinner';
import ProjectCard from '../components/projects/ProjectCard/ProjectCard';
import ProjectForm from '../components/projects/ProjectForm/ProjectForm';
import styles from './ProjectsPage.module.css';

function ProjectsPage() {
  const { projects, loading, error, fetchProjects, createProject, updateProject, archiveProject, unarchiveProject } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [sortBy, setSortBy] = useState('dateCreated');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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

  const handleArchiveProject = async (projectId) => {
    if (window.confirm('Are you sure you want to archive this project? All tasks in this project will also be archived.')) {
      await archiveProject(projectId);
    }
  };

  const handleUnarchiveProject = async (projectId) => {
    if (window.confirm('Are you sure you want to unarchive this project? All tasks in this project will also be unarchived.')) {
      await unarchiveProject(projectId);
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

  // Get all unique tags from all projects
  const availableTags = useMemo(() => {
    const tagsSet = new Set();
    projects.forEach(project => {
      if (project.tags && Array.isArray(project.tags)) {
        project.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [projects]);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply status filter
    if (filterStatus === 'archived') {
      filtered = filtered.filter(project => project.archived);
    } else if (filterStatus !== 'all') {
      filtered = filtered.filter(project => !project.archived && project.status === filterStatus);
    } else {
      // Show non-archived projects by default when 'all' is selected
      filtered = filtered.filter(project => !project.archived);
    }

    // Apply tag filter
    if (filterTag) {
      filtered = filtered.filter(project => {
        if (!project.tags) return false;
        return project.tags.includes(filterTag);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          // Higher priority (10) should come first
          return (b.priority || 0) - (a.priority || 0);

        case 'dueDate':
          // Tasks with no due date go to the end
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);

        case 'dateCreated':
          // Most recent first
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

        case 'name':
          return (a.name || '').localeCompare(b.name || '');

        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, sortBy, filterTag, filterStatus]);

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

            {projects.length > 0 && (
              <>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${filterStatus === 'all' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('all')}
                  >
                    All
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'To Do' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('To Do')}
                  >
                    To Do
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'In Progress' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('In Progress')}
                  >
                    In Progress
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'Completed' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('Completed')}
                  >
                    Completed
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'Blocked' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('Blocked')}
                  >
                    Blocked
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'archived' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('archived')}
                  >
                    Archived
                  </button>
                </div>

                <div className={styles.viewToggle}>
                  <button
                    className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    ▦ Grid View
                  </button>
                  <button
                    className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    ☰ List View
                  </button>
                </div>

                <div className={styles.filterSection}>
                  <div className={styles.filterGroup}>
                    <label htmlFor="sortBy" className={styles.filterLabel}>Sort by:</label>
                    <select
                      id="sortBy"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="dateCreated">Date Created (Newest First)</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="priority">Priority (High to Low)</option>
                      <option value="dueDate">Due Date (Nearest First)</option>
                    </select>
                  </div>

                  {availableTags.length > 0 && (
                    <div className={styles.filterGroup}>
                      <label htmlFor="filterTag" className={styles.filterLabel}>Filter by tag:</label>
                      <select
                        id="filterTag"
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        className={styles.filterSelect}
                      >
                        <option value="">All Tags</option>
                        {availableTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(filterTag) && (
                    <button
                      onClick={() => {
                        setFilterTag('');
                      }}
                      className={styles.clearFilters}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </>
            )}

            {projects.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No projects yet</h3>
                <p>Create your first project to get started!</p>
                <Button variant="primary" onClick={handleCreateProject}>
                  Create Project
                </Button>
              </div>
            ) : filteredAndSortedProjects.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No projects match your filters</h3>
                <p>Try adjusting your filters or create a new project.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? styles.projectGrid : styles.projectList}>
                {filteredAndSortedProjects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    canViewTasks={project.canViewTasks}
                    onEdit={handleEditProject}
                    onArchive={handleArchiveProject}
                    onUnarchive={handleUnarchiveProject}
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
import { useState, useEffect, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Spinner from '../components/common/Spinner/Spinner';
import ProjectCard from '../components/projects/ProjectCard/ProjectCard';
import ProjectForm from '../components/projects/ProjectForm/ProjectForm';
import styles from './ProjectsPage.module.css';

function ProjectsPage() {
  const { projects, loading, error, fetchProjects, createProject, updateProject, archiveProject, unarchiveProject } = useProjects();
  const { user } = useAuth();
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
    <div className={styles.pageWrapper}>
      <Header />

      {/* Animated background elements */}
      <div className={styles.backgroundShapes}>
        <div className={styles.shape1}></div>
        <div className={styles.shape2}></div>
        <div className={styles.shape3}></div>
      </div>

      <div className={`container ${styles.page}`}>
        {showForm ? (
          <div className={styles.formContainer}>
            <ProjectForm
              project={editingProject}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        ) : (
          <>
            {/* Modern Header with Icon */}
            <div className={styles.header}>
              <div className={styles.headerContent}>
                <div className={styles.headerIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.headerText}>
                  <h1>Project Management</h1>
                  <p className={styles.headerSubtitle}>
                    Organize and oversee your projects efficiently
                  </p>
                </div>
              </div>
              <Button variant="primary" onClick={handleCreateProject} className={styles.createButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                New Project
              </Button>
            </div>

            {error && (
              <div className={styles.error}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {error}
              </div>
            )}

            {projects.length > 0 && (
              <>
                {/* Modern Tabs with Icons */}
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${filterStatus === 'all' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('all')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    All
                    <span className={styles.tabCount}>
                      {projects.filter(p => !p.archived).length}
                    </span>
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'To Do' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('To Do')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    To Do
                    <span className={styles.tabCount}>
                      {projects.filter(p => !p.archived && p.status === 'To Do').length}
                    </span>
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'In Progress' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('In Progress')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    In Progress
                    <span className={styles.tabCount}>
                      {projects.filter(p => !p.archived && p.status === 'In Progress').length}
                    </span>
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'Completed' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('Completed')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Completed
                    <span className={styles.tabCount}>
                      {projects.filter(p => !p.archived && p.status === 'Completed').length}
                    </span>
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'Blocked' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('Blocked')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Blocked
                    <span className={styles.tabCount}>
                      {projects.filter(p => !p.archived && p.status === 'Blocked').length}
                    </span>
                  </button>
                  <button
                    className={`${styles.tab} ${filterStatus === 'archived' ? styles.activeTab : ''}`}
                    onClick={() => setFilterStatus('archived')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Archived
                    <span className={styles.tabCount}>
                      {projects.filter(p => p.archived).length}
                    </span>
                  </button>
                </div>

                {/* Modern View Toggle and Result Count */}
                <div className={styles.controlsBar}>
                  <div className={styles.viewToggle}>
                    <button
                      className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                      onClick={() => setViewMode('grid')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Grid
                    </button>
                    <button
                      className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                      onClick={() => setViewMode('list')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      List
                    </button>
                  </div>

                  <div className={styles.resultCount}>
                    {filteredAndSortedProjects.length} {filteredAndSortedProjects.length === 1 ? 'project' : 'projects'}
                  </div>
                </div>

                {/* Modern Filter Section */}
                <div className={styles.filterSection}>
                  <div className={styles.filterHeader}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3>Filters & Sorting</h3>
                  </div>

                  <div className={styles.filterGrid}>
                    <div className={styles.filterGroup}>
                      <label htmlFor="sortBy" className={styles.filterLabel}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Sort by
                      </label>
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
                        <label htmlFor="filterTag" className={styles.filterLabel}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Filter by tag
                        </label>
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

                    {filterTag && (
                      <button
                        onClick={() => setFilterTag('')}
                        className={styles.clearFilters}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {projects.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.emptyStateTitle}>No projects yet</h3>
                <p className={styles.emptyStateText}>Create your first project to start organizing your work!</p>
                <Button variant="primary" onClick={handleCreateProject} size="large">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Create Your First Project
                </Button>
              </div>
            ) : filteredAndSortedProjects.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.emptyStateTitle}>No projects match your filters</h3>
                <p className={styles.emptyStateText}>Try adjusting your filters or create a new project.</p>
                <button
                  onClick={() => setFilterTag('')}
                  className={styles.clearFiltersButton}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? styles.projectGrid : styles.projectList}>
                {filteredAndSortedProjects.map((project, index) => (
                  <div
                    key={project._id}
                    className={styles.projectCardWrapper}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <ProjectCard
                      project={project}
                      canViewTasks={project.canViewTasks}
                      currentUser={user}
                      onEdit={handleEditProject}
                      onArchive={handleArchiveProject}
                      onUnarchive={handleUnarchiveProject}
                    />
                  </div>
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
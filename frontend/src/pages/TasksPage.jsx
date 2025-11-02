import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Spinner from '../components/common/Spinner/Spinner';
import TaskCard from '../components/tasks/TaskCard/TaskCard';
import TaskForm from '../components/tasks/TaskForm/TaskForm';
import Modal from '../components/common/Modal/Modal';
import styles from './TasksPage.module.css';

function TasksPage() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, archiveTask, unarchiveTask } = useTasks();
  const { fetchProjects } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [sortBy, setSortBy] = useState('priority');
  const [filterTag, setFilterTag] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'done', or 'archived'
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [taskToArchive, setTaskToArchive] = useState(null);
  const taskRefs = useRef({});

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  // Auto-scroll and expand task from URL parameter
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks.length > 0 && taskRefs.current[taskId]) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        taskRefs.current[taskId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        // Clear the URL parameter after scrolling
        setSearchParams({});
      }, 300);
    }
  }, [searchParams, tasks, setSearchParams]);

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleArchiveTask = (taskId) => {
    setTaskToArchive(taskId);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    if (taskToArchive) {
      await archiveTask(taskToArchive);
      setShowArchiveModal(false);
      setTaskToArchive(null);
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setTaskToArchive(null);
  };

  const handleUnarchiveTask = async (taskId) => {
    await unarchiveTask(taskId);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingTask) {
        await updateTask(editingTask._id, formData);
      } else {
        await createTask(formData);
      }
      setShowForm(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  // Get all unique tags from all tasks
  const availableTags = useMemo(() => {
    const tagsSet = new Set();
    tasks.forEach(task => {
      if (task.tags) {
        const taskTags = task.tags.split('#').map(tag => tag.trim()).filter(Boolean);
        taskTags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [tasks]);

  // Get all unique projects from all tasks
  const availableProjects = useMemo(() => {
    const projectsSet = new Set();
    tasks.forEach(task => {
      if (task.project) {
        const projectName = typeof task.project === 'object' ? task.project.name : task.project;
        if (projectName) projectsSet.add(projectName);
      }
    });
    return Array.from(projectsSet).sort();
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply tab filter
    if (activeTab === 'active') {
      filtered = filtered.filter(task => !task.archived && task.status !== 'Completed');
    } else if (activeTab === 'done') {
      filtered = filtered.filter(task => !task.archived && task.status === 'Completed');
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(task => task.archived);
    }

    // Apply tag filter
    if (filterTag) {
      filtered = filtered.filter(task => {
        if (!task.tags) return false;
        const taskTags = task.tags.split('#').map(tag => tag.trim()).filter(Boolean);
        return taskTags.includes(filterTag);
      });
    }

    // Apply project filter
    if (filterProject) {
      filtered = filtered.filter(task => {
        if (!task.project) return false;
        const projectName = typeof task.project === 'object' ? task.project.name : task.project;
        return projectName === filterProject;
      });
    }

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter(task => task.status === filterStatus);
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

        case 'project': {
          const projectA = typeof a.project === 'object' ? (a.project?.name || '') : (a.project || '');
          const projectB = typeof b.project === 'object' ? (b.project?.name || '') : (b.project || '');
          return projectA.localeCompare(projectB);
        }

        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, sortBy, filterTag, filterProject, filterStatus, activeTab]);

  if (loading && tasks.length === 0) {
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
            <TaskForm
              task={editingTask}
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
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.headerText}>
                  <h1>Task Management</h1>
                  <p className={styles.headerSubtitle}>
                    Organize and track your work efficiently
                  </p>
                </div>
              </div>
              <Button variant="primary" onClick={handleCreateTask} className={styles.createButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                New Task
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

            {tasks.length > 0 && (
              <>
                {/* Modern Tabs with Icons */}
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${activeTab === 'active' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('active')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Active
                    <span className={styles.tabCount}>
                      {tasks.filter(task => !task.archived && task.status !== 'Completed').length}
                    </span>
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === 'done' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('done')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Done
                    <span className={styles.tabCount}>
                      {tasks.filter(task => !task.archived && task.status === 'Completed').length}
                    </span>
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === 'archived' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('archived')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Archived
                    <span className={styles.tabCount}>
                      {tasks.filter(task => task.archived).length}
                    </span>
                  </button>
                </div>

                {/* Modern View Toggle */}
                <div className={styles.controlsBar}>
                  <div className={styles.viewToggle}>
                    <button
                      className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                      onClick={() => setViewMode('list')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      List
                    </button>
                    <button
                      className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                      onClick={() => setViewMode('grid')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Grid
                    </button>
                  </div>

                  <div className={styles.resultCount}>
                    {filteredAndSortedTasks.length} {filteredAndSortedTasks.length === 1 ? 'task' : 'tasks'}
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
                        <option value="priority">Priority (High to Low)</option>
                        <option value="dueDate">Due Date (Nearest First)</option>
                        <option value="dateCreated">Date Created (Newest First)</option>
                        <option value="project">Project (A-Z)</option>
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

                    {availableProjects.length > 0 && (
                      <div className={styles.filterGroup}>
                        <label htmlFor="filterProject" className={styles.filterLabel}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Filter by project
                        </label>
                        <select
                          id="filterProject"
                          value={filterProject}
                          onChange={(e) => setFilterProject(e.target.value)}
                          className={styles.filterSelect}
                        >
                          <option value="">All Projects</option>
                          {availableProjects.map(project => (
                            <option key={project} value={project}>{project}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={styles.filterGroup}>
                      <label htmlFor="filterStatus" className={styles.filterLabel}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Filter by status
                      </label>
                      <select
                        id="filterStatus"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={styles.filterSelect}
                      >
                        <option value="">All Statuses</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    {(filterTag || filterProject || filterStatus) && (
                      <button
                        onClick={() => {
                          setFilterTag('');
                          setFilterProject('');
                          setFilterStatus('');
                        }}
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

            {tasks.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.emptyStateTitle}>No tasks yet</h3>
                <p className={styles.emptyStateText}>Create your first task to get started on your journey to productivity!</p>
                <Button variant="primary" onClick={handleCreateTask} size="large">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Create Your First Task
                </Button>
              </div>
            ) : filteredAndSortedTasks.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.emptyStateTitle}>No tasks match your filters</h3>
                <p className={styles.emptyStateText}>Try adjusting your filters or create a new task.</p>
                <button
                  onClick={() => {
                    setFilterTag('');
                    setFilterProject('');
                    setFilterStatus('');
                  }}
                  className={styles.clearFiltersButton}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? styles.taskGrid : styles.taskList}>
                {filteredAndSortedTasks.map((task, index) => (
                  <div
                    key={task._id}
                    ref={(el) => taskRefs.current[task._id] = el}
                    className={styles.taskCardWrapper}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TaskCard
                      task={task}
                      onEdit={handleEditTask}
                      onArchive={handleArchiveTask}
                      onUnarchive={handleUnarchiveTask}
                      isArchived={task.archived}
                      onRefresh={() => {
                        fetchTasks();
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Modal
          isOpen={showArchiveModal}
          onClose={cancelArchive}
          onConfirm={confirmArchive}
          title="Archive Task"
          message="Are you sure you want to archive this task? You can unarchive it later from the Archived tab."
          confirmText="Archive"
          cancelText="Cancel"
          variant="warning"
        />
      </div>
    </div>
  );
}

export default TasksPage;
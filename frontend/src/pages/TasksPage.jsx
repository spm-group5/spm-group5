import { useState, useEffect, useMemo } from 'react';
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
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [sortBy, setSortBy] = useState('priority');
  const [filterTag, setFilterTag] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'done', or 'archived'
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [taskToArchive, setTaskToArchive] = useState(null);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

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
      filtered = filtered.filter(task => !task.archived && task.status !== 'Done');
    } else if (activeTab === 'done') {
      filtered = filtered.filter(task => !task.archived && task.status === 'Done');
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

        case 'project':
          const projectA = typeof a.project === 'object' ? (a.project?.name || '') : (a.project || '');
          const projectB = typeof b.project === 'object' ? (b.project?.name || '') : (b.project || '');
          return projectA.localeCompare(projectB);

        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, sortBy, filterTag, filterProject, activeTab]);

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
    <div>
      <Header />
      <div className={`container ${styles.page}`}>
        {showForm ? (
          <TaskForm
            task={editingTask}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        ) : (
          <>
            <div className={styles.header}>
              <h1>Tasks</h1>
              <Button variant="primary" onClick={handleCreateTask}>
                New Task
              </Button>
            </div>

            {error && (
              <div className={styles.error}>
                Error: {error}
              </div>
            )}

            {tasks.length > 0 && (
              <>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${activeTab === 'active' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('active')}
                  >
                    Active
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === 'done' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('done')}
                  >
                    Done
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === 'archived' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('archived')}
                  >
                    Archived
                  </button>
                </div>

                <div className={styles.viewToggle}>
                  <button
                    className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    ☰ List View
                  </button>
                  <button
                    className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    ▦ Grid View
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
                    <option value="priority">Priority (High to Low)</option>
                    <option value="dueDate">Due Date (Nearest First)</option>
                    <option value="dateCreated">Date Created (Newest First)</option>
                    <option value="project">Project (A-Z)</option>
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

                {availableProjects.length > 0 && (
                  <div className={styles.filterGroup}>
                    <label htmlFor="filterProject" className={styles.filterLabel}>Filter by project:</label>
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

                {(filterTag || filterProject) && (
                  <button
                    onClick={() => {
                      setFilterTag('');
                      setFilterProject('');
                    }}
                    className={styles.clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              </>
            )}

            {tasks.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No tasks yet</h3>
                <p>Create your first task to get started!</p>
                <Button variant="primary" onClick={handleCreateTask}>
                  Create Task
                </Button>
              </div>
            ) : filteredAndSortedTasks.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No tasks match your filters</h3>
                <p>Try adjusting your filters or create a new task.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? styles.taskGrid : styles.taskList}>
                {filteredAndSortedTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onEdit={handleEditTask}
                    onArchive={handleArchiveTask}
                    onUnarchive={handleUnarchiveTask}
                    isArchived={task.archived}
                  />
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
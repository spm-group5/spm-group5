/**
 * Component: ProjectTasksPage
 *
 * Purpose: Displays tasks for a specific project with authorization checking
 *
 * Key Features:
 * - Fetches and displays tasks for a single project
 * - Handles authorization errors (403) with user-friendly messages
 * - Handles not found errors (404) for non-existent projects
 * - Handles validation errors (400) for invalid project IDs
 * - Shows empty state when project has no tasks
 * - Provides navigation back to projects list
 * - Displays loading states during data fetch
 *
 * Authorization Logic:
 * - Admin users can view tasks in any project
 * - Staff users can view tasks only if they or their department colleagues are assigned
 * - Backend enforces authorization and returns 403 if access is denied
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Spinner from '../components/common/Spinner/Spinner';
import TaskCard from '../components/tasks/TaskCard/TaskCard';
import TaskForm from '../components/tasks/TaskForm/TaskForm';
import Modal from '../components/common/Modal/Modal';
import styles from './ProjectTasksPage.module.css';

function ProjectTasksPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { fetchTasksByProject, createTask, updateTask, archiveTask, unarchiveTask } = useTasks();
  const { getProjectById } = useProjects();
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [sortBy, setSortBy] = useState('priority');
  const [filterTag, setFilterTag] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('active');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [taskToArchive, setTaskToArchive] = useState(null);
  const [assignmentView, setAssignmentView] = useState('all'); // 'my-tasks', 'team-tasks', 'all'

  const loadProjectTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorType(null);

      // Fetch project details
      const projectResponse = await getProjectById(projectId);
      if (projectResponse.success) {
        setProject(projectResponse.data);
      }

      // Fetch tasks for this project
      const tasksResponse = await fetchTasksByProject(projectId, userId, user?.role, user?.department);
      if (tasksResponse.success) {
        setTasks(tasksResponse.data || []);
      }
    } catch (err) {
      console.error('Error fetching project tasks:', err);

      // Handle different error types based on HTTP status
      if (err.status === 403) {
        setErrorType('forbidden');
        setError('You do not have permission to view tasks in this project. Access requires you or a department colleague to be assigned to at least one task.');
      } else if (err.status === 404) {
        setErrorType('notFound');
        setError('Project not found.');
      } else if (err.status === 400) {
        setErrorType('badRequest');
        setError('Invalid project ID.');
      } else {
        setErrorType('server');
        setError('An error occurred while loading tasks. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectTasks();
  }, [projectId, fetchTasksByProject, getProjectById, userId, user]);

  const handleBackToProjects = () => {
    navigate('/projects');
  };

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
      const result = await archiveTask(taskToArchive);
      if (result.success) {
        // Update local tasks state
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task._id === taskToArchive ? result.data : task
          )
        );
      }
      setShowArchiveModal(false);
      setTaskToArchive(null);
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setTaskToArchive(null);
  };

  const handleUnarchiveTask = async (taskId) => {
    const result = await unarchiveTask(taskId);
    if (result.success) {
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task._id === taskId ? result.data : task
        )
      );
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingTask) {
        // When editing, don't add project field (it can't be changed)
        const result = await updateTask(editingTask._id, formData);
        if (result.success) {
          setTasks(prevTasks =>
            prevTasks.map(task =>
              task._id === editingTask._id ? result.data : task
            )
          );
        }
      } else {
        // When creating, ensure the task is associated with this project
        const taskDataWithProject = {
          ...formData,
          project: projectId,
        };
        const result = await createTask(taskDataWithProject);
        if (result.success) {
          setTasks(prevTasks => [...prevTasks, result.data]);
        }
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

  // Get all unique tags from tasks
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

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // 1. Filter by assignment view
    if (assignmentView === 'my-tasks') {
      // Show only tasks assigned to ME
      filtered = filtered.filter(task => 
        task.assignee?.some(assignee => {
          const assigneeId = assignee._id || assignee;
          return assigneeId === userId;
        })
      );
    } else if (assignmentView === 'team-tasks') {
      // Show only tasks assigned to DEPARTMENT COLLEAGUES (not me)
      filtered = filtered.filter(task => {
        const isAssignedToMe = task.assignee?.some(assignee => {
          const assigneeId = assignee._id || assignee;
          return assigneeId === userId;
        });
        return !isAssignedToMe; // Only tasks NOT assigned to me
      });
    }
    // if 'all', show all tasks (backend already filtered by department)

    // 2. Apply status filter (Active/Done/Archived)
    if (activeTab === 'active') {
      filtered = filtered.filter(task => !task.archived && task.status !== 'Done');
    } else if (activeTab === 'done') {
      filtered = filtered.filter(task => !task.archived && task.status === 'Done');
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(task => task.archived);
    }

    // 3. Apply tag filter
    if (filterTag) {
      filtered = filtered.filter(task => {
        if (!task.tags) return false;
        const taskTags = task.tags.split('#').map(tag => tag.trim()).filter(Boolean);
        return taskTags.includes(filterTag);
      });
    }

    // 4. Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return (b.priority || 0) - (a.priority || 0);
        case 'dueDate':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'dateCreated':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, assignmentView, activeTab, filterTag, sortBy, userId]);

  // Calculate counts based on current status tab
  const taskCounts = useMemo(() => {
    // First filter by status tab
    let statusFilteredTasks = [...tasks];
    if (activeTab === 'active') {
      statusFilteredTasks = tasks.filter(task => !task.archived && task.status !== 'Done');
    } else if (activeTab === 'done') {
      statusFilteredTasks = tasks.filter(task => !task.archived && task.status === 'Done');
    } else if (activeTab === 'archived') {
      statusFilteredTasks = tasks.filter(task => task.archived);
    }

    // Then calculate assignment counts from status-filtered tasks
    const myTasks = statusFilteredTasks.filter(task => 
      task.assignee?.some(assignee => {
        const assigneeId = assignee._id || assignee;
        return assigneeId === userId;
      })
    );
    
    const teamTasks = statusFilteredTasks.filter(task => {
      const isAssignedToMe = task.assignee?.some(assignee => {
        const assigneeId = assignee._id || assignee;
        return assigneeId === userId;
      });
      return !isAssignedToMe;
    });

    return {
      all: statusFilteredTasks.length,
      myTasks: myTasks.length,
      teamTasks: teamTasks.length,
    };
  }, [tasks, userId, activeTab]);

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container flex justify-center items-center" style={{ minHeight: '400px' }}>
          <Spinner size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className={`container ${styles.page}`}>
          <div className={styles.errorContainer}>
            <div className={`${styles.errorMessage} ${styles[errorType]}`}>
              <h2>
                {errorType === 'forbidden' && '🔒 Access Denied'}
                {errorType === 'notFound' && '❌ Not Found'}
                {errorType === 'badRequest' && '⚠️ Invalid Request'}
                {errorType === 'server' && '⚠️ Error'}
              </h2>
              <p>{error}</p>
              <Button variant="primary" onClick={handleBackToProjects}>
                Back to Projects
              </Button>
            </div>
          </div>
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
              <div className={styles.titleSection}>
                <Button variant="secondary" size="small" onClick={handleBackToProjects}>
                  ← Back to Projects
                </Button>
                <h1>{project?.name || 'Project'} Tasks</h1>
              </div>
              <Button variant="primary" onClick={handleCreateTask}>
                New Task
              </Button>
            </div>

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

                {/* Assignment View Filter */}
                <div className={styles.assignmentTabs}>
                  <button
                    className={`${styles.assignmentTab} ${assignmentView === 'all' ? styles.activeAssignmentTab : ''}`}
                    onClick={() => setAssignmentView('all')}
                  >
                    All Department Tasks ({taskCounts.all})
                  </button>
                  <button
                    className={`${styles.assignmentTab} ${assignmentView === 'my-tasks' ? styles.activeAssignmentTab : ''}`}
                    onClick={() => setAssignmentView('my-tasks')}
                  >
                    My Tasks ({taskCounts.myTasks})
                  </button>
                  <button
                    className={`${styles.assignmentTab} ${assignmentView === 'team-tasks' ? styles.activeAssignmentTab : ''}`}
                    onClick={() => setAssignmentView('team-tasks')}
                  >
                    Team Tasks ({taskCounts.teamTasks})
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

                  {filterTag && (
                    <button
                      onClick={() => setFilterTag('')}
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
                <h3>No tasks in this project</h3>
                <p>Create a new task to get started.</p>
                <Button variant="primary" onClick={handleCreateTask}>
                  Create First Task
                </Button>
              </div>
            ) : (
              <>
                {filteredAndSortedTasks.length === 0 ? (
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
                        onRefresh={loadProjectTasks}
                      />
                    ))}
                  </div>
                )}
              </>
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

export default ProjectTasksPage;

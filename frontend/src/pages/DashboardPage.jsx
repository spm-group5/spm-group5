import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Spinner from '../components/common/Spinner/Spinner';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const { user } = useAuth();
  const { tasks, loading: tasksLoading, fetchTasks } = useTasks();
  const { projects, loading: projectsLoading, fetchProjects } = useProjects();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  const getTaskStats = () => {
    const total = tasks.length;
    const inProgress = tasks.filter(task => task.status === 'In Progress').length;
    const completed = tasks.filter(task => task.status === 'Completed').length;
    const pending = tasks.filter(task => task.status === 'To Do').length;
    return { total, inProgress, completed, pending };
  };

  const getRecentTasks = () => {
    return tasks
      .sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()))
      .slice(0, 5);
  };

  const getCompletionRate = () => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.status === 'Completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const stats = getTaskStats();
  const recentTasks = getRecentTasks();
  const completionRate = getCompletionRate();

  if (tasksLoading || projectsLoading) {
    return (
      <div>
        <Header />
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p className={styles.loadingText}>Loading your dashboard...</p>
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
        {/* Hero Welcome Section */}
        <div className={styles.hero}>
          <div className={styles.welcomeContent}>
            <div className={styles.welcomeText}>
              <h1 className={styles.welcomeTitle}>
                <span className={styles.greeting}>Welcome back,</span>
                <span className={styles.username}>{user?.username || 'User'}</span>
              </h1>
              <p className={styles.welcomeSubtitle}>
                Here's your productivity overview for today
              </p>
            </div>
            <div className={styles.dateDisplay}>
              <div className={styles.dateIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.dateText}>
                <span className={styles.dayOfWeek}>{format(new Date(), 'EEEE')}</span>
                <span className={styles.fullDate}>{format(new Date(), 'MMMM dd, yyyy')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid with Icons */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statCard1}`}>
            <div className={styles.statIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>Total Tasks</div>
            </div>
            <div className={styles.statGlow}></div>
          </div>

          <div className={`${styles.statCard} ${styles.statCard2}`}>
            <div className={styles.statIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.inProgress}</div>
              <div className={styles.statLabel}>In Progress</div>
            </div>
            <div className={styles.statGlow}></div>
          </div>

          <div className={`${styles.statCard} ${styles.statCard3}`}>
            <div className={styles.statIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.completed}</div>
              <div className={styles.statLabel}>Completed</div>
            </div>
            <div className={styles.statGlow}></div>
          </div>

          <div className={`${styles.statCard} ${styles.statCard4}`}>
            <div className={styles.statIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{projects.length}</div>
              <div className={styles.statLabel}>Active Projects</div>
            </div>
            <div className={styles.statGlow}></div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Recent Tasks Section */}
          <div className={styles.mainSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <div className={styles.sectionIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className={styles.sectionTitle}>Recent Tasks</h2>
              </div>
              <Link to="/tasks">
                <Button variant="ghost" size="small" className={styles.viewAllButton}>
                  View All
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 7l5 5m0 0l-5 5m5-5H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </Link>
            </div>

            <div className={styles.taskListContainer}>
              {recentTasks.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className={styles.emptyStateTitle}>No tasks yet</h3>
                  <p className={styles.emptyStateText}>Create your first task to get started!</p>
                  <Link to="/tasks">
                    <Button variant="primary" size="medium">Create Task</Button>
                  </Link>
                </div>
              ) : (
                <div className={styles.taskList}>
                  {recentTasks.map((task, index) => (
                    <div
                      key={task._id}
                      className={styles.taskItem}
                      onClick={() => navigate(`/tasks?taskId=${task._id}`)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className={styles.taskPriority}></div>
                      <div className={styles.taskContent}>
                        <div className={styles.taskHeader}>
                          <h4 className={styles.taskTitle}>{task.title}</h4>
                          <span className={`${styles.statusBadge} ${styles[task.status.replace(' ', '').toLowerCase()]}`}>
                            {task.status}
                          </span>
                        </div>
                        <div className={styles.taskMeta}>
                          {task.dueDate && (
                            <span className={styles.taskDate}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Due {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.taskArrow}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Quick Actions & Progress */}
          <div className={styles.sidebar}>
            {/* Progress Card */}
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <h3 className={styles.progressTitle}>Completion Rate</h3>
                <span className={styles.progressPercentage}>{completionRate}%</span>
              </div>
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${completionRate}%` }}
                >
                  <div className={styles.progressGlow}></div>
                </div>
              </div>
              <div className={styles.progressStats}>
                <div className={styles.progressStat}>
                  <span className={styles.progressStatNumber}>{stats.completed}</span>
                  <span className={styles.progressStatLabel}>Completed</span>
                </div>
                <div className={styles.progressStat}>
                  <span className={styles.progressStatNumber}>{stats.total}</span>
                  <span className={styles.progressStatLabel}>Total</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className={styles.quickActionsCard}>
              <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
              <div className={styles.quickActions}>
                <Link to="/tasks" className={styles.actionLink}>
                  <div className={styles.actionCard}>
                    <div className={styles.actionIcon}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className={styles.actionText}>
                      <h4>New Task</h4>
                      <p>Create a new task</p>
                    </div>
                    <div className={styles.actionArrow}>→</div>
                  </div>
                </Link>
                <Link to="/projects" className={styles.actionLink}>
                  <div className={styles.actionCard}>
                    <div className={styles.actionIcon}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className={styles.actionText}>
                      <h4>New Project</h4>
                      <p>Start a new project</p>
                    </div>
                    <div className={styles.actionArrow}>→</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Company Info Card */}
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.infoContent}>
                <h4 className={styles.infoTitle}>All-In-One</h4>
                <p className={styles.infoText}>
                  Leading digital transformation solutions across Southeast Asia
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import { useNotifications } from '../hooks/useNotifications';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import Spinner from '../components/common/Spinner/Spinner';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const { user } = useAuth();
  const { tasks, loading: tasksLoading, fetchTasks } = useTasks();
  const { projects, loading: projectsLoading, fetchProjects } = useProjects();

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  const getTaskStats = () => {
    const total = tasks.length;
    const inProgress = tasks.filter(task => task.status === 'In Progress').length;
    const completed = tasks.filter(task => task.status === 'Done').length;
    const pending = tasks.filter(task => task.status === 'To Do').length;
    return { total, inProgress, completed, pending };
  };

  const getRecentTasks = () => {
    return tasks
      .sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()))
      .slice(0, 5);
  };

  const stats = getTaskStats();
  const recentTasks = getRecentTasks();

  if (tasksLoading || projectsLoading) {
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
        <div className={styles.welcome}>
          <h1>Welcome back, {user?.username || 'User'}!</h1>
          <p>Here's what's happening with your tasks and projects.</p>
        </div>

        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <Card.Body>
              <div className={styles.stat}>
                <div className={styles.statNumber}>{stats.total}</div>
                <div className={styles.statLabel}>Total Tasks</div>
              </div>
            </Card.Body>
          </Card>

          <Card className={styles.statCard}>
            <Card.Body>
              <div className={styles.stat}>
                <div className={styles.statNumber}>{stats.inProgress}</div>
                <div className={styles.statLabel}>In Progress</div>
              </div>
            </Card.Body>
          </Card>

          <Card className={styles.statCard}>
            <Card.Body>
              <div className={styles.stat}>
                <div className={styles.statNumber}>{stats.completed}</div>
                <div className={styles.statLabel}>Completed</div>
              </div>
            </Card.Body>
          </Card>

          <Card className={styles.statCard}>
            <Card.Body>
              <div className={styles.stat}>
                <div className={styles.statNumber}>{projects.length}</div>
                <div className={styles.statLabel}>Total Projects</div>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Recent Tasks</h2>
              <Link to="/tasks">
                <Button variant="ghost" size="small">View All</Button>
              </Link>
            </div>
            <Card>
              <Card.Body>
                {recentTasks.length === 0 ? (
                  <p className={styles.emptyMessage}>No tasks yet. Create your first task!</p>
                ) : (
                  <div className={styles.taskList}>
                    {recentTasks.map((task) => (
                      <div key={task._id} className={styles.taskItem}>
                        <div className={styles.taskInfo}>
                          <h4 className={styles.taskTitle}>{task.title}</h4>
                          <div className={styles.taskMeta}>
                            <span className={`${styles.statusBadge} ${styles[task.status.replace(' ', '').toLowerCase()]}`}>
                              {task.status}
                            </span>
                            {task.dueDate && (
                              <span className={styles.dueDate}>
                                Due {format(new Date(task.dueDate), 'MMM dd')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Quick Actions</h2>
            </div>
            <Card>
              <Card.Body>
                <div className={styles.quickActions}>
                  <Link to="/tasks">
                    <Button variant="primary" size="large" className={styles.actionButton}>
                      Create Task
                    </Button>
                  </Link>
                  <Link to="/projects">
                    <Button variant="secondary" size="large" className={styles.actionButton}>
                      Create Project
                    </Button>
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotificationCenter } from '../../../context/NotificationsCenterContext';
import Button from '../Button/Button';
import styles from './Header.module.css';

function Header() {
  const { user, logout } = useAuth();

  const { notifications } = useNotificationCenter();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await logout();
  };

  // Check if user has admin role
  const isAdmin = user?.roles?.includes('admin');

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link to="/dashboard" className={styles.logoLink}>
            <h2>TaskManager</h2>
          </Link>
        </div>

        <nav className={styles.nav}>
          <Link to="/dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <Link to="/tasks" className={styles.navLink}>
            Tasks
          </Link>
          <Link to="/projects" className={styles.navLink}>
            Projects
          </Link>
          <Link to="/notifications" className={styles.navLink}>
            Notifications
            {unreadCount > 0 && ( 
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </Link>
          {isAdmin && (
            <Link to="/reports" className={styles.navLink}>
              Report Generation
            </Link>
          )}
        </nav>

        <div className={styles.userSection}>
          {/* <span className={styles.userName}>
            {user?.name || user?.email || user?.username}
          </span> */}
          <Button variant="ghost" size="small" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Header;
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Button from '../Button/Button';
import styles from './Header.module.css';

function Header() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

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
        </nav>

        <div className={styles.userSection}>
          <span className={styles.userName}>
            {user?.name || user?.email}
          </span>
          <Button variant="ghost" size="small" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Header;
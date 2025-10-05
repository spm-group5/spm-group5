import { useNotifications } from '../../../hooks/useNotifications';
import styles from './NotificationToast.module.css';

function NotificationToast({ notification }) {
  const { removeNotification } = useNotifications();

  const handleClose = () => {
    removeNotification(notification.id);
  };

  return (
    <div className={`${styles.toast} ${styles[notification.type]}`}>
      <div className={styles.content}>
        <span className={styles.message}>{notification.message}</span>
        <button className={styles.closeButton} onClick={handleClose}>
          ×
        </button>
      </div>
    </div>
  );
}

export default NotificationToast;
import { useNotifications } from '../../../hooks/useNotifications';
import NotificationToast from './NotificationToast';
import styles from './NotificationContainer.module.css';

function NotificationContainer() {
  const { notifications } = useNotifications();

  return (
    <div className={styles.container}>
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
        />
      ))}
    </div>
  );
}

export default NotificationContainer;
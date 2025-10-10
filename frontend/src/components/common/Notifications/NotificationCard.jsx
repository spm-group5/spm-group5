import React from 'react';
import styles from './NotificationCard.module.css';

export default function NotificationCard({ notification, onMarkRead, onDelete }) {
  const msg = (notification.message || '').toLowerCase();
  let type = 'info';
  if (msg.includes('assigned')) type = 'assigned';
  else if (msg.includes('deleted') || msg.includes('removed')) type = 'deleted';
  else if (msg.includes('updated') || msg.includes('status')) type = 'updated';
  else if (notification.isUrgent) type = 'urgent';

  return (
    <article className={`${styles.card} ${notification.read ? styles.read : ''}`}>
      <div className={styles.left}>
        <span className={`${styles.badge} ${styles[type]}`}>{type.toUpperCase()}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <div className={styles.title}>{notification.message}</div>
          <div className={styles.actions}>
            {!notification.read && <button className={styles.smallBtn} onClick={onMarkRead}>Mark read</button>}
            <button className={styles.smallBtn} onClick={onDelete}>Delete</button>
          </div>
        </div>

        {notification.task && (
          <div className={styles.meta}>
            Task: {notification.task.title || notification.task}
          </div>
        )}

        <div className={styles.ts}>
          {new Date(notification.createdAt || Date.now()).toLocaleString()}
        </div>
      </div>
    </article>
  );
}
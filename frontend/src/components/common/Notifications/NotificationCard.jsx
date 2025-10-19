import React from 'react';
import styles from './NotificationCard.module.css';

// Enhanced notification display function
const getNotificationDetails = (notification) => {
  const message = notification.message || '';
  
  // Extract more context from the message
  if (message.includes('commented')) {
    return {
      type: 'comment',
      action: 'commented on',
      details: message // "John commented on task: 'Fix bug'"
    };
  }
  
  if (message.includes('archived')) {
    return {
      type: 'archive', 
      action: 'archived',
      details: message // "John archived task: 'Fix bug'"
    };
  }
  
  if (message.includes('created')) {
    return {
      type: 'created',
      action: 'created',
      details: message // "John created task: 'New feature'"
    };
  }
  
  if (message.includes('assigned')) {
    return {
      type: 'assigned',
      action: 'assigned',
      details: message
    };
  }
  
  if (message.includes('deleted') || message.includes('removed')) {
    return {
      type: 'deleted',
      action: 'deleted',
      details: message
    };
  }
  
  return { type: 'info', action: 'updated', details: message };
};

export default function NotificationCard({ notification, onMarkRead, onDelete }) {
  // Use the enhanced function instead of the old logic
  const notificationDetails = getNotificationDetails(notification);
  const type = notificationDetails.type;

  return (
    <article className={`${styles.card} ${notification.read ? styles.read : ''}`}>
      <div className={styles.left}>
        <span className={`${styles.badge} ${styles[type]}`}>{type.toUpperCase()}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <div className={styles.title}>{notificationDetails.details}</div>
          <div className={styles.actions}>
            {!notification.read && <button className={styles.smallBtn} onClick={onMarkRead}>Mark read</button>}
            <button className={styles.smallBtn} onClick={onDelete}>Delete</button>
          </div>
        </div>

        {/* Enhanced task information */}
        {notification.task && (
          <div className={styles.meta}>
            <div>Task: {notification.task.title || notification.task}</div>
            {notification.task.project && (
              <div>Project: {notification.task.project.name || notification.task.project}</div>
            )}
          </div>
        )}

        {/* Show who performed the action if available */}
        {notification.assignor && (
          <div className={styles.assignor}>
            By: {notification.assignor.username || notification.assignor}
          </div>
        )}

        <div className={styles.ts}>
          {new Date(notification.createdAt || Date.now()).toLocaleString()}
        </div>
      </div>
    </article>
  );
}
import { useState } from 'react';
import CommentSection from '../TaskComment/TaskCommentSection';
import styles from './SubtaskCard.module.css';

const SubtaskCard = ({ subtask, onEdit, onArchive, onUnarchive, isArchived }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'To Do':
        return styles.statusTodo;
      case 'In Progress':
        return styles.statusInProgress;
      case 'Completed':
        return styles.statusCompleted;
      case 'Blocked':
        return styles.statusBlocked;
      default:
        return styles.statusTodo;
    }
  };

  const getPriorityBadgeClass = (priority) => {
    if (priority >= 8) return styles.priorityHigh;
    if (priority >= 5) return styles.priorityMedium;
    return styles.priorityLow;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={styles.subtaskCard}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h4 className={styles.title}>{subtask.title}</h4>
          <button
            className={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${getStatusBadgeClass(subtask.status)}`}>
            {subtask.status}
          </span>
          <span className={`${styles.badge} ${getPriorityBadgeClass(subtask.priority)}`}>
            P{subtask.priority}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.details}>
          {subtask.description && (
            <div className={styles.section}>
              <h5 className={styles.sectionTitle}>Description</h5>
              <p className={styles.description}>{subtask.description}</p>
            </div>
          )}

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Due Date:</span>
              <span className={styles.value}>{formatDate(subtask.dueDate)}</span>
            </div>
            {subtask.assigneeId && (
              <div className={styles.infoItem}>
                <span className={styles.label}>Assignee:</span>
                <span className={styles.value}>
                  {subtask.assigneeId.username}
                </span>
              </div>
            )}
            {subtask.ownerId && (
              <div className={styles.infoItem}>
                <span className={styles.label}>Owner:</span>
                <span className={styles.value}>
                  {subtask.ownerId.username}
                </span>
              </div>
            )}
            {subtask.isRecurring && (
              <div className={styles.infoItem}>
                <span className={styles.label}>Recurring:</span>
                <span className={styles.value}>Every {subtask.recurrenceInterval} days</span>
              </div>
            )}
            {subtask.timeTaken && (
              <div className={styles.infoItem}>
                <span className={styles.label}>Time Taken:</span>
                <span className={styles.value}>{subtask.timeTaken}</span>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            {!isArchived && (
              <button
                className={`${styles.button} ${styles.editButton}`}
                onClick={() => onEdit(subtask)}
              >
                Edit
              </button>
            )}
            {isArchived ? (
              <button
                className={`${styles.button} ${styles.unarchiveButton}`}
                onClick={() => onUnarchive(subtask)}
              >
                Unarchive
              </button>
            ) : (
              <button
                className={`${styles.button} ${styles.archiveButton}`}
                onClick={() => onArchive(subtask)}
              >
                Archive
              </button>
            )}
          </div>

          {/* Comments Section */}
          <CommentSection
            subtask={subtask}
            type="subtask"
            // onCommentAdded={(updatedSubtask) => {
            //   // Comments are handled locally in CommentSection
            //   // No need to refresh the entire page
            // }}
          />
        </div>
      )}
    </div>
  );
};

export default SubtaskCard;


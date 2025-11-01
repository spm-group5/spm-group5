import { useEffect, useState } from 'react';
import { useSubtasks } from '../../../context/SubtaskContext';
import { useAuth } from '../../../context/AuthContext';
import SubtaskCard from '../SubtaskCard/SubtaskCard';
import Button from '../../common/Button/Button';
import Modal from '../../common/Modal/Modal';
import styles from './SubtaskList.module.css';

const SubtaskList = ({
  parentTask,
  parentTaskId,
  onShowSubtaskForm,
  onArchiveSubtask,
  onUnarchiveSubtask,
  onTotalTimeUpdate
}) => {
  const {
    subtasks,
    fetchSubtasksByParentTask,
    loading
  } = useSubtasks();
  const { user } = useAuth();

  // Check if current user is assigned to the parent task
  const isAssignedToTask = () => {
    if (!user || !parentTask) return false;
    const userId = user.id || user._id;

    return parentTask.assignee?.some(assignee => {
      const assigneeId = assignee._id || assignee;
      return assigneeId === userId;
    });
  };

  // Staff can create subtasks if assigned to the parent task
  // Admin and Manager can always create subtasks
  const canCreateSubtask = user?.roles?.includes('admin') ||
                           user?.roles?.includes('manager') ||
                           isAssignedToTask();

  const [activeSubtasks, setActiveSubtasks] = useState([]);
  const [archivedSubtasks, setArchivedSubtasks] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (parentTaskId) {
      fetchSubtasksByParentTask(parentTaskId);
    }
  }, [parentTaskId, fetchSubtasksByParentTask]);

  useEffect(() => {
    // Filter out archived subtasks for display
    const filtered = subtasks.filter(subtask => !subtask.archived);
    setActiveSubtasks(filtered);
  }, [subtasks]);

  useEffect(() => {
    // Set archived subtasks
    setArchivedSubtasks(subtasks.filter(subtask => subtask.archived));
  }, [subtasks]);

  const handleEdit = (subtask) => {
    onShowSubtaskForm(subtask);
  };

  const handleArchive = (subtask) => {
    onArchiveSubtask(subtask);
  };

  const handleUnarchive = (subtask) => {
    onUnarchiveSubtask(subtask);
  };

  const getStatusStats = () => {
    const stats = {
      'To Do': 0,
      'In Progress': 0,
      'Completed': 0,
      'Blocked': 0
    };

    activeSubtasks.forEach(subtask => {
      if (Object.prototype.hasOwnProperty.call(stats, subtask.status)) {
        stats[subtask.status]++;
      }
    });

    return stats;
  };

  const stats = getStatusStats();

  if (loading && activeSubtasks.length === 0) {
    return <div className={styles.loading}>Loading subtasks...</div>;
  }

  return (
    <div className={styles.subtaskList}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            Subtasks ({activeSubtasks.length})
            {archivedSubtasks.length > 0 && (
              <span className={styles.archivedCount}>
                {' '}({archivedSubtasks.length} archived)
              </span>
            )}
          </h3>
          <div className={styles.stats}>
            <span className={styles.stat}>To Do: {stats['To Do']}</span>
            <span className={styles.stat}>In Progress: {stats['In Progress']}</span>
            <span className={styles.stat}>Completed: {stats['Completed']}</span>
            <span className={styles.stat}>Blocked: {stats['Blocked']}</span>
          </div>
        </div>
        {canCreateSubtask && (
          <Button
            onClick={() => onShowSubtaskForm(null)}
            variant="primary"
          >
            Add Subtask
          </Button>
        )}
      </div>

      {activeSubtasks.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No subtasks yet. Create one to get started!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {activeSubtasks.map(subtask => (
            <SubtaskCard
              key={subtask._id}
              subtask={subtask}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              isArchived={false}
              onTotalTimeUpdate={onTotalTimeUpdate}
            />
          ))}
        </div>
      )}

      {archivedSubtasks.length > 0 && (
        <div className={styles.archivedSection}>
          <div className={styles.archivedHeader}>
            <h4 className={styles.archivedTitle}>
              Archived Subtasks ({archivedSubtasks.length})
            </h4>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? 'Hide' : 'Show'} Archived
            </Button>
          </div>
          {showArchived && (
            <div className={styles.archivedList}>
              {archivedSubtasks.map(subtask => (
                <SubtaskCard
                  key={subtask._id}
                  subtask={subtask}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  isArchived={true}
                  onTotalTimeUpdate={onTotalTimeUpdate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubtaskList;


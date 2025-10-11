import { useEffect, useState } from 'react';
import { useSubtasks } from '../../../context/SubtaskContext';
import SubtaskCard from '../SubtaskCard/SubtaskCard';
import Button from '../../common/Button/Button';
import Modal from '../../common/Modal/Modal';
import styles from './SubtaskList.module.css';

const SubtaskList = ({ 
  parentTaskId, 
  projectId, 
  ownerId,
  onShowSubtaskForm,
  onShowDeleteModal 
}) => {
  const { 
    subtasks, 
    fetchSubtasksByParentTask, 
    deleteSubtask,
    loading 
  } = useSubtasks();

  const [activeSubtasks, setActiveSubtasks] = useState([]);

  useEffect(() => {
    if (parentTaskId) {
      fetchSubtasksByParentTask(parentTaskId);
    }
  }, [parentTaskId, fetchSubtasksByParentTask]);

  useEffect(() => {
    // Filter out archived subtasks for display
    const filtered = subtasks.filter(subtask => subtask.status !== 'Archived');
    setActiveSubtasks(filtered);
  }, [subtasks]);

  const handleEdit = (subtask) => {
    onShowSubtaskForm(subtask);
  };

  const handleDelete = (subtask) => {
    onShowDeleteModal(subtask);
  };

  const getStatusStats = () => {
    const stats = {
      'To Do': 0,
      'In Progress': 0,
      'Completed': 0,
      'Blocked': 0
    };

    activeSubtasks.forEach(subtask => {
      if (stats.hasOwnProperty(subtask.status)) {
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
          </h3>
          <div className={styles.stats}>
            <span className={styles.stat}>To Do: {stats['To Do']}</span>
            <span className={styles.stat}>In Progress: {stats['In Progress']}</span>
            <span className={styles.stat}>Completed: {stats['Completed']}</span>
            <span className={styles.stat}>Blocked: {stats['Blocked']}</span>
          </div>
        </div>
        <Button 
          onClick={() => onShowSubtaskForm(null)}
          variant="primary"
        >
          Add Subtask
        </Button>
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
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SubtaskList;


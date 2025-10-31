import { useState } from 'react';
import TimeLoggingInput from './TimeLoggingInput';
import styles from './TimeDisplayBadge.module.css';

const TimeDisplayBadge = ({ 
  timeTaken = 0, 
  onTimeUpdate, 
  isLoading = false,
  canEdit = true,
  type = 'task' // 'task' or 'subtask'
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return 'No time logged';
    if (minutes < 60) return `${minutes} mins`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleSave = async (newTime) => {
    try {
      await onTimeUpdate(newTime);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating time:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <TimeLoggingInput
        currentTime={timeTaken}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
        type={type}
      />
    );
  }

  return (
    <div className={styles.timeBadgeWrapper}>
      <div className={styles.timeBadge}>
        <span className={styles.timeText}>{formatTime(timeTaken)}</span>
        {canEdit && (
          <button
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            title="Click to log time"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

export default TimeDisplayBadge;

import { useRef, useEffect } from 'react';
import styles from './StatusUpdatePopup.module.css';

const STATUS_OPTIONS = ['To Do', 'In Progress', 'Blocked', 'Completed'];

function StatusUpdatePopup({ currentStatus, onStatusChange, onClose, position }) {
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleStatusClick = (status) => {
    if (status !== currentStatus) {
      onStatusChange(status);
    }
    onClose();
  };

  return (
    <div
      ref={popupRef}
      className={styles.popup}
      style={{
        position: 'absolute',
        top: position?.top || 0,
        left: position?.left || 0,
      }}
    >
      <div className={styles.popupHeader}>
        <span className={styles.popupTitle}>Update Status</span>
      </div>
      <div className={styles.statusOptions}>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            className={`${styles.statusOption} ${status === currentStatus ? styles.currentStatus : ''}`}
            onClick={() => handleStatusClick(status)}
          >
            {status}
            {status === currentStatus && <span className={styles.checkmark}> ✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StatusUpdatePopup;

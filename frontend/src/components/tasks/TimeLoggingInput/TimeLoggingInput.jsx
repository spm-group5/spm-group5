import { useState } from 'react';
import styles from './TimeLoggingInput.module.css';

const TimeLoggingInput = ({ 
  currentTime = 0, 
  onSave, 
  onCancel, 
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState(currentTime.toString());
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setError('');
  };

  const handleSave = () => {
    if (inputValue.trim() === '') {
      setError('Time taken cannot be blank');
      return;
    }

    const numValue = Number(inputValue);
    if (isNaN(numValue) || numValue < 0) {
      setError('Time must be a positive number');
      return;
    }

    onSave(numValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const formatDisplayTime = (minutes) => {
    if (minutes === 0) return '0 mins';
    if (minutes < 60) return `${minutes} mins`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={styles.timeLoggingContainer}>
      <label className={styles.label}>
        Time Taken (minutes)
      </label>
      <div className={styles.inputWrapper}>
        <input
          type="number"
          value={inputValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          placeholder="Enter time in minutes"
          min="0"
          disabled={isLoading}
          autoFocus
        />
        {inputValue && !error && (
          <span className={styles.displayTime}>
            ≈ {formatDisplayTime(Number(inputValue))}
          </span>
        )}
      </div>

      {error && <span className={styles.error}>{error}</span>}

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.saveButton}`}
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button
          className={`${styles.button} ${styles.cancelButton}`}
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>

      <div className={styles.hint}>
        Tip: Press Enter to save or Escape to cancel
      </div>
    </div>
  );
};

export default TimeLoggingInput;

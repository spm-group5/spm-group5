import { useState, useEffect } from 'react';
import styles from './TimePicker.module.css';

function TimePicker({ label, value, onChange, error, placeholder = "Select time..." }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const parsed = parseTimeString(value);
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  }, [value]);

  // Notify parent of changes
  useEffect(() => {
    if (hours > 0 || minutes > 0) {
      const timeString = formatTimeString(hours, minutes);
      onChange(timeString);
    } else {
      onChange('');
    }
  }, [hours, minutes, onChange]);

  const parseTimeString = (timeString) => {
    if (!timeString) return { hours: 0, minutes: 0 };
    
    // Handle "X hours Y minutes" format
    const hoursMinutesMatch = timeString.match(/(\d+)\s*hours?\s*(\d+)\s*minutes?/i);
    if (hoursMinutesMatch) {
      return {
        hours: parseInt(hoursMinutesMatch[1]),
        minutes: parseInt(hoursMinutesMatch[2])
      };
    }
    
    // Handle "X minutes" format
    const minutesMatch = timeString.match(/(\d+)\s*minutes?/i);
    if (minutesMatch) {
      const totalMinutes = parseInt(minutesMatch[1]);
      return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60
      };
    }
    
    // Handle "X hour" or "X hours" format
    const hoursMatch = timeString.match(/(\d+)\s*hours?/i);
    if (hoursMatch) {
      return {
        hours: parseInt(hoursMatch[1]),
        minutes: 0
      };
    }
    
    return { hours: 0, minutes: 0 };
  };

  const formatTimeString = (h, m) => {
    if (h === 0 && m === 0) return '';
    if (h === 0) return `${m} minutes`;
    if (m === 0) return `${h} hour${h > 1 ? 's' : ''}`;
    return `${h} hour${h > 1 ? 's' : ''} ${m} minutes`;
  };

  const incrementHours = () => {
    setHours(prev => Math.min(prev + 1, 24));
  };

  const decrementHours = () => {
    setHours(prev => Math.max(prev - 1, 0));
  };

  const incrementMinutes = () => {
    setMinutes(prev => {
      if (prev === 45) return 0;
      return prev + 15;
    });
  };

  const decrementMinutes = () => {
    setMinutes(prev => {
      if (prev === 0) return 45;
      return prev - 15;
    });
  };

  const setQuickTime = (h, m) => {
    setHours(h);
    setMinutes(m);
    setIsOpen(false);
  };

  const clearTime = () => {
    setHours(0);
    setMinutes(0);
    setIsOpen(false);
  };

  const quickSelectOptions = [
    { label: '15 minutes', hours: 0, minutes: 15 },
    { label: '30 minutes', hours: 0, minutes: 30 },
    { label: '45 minutes', hours: 0, minutes: 45 },
    { label: '1 hour', hours: 1, minutes: 0 },
    { label: '1.5 hours', hours: 1, minutes: 30 },
    { label: '2 hours', hours: 2, minutes: 0 }
  ];

  return (
    <div className={styles.timePickerContainer}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputContainer}>
        <div 
          className={styles.timeDisplay}
          onClick={() => setIsOpen(!isOpen)}
        >
          {hours > 0 || minutes > 0 ? formatTimeString(hours, minutes) : placeholder}
        </div>
        
        {isOpen && (
          <div className={styles.dropdown}>
            <div className={styles.timeControls}>
              <div className={styles.timeSection}>
                <label className={styles.sectionLabel}>Hours</label>
                <div className={styles.controls}>
                  <button 
                    type="button"
                    className={styles.decrementBtn}
                    onClick={decrementHours}
                    disabled={hours === 0}
                  >
                    −
                  </button>
                  <span className={styles.value}>{hours}</span>
                  <button 
                    type="button"
                    className={styles.incrementBtn}
                    onClick={incrementHours}
                    disabled={hours === 24}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className={styles.timeSection}>
                <label className={styles.sectionLabel}>Minutes</label>
                <div className={styles.controls}>
                  <button 
                    type="button"
                    className={styles.decrementBtn}
                    onClick={decrementMinutes}
                  >
                    −
                  </button>
                  <span className={styles.value}>{minutes}</span>
                  <button 
                    type="button"
                    className={styles.incrementBtn}
                    onClick={incrementMinutes}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            
            <div className={styles.quickSelect}>
              <label className={styles.sectionLabel}>Quick Select</label>
              <div className={styles.quickButtons}>
                {quickSelectOptions.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    className={styles.quickButton}
                    onClick={() => setQuickTime(option.hours, option.minutes)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className={styles.actions}>
              <button 
                type="button"
                className={styles.clearButton}
                onClick={clearTime}
              >
                Clear
              </button>
              <button 
                type="button"
                className={styles.doneButton}
                onClick={() => setIsOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}

export default TimePicker;

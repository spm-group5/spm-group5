import styles from './Input.module.css';
import { useId } from 'react';

function Input({
  label,
  error,
  helperText,
  required = false,
  className = '',
  id: providedId,
  type = 'text',
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = providedId || generatedId;

  const inputClasses = [
    styles.input,
    error && styles.error,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <input id={inputId} type={type} className={inputClasses} {...inputProps} />
      {error && <div className={styles.errorMessage}>{error}</div>}
      {!error && helperText && (
        <div className={styles.helperText}>{helperText}</div>
      )}
    </div>
  );
}

export default Input;
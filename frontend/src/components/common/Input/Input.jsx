import styles from './Input.module.css';

function Input({
  label,
  error,
  helperText,
  required = false,
  className = '',
  ...inputProps
}) {
  const inputClasses = [
    styles.input,
    error && styles.error,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <input className={inputClasses} {...inputProps} />
      {error && <div className={styles.errorMessage}>{error}</div>}
      {!error && helperText && (
        <div className={styles.helperText}>{helperText}</div>
      )}
    </div>
  );
}

export default Input;
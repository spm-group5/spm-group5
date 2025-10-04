import styles from './Spinner.module.css';

function Spinner({ size = 'medium', center = false, className = '' }) {
  const spinnerClasses = [
    styles.spinner,
    styles[size],
    center && styles.center,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={spinnerClasses}>
      <div className={styles.circle}></div>
    </div>
  );
}

export default Spinner;
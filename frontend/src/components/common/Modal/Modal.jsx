import { useEffect } from 'react';
import Button from '../Button/Button';
import styles from './Modal.module.css';

function Modal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', children, size = 'medium' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={`${styles.modal} ${styles[size]}`}>
        {children ? (
          // Render children (for forms)
          children
        ) : (
          // Render confirmation dialog
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>{title}</h2>
              <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>

            <div className={styles.content}>
              <p className={styles.message}>{message}</p>
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose}>
                {cancelText}
              </Button>
              <Button variant={variant} onClick={onConfirm}>
                {confirmText}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Modal;

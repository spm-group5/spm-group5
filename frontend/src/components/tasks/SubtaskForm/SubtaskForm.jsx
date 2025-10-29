import { useState, useEffect } from 'react';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import styles from './SubtaskForm.module.css';

const SubtaskForm = ({ 
  onSubmit, 
  onCancel, 
  initialData = null, 
  parentTaskId, 
  projectId,
  ownerId 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 5,
    dueDate: '',
    assigneeId: '',
    isRecurring: false,
    recurrenceInterval: 1,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'To Do',
        priority: initialData.priority || 5,
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        assigneeId: initialData.assigneeId?._id || initialData.assigneeId || '',
        isRecurring: initialData.isRecurring || false,
        recurrenceInterval: initialData.recurrenceInterval || 1,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title cannot exceed 200 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }

    if (!formData.priority || formData.priority < 1 || formData.priority > 10) {
      newErrors.priority = 'Priority must be between 1 and 10';
    }

    if (formData.isRecurring) {
      if (!formData.recurrenceInterval || formData.recurrenceInterval <= 0) {
        newErrors.recurrenceInterval = 'Recurrence interval must be a positive number';
      }
      if (!formData.dueDate) {
        newErrors.dueDate = 'Due date is required for recurring subtasks';
      }
    } else {
      // Clear recurrenceInterval when not recurring
      if (formData.recurrenceInterval) {
        setFormData(prev => ({ ...prev, recurrenceInterval: 1 }));
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const formattedData = {
      ...formData,
      parentTaskId,
      projectId,
      ownerId,
      dueDate: formData.dueDate || undefined,
      assigneeId: formData.assigneeId || undefined,
      // Ensure boolean values are properly formatted
      isRecurring: Boolean(formData.isRecurring),
      recurrenceInterval: formData.isRecurring ? Number(formData.recurrenceInterval) : undefined,
    };

    onSubmit(formattedData);
  };

  return (
    <div className={styles.formCard}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3 className={styles.formTitle}>
          {initialData ? 'Edit Subtask' : 'Create New Subtask'}
        </h3>

        <div className={styles.formRow}>
          <Input
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="Enter subtask title"
            required
          />
        </div>

        <div className={styles.formRow}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Enter subtask description"
            rows={4}
          />
          {errors.description && (
            <span className={styles.error}>{errors.description}</span>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.halfWidth}>
            <label htmlFor="status" className={styles.label}>
              Status <span className={styles.required}>*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>

          <div className={styles.halfWidth}>
            <Input
              label="Priority"
              name="priority"
              type="number"
              min="1"
              max="10"
              value={formData.priority}
              onChange={handleChange}
              error={errors.priority}
              required
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <Input
            label="Due Date"
            name="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={handleChange}
          />
        </div>

        <div className={styles.recurringSection}>
          <div className={styles.formRow}>
            <div className={styles.halfWidth}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                Recurring Subtask
              </label>
            </div>
            {formData.isRecurring && (
              <div className={styles.halfWidth}>
                <Input
                  label="Recurrence Interval (days)"
                  name="recurrenceInterval"
                  type="number"
                  min="1"
                  value={formData.recurrenceInterval}
                  onChange={handleChange}
                  error={errors.recurrenceInterval}
                />
              </div>
            )}
          </div>
        </div>

        <div className={styles.formActions}>
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            {initialData ? 'Update Subtask' : 'Create Subtask'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubtaskForm;


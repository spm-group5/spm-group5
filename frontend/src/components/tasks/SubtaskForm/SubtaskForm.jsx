import { useState, useEffect } from 'react';
import Card from '../../common/Card/Card';
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
    priority: 'Medium',
    dueDate: '',
    assigneeId: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'To Do',
        priority: initialData.priority || 'Medium',
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        assigneeId: initialData.assigneeId?._id || initialData.assigneeId || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    };

    onSubmit(formattedData);
  };

  return (
    <Card className={styles.formCard}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3 className={styles.formTitle}>
          {initialData ? 'Edit Subtask' : 'Create New Subtask'}
        </h3>

        <div className={styles.formRow}>
          <Input
            label="Title *"
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
              Status *
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
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className={styles.halfWidth}>
            <label htmlFor="priority" className={styles.label}>
              Priority *
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
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
    </Card>
  );
};

export default SubtaskForm;


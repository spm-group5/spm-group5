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
  ownerId,
  parentTaskAssignees = [] // Array of parent task assignees
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
    tags: ''
  });

  const [errors, setErrors] = useState({});

  // State for managing assignees (similar to TaskForm)
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');

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
        tags: initialData.tags || ''
      });

      // Initialize selected assignees for edit mode
      if (initialData.assigneeId) {
        // Handle both array and single assignee
        const assignees = Array.isArray(initialData.assigneeId)
          ? initialData.assigneeId
          : [initialData.assigneeId];

        setSelectedAssignees(assignees.map(assignee => ({
          _id: assignee._id || assignee,
          username: assignee.username || assignee.name || assignee,
          email: assignee.email || assignee.username || assignee,
          role: assignee.role
        })));
      }
    } else {
      // In create mode, default to first parent task assignee
      if (parentTaskAssignees.length > 0 && selectedAssignees.length === 0) {
        const firstAssignee = parentTaskAssignees[0];
        setSelectedAssignees([{
          _id: firstAssignee._id,
          username: firstAssignee.username || firstAssignee.name,
          email: firstAssignee.email || firstAssignee.username,
          role: firstAssignee.role
        }]);
      }
    }
  }, [initialData, parentTaskAssignees]);

  // Handler to add an assignee
  const handleAddAssignee = () => {
    if (!selectedAssignee || selectedAssignee.trim() === '') {
      return;
    }

    // Check if already at max capacity (5 assignees for subtasks)
    if (selectedAssignees.length >= 5) {
      alert('Subtasks can have a maximum of 5 assignees');
      return;
    }

    // Find the assignee from parent task assignees
    const assigneeToAdd = parentTaskAssignees.find(a => String(a._id) === String(selectedAssignee));

    if (!assigneeToAdd) {
      alert('Could not find the selected user');
      return;
    }

    // Check if already assigned
    if (selectedAssignees.some(a => String(a._id) === String(assigneeToAdd._id))) {
      alert('This user is already assigned');
      return;
    }

    // Add to selected assignees
    setSelectedAssignees([...selectedAssignees, {
      _id: assigneeToAdd._id,
      username: assigneeToAdd.username || assigneeToAdd.name,
      email: assigneeToAdd.email || assigneeToAdd.username,
      role: assigneeToAdd.role
    }]);

    // Clear selection
    setSelectedAssignee('');
  };

  // Handler to remove an assignee
  const handleRemoveAssignee = (assigneeId) => {
    // Must have at least 1 assignee
    if (selectedAssignees.length <= 1) {
      alert('Subtask must have at least one assignee');
      return;
    }

    if (!window.confirm('Remove this assignee?')) {
      return;
    }

    setSelectedAssignees(selectedAssignees.filter(a => a._id !== assigneeId));
  };

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

    const priorityNum = Number(formData.priority);
    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
    } else if (!Number.isInteger(priorityNum)) {
      newErrors.priority = 'Priority must be a whole number';
    } else if (priorityNum < 1 || priorityNum > 10) {
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
      // Send all selected assignees as an array
      assigneeId: selectedAssignees.map(a => a._id),
      // Ensure boolean values are properly formatted
      isRecurring: Boolean(formData.isRecurring),
      recurrenceInterval: formData.isRecurring ? Number(formData.recurrenceInterval) : undefined,
      tags: formData.tags || ''
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
              step="1"
              value={formData.priority}
              onChange={handleChange}
              onKeyDown={(e) => {
                // Prevent decimal point, 'e', 'E', '+', '-' characters
                if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                  e.preventDefault();
                }
              }}
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
          
          <Input
            label="Tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="e.g., bug#urgent#frontend"
          />
        </div>

        {/* Manage Assignees Section */}
        <div className={styles.assigneesSection}>
          <h4 className={styles.assigneesTitle}>
            Assignees <span className={styles.required}>*</span> ({selectedAssignees.length}/5)
          </h4>

          {/* Current Assignees */}
          {selectedAssignees.length > 0 ? (
            <div className={styles.assigneesList}>
              {selectedAssignees.map((assignee) => (
                <div
                  key={assignee._id}
                  className={styles.assigneeItem}
                >
                  <span className={styles.assigneeInfo}>
                    {assignee.username || assignee.email}
                    {assignee.role && (
                      <span className={styles.assigneeLabel}>
                        ({assignee.role})
                      </span>
                    )}
                  </span>
                  {selectedAssignees.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="small"
                      onClick={() => handleRemoveAssignee(assignee._id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noAssignees}>No assignees selected</p>
          )}

          {/* Add Assignee Section */}
          {selectedAssignees.length < 5 && parentTaskAssignees.length > 0 && (
            <div className={styles.addAssigneeSection}>
              <h5 className={styles.addAssigneeTitle}>
                Assign to Task Member
              </h5>
              <div className={styles.addAssigneeRow}>
                <div className={styles.addAssigneeSelectWrapper}>
                  <label htmlFor="assignee-select" className={styles.addAssigneeLabel}>
                    Select from Parent Task Assignees:
                  </label>
                  <select
                    id="assignee-select"
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className={styles.addAssigneeSelect}
                  >
                    <option value="">-- Select assignee --</option>
                    {parentTaskAssignees
                      .filter(ea => !selectedAssignees.some(sa => sa._id === ea._id))
                      .map((assignee) => (
                        <option key={assignee._id} value={assignee._id}>
                          {assignee.username || assignee.name} ({assignee.role || 'staff'})
                        </option>
                      ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddAssignee}
                  disabled={!selectedAssignee}
                >
                  Assign
                </Button>
              </div>
            </div>
          )}

          {selectedAssignees.length >= 5 && (
            <p className={styles.maxAssigneesMessage}>
              Maximum of 5 assignees reached
            </p>
          )}

          {parentTaskAssignees.length === 0 && (
            <p className={styles.parentTaskWarning}>
              No assignees available. The parent task must have assignees first.
            </p>
          )}
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

